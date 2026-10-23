const crypto = require('crypto');
const express = require('express');
const requireSupabaseUser = require('../middleware/requireSupabaseUser');

const router = express.Router();
const ATTACHMENT_BUCKET = 'family-attachments';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECORD_COLUMNS =
  'id, family_id, record_kind, record_type, title, content, event_start, event_end, is_all_day, status, visibility, linked_plan_id, created_by, row_version, created_at, updated_at';
const ATTACHMENT_COLUMNS =
  'id, record_id, storage_bucket, storage_path, file_name, file_type, size_bytes, uploaded_by, created_at';
const CREATE_FIELDS = new Set([
  'record_kind',
  'record_type',
  'title',
  'content',
  'event_start',
  'event_end',
  'is_all_day',
  'visibility',
  'linked_plan_id',
]);
const COMMON_UPDATE_FIELDS = new Set([
  'title',
  'content',
  'event_start',
  'event_end',
  'is_all_day',
]);
const PRIVILEGED_UPDATE_FIELDS = new Set([
  'record_type',
  'visibility',
  'linked_plan_id',
]);

function apiFailure(res, status, message) {
  return res.status(status).json({
    success: false,
    data: null,
    message,
  });
}

function apiSuccess(res, status, data, message) {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
}

function sendSupabaseError(res, error, actionMessage) {
  console.error(actionMessage, {
    code: error.code || null,
    status: error.status || null,
  });

  if (error.status === 401) {
    return apiFailure(res, 401, 'Your sign-in session is invalid or expired.');
  }

  if (error.code === '42501' || error.status === 403) {
    return apiFailure(res, 403, 'You do not have permission to perform this action.');
  }

  if (['22P02', '23503', '23514', '23505'].includes(error.code)) {
    return apiFailure(res, 400, 'The record conflicts with the database rules.');
  }

  return apiFailure(res, 502, 'The records service could not complete the request.');
}

async function getActiveMembership(req) {
  const { data, error } = await req.supabase
    .from('family_members')
    .select('family_id, role, status')
    .eq('profile_id', req.user.id)
    .eq('status', 'active')
    .not('role', 'is', null)
    .maybeSingle();

  if (error) {
    return { error };
  }

  if (!data) {
    return { membership: null };
  }

  return { membership: data };
}

async function requireActiveMembership(req, res) {
  const result = await getActiveMembership(req);
  if (result.error) {
    sendSupabaseError(res, result.error, 'Could not load active family membership:');
    return null;
  }

  if (!result.membership) {
    apiFailure(res, 403, 'An active family membership is required.');
    return null;
  }

  return result.membership;
}

function canEditRecord(record, user, membership) {
  if (record.visibility === 'private') {
    return record.created_by === user.id;
  }

  if (['admin', 'master'].includes(membership.role)) {
    return true;
  }

  return membership.role === 'worker'
    && record.created_by === user.id
    && record.record_kind === 'experience'
    && ['diary', 'photo'].includes(record.record_type);
}

function parseText(value, fieldName) {
  if (value === null || value === '') {
    return { value: null };
  }
  if (typeof value !== 'string') {
    return { error: `${fieldName} must be text.` };
  }
  return { value };
}

function parseTimestamp(value, fieldName, nullable) {
  if (nullable && (value === null || value === '')) {
    return { value: null };
  }
  if (typeof value !== 'string' || !value.trim()) {
    return { error: `${fieldName} is required.` };
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return { error: `${fieldName} must be a valid date and time.` };
  }

  return { value: timestamp.toISOString() };
}

function normalizeTextFields(source, target, fields) {
  for (const field of fields) {
    if (!Object.hasOwn(source, field)) {
      continue;
    }

    const parsed = parseText(source[field], field);
    if (parsed.error) {
      return parsed.error;
    }
    target[field] = parsed.value;
  }
  return null;
}

function validateRecord(record) {
  if (!['plan', 'experience'].includes(record.record_kind)) {
    return 'record_kind must be plan or experience.';
  }

  const types = record.record_kind === 'plan'
    ? ['schedule']
    : ['diary', 'photo', 'receipt', 'notice'];
  if (!types.includes(record.record_type)) {
    return 'record_type is not valid for this record_kind.';
  }

  if (!['family', 'private'].includes(record.visibility)) {
    return 'visibility must be family or private.';
  }

  if (!UUID_PATTERN.test(record.linked_plan_id || '') && record.linked_plan_id !== null) {
    return 'linked_plan_id must be a valid plan ID.';
  }
  if (record.record_kind === 'plan' && record.linked_plan_id !== null) {
    return 'Plan records cannot link to another plan.';
  }

  const start = new Date(record.event_start);
  if (Number.isNaN(start.getTime())) {
    return 'event_start must be a valid date and time.';
  }

  if (record.event_end !== null) {
    const end = new Date(record.event_end);
    if (Number.isNaN(end.getTime()) || end < start) {
      return 'event_end must be a valid date and time no earlier than event_start.';
    }
  }

  if (typeof record.is_all_day !== 'boolean') {
    return 'is_all_day must be true or false.';
  }

  return null;
}

function validateCreateBody(body, membership, allowParticipants = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A record object is required.' };
  }
  if (Object.keys(body).some((field) => (
    !CREATE_FIELDS.has(field)
    && !(allowParticipants && field === 'participant_names')
  ))) {
    return { error: 'The request contains unsupported record fields.' };
  }

  if (!['admin', 'master', 'worker'].includes(membership.role)) {
    return { forbidden: true };
  }

  const participantNames = allowParticipants
    ? body.participant_names ?? []
    : [];
  if (!allowParticipants && Object.hasOwn(body, 'participant_names')) {
    return { error: 'The request contains unsupported record fields.' };
  }
  if (
    !Array.isArray(participantNames)
    || participantNames.length > 10
    || participantNames.some((name) => (
      typeof name !== 'string' || !name.trim() || name.length > 100
    ))
    || new Set(participantNames.map((name) => name.trim().toLocaleLowerCase('en'))).size
      !== participantNames.length
  ) {
    return { error: 'participant_names must contain unique, non-empty member names.' };
  }
  if (
    participantNames.length
    && !['admin', 'master'].includes(membership.role)
  ) {
    return { forbidden: true };
  }

  const record = {
    record_kind: body.record_kind,
    record_type: body.record_type,
    title: body.title ?? null,
    content: body.content ?? null,
    event_start: body.event_start,
    event_end: body.event_end ?? null,
    is_all_day: body.is_all_day,
    visibility: body.visibility,
    linked_plan_id: body.linked_plan_id ?? null,
  };
  const textError = normalizeTextFields(body, record, ['title', 'content']);
  if (textError) {
    return { error: textError };
  }

  const start = parseTimestamp(record.event_start, 'event_start', false);
  if (start.error) {
    return { error: start.error };
  }
  record.event_start = start.value;

  const end = parseTimestamp(record.event_end, 'event_end', true);
  if (end.error) {
    return { error: end.error };
  }
  record.event_end = end.value;

  const validationError = validateRecord(record);
  if (validationError) {
    return { error: validationError };
  }

  if (
    membership.role === 'worker'
    && (
      record.record_kind !== 'experience'
      || !['diary', 'photo'].includes(record.record_type)
    )
  ) {
    return { forbidden: true };
  }

  return {
    record,
    participantNames: participantNames.map((name) => name.trim()),
  };
}

function validateUpdateBody(body, existing, membership) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A record update object is required.' };
  }
  const allowedFields = new Set(COMMON_UPDATE_FIELDS);
  if (['admin', 'master'].includes(membership.role)) {
    for (const field of PRIVILEGED_UPDATE_FIELDS) {
      allowedFields.add(field);
    }
  }

  const fields = Object.keys(body);
  if (!fields.length || fields.some((field) => !allowedFields.has(field))) {
    return { error: 'The request contains unsupported or non-editable record fields.' };
  }

  const patch = {};
  const textError = normalizeTextFields(body, patch, ['title', 'content']);
  if (textError) {
    return { error: textError };
  }

  for (const field of ['event_start', 'event_end']) {
    if (Object.hasOwn(body, field)) {
      const parsed = parseTimestamp(body[field], field, field === 'event_end');
      if (parsed.error) {
        return { error: parsed.error };
      }
      patch[field] = parsed.value;
    }
  }

  if (Object.hasOwn(body, 'is_all_day')) {
    if (typeof body.is_all_day !== 'boolean') {
      return { error: 'is_all_day must be true or false.' };
    }
    patch.is_all_day = body.is_all_day;
  }

  for (const field of ['record_type', 'visibility', 'linked_plan_id']) {
    if (Object.hasOwn(body, field)) {
      patch[field] = body[field];
    }
  }

  const merged = {
    ...existing,
    ...patch,
  };
  const validationError = validateRecord(merged);
  if (validationError) {
    return { error: validationError };
  }

  return { patch };
}

async function loadRecord(req, res, membership, recordId) {
  if (!UUID_PATTERN.test(recordId || '')) {
    apiFailure(res, 400, 'A valid record ID is required.');
    return null;
  }

  const { data, error } = await req.supabase
    .from('records')
    .select(RECORD_COLUMNS)
    .eq('id', recordId)
    .eq('family_id', membership.family_id)
    .maybeSingle();

  if (error) {
    sendSupabaseError(res, error, 'Could not load record:');
    return null;
  }
  if (!data) {
    apiFailure(res, 404, 'Record not found.');
    return null;
  }

  return data;
}

async function canAccessLinkedPlan(req, membership, linkedPlanId) {
  const { data, error } = await req.supabase
    .from('records')
    .select('id')
    .eq('id', linkedPlanId)
    .eq('family_id', membership.family_id)
    .eq('record_kind', 'plan')
    .maybeSingle();

  return {
    error,
    accessible: Boolean(data),
  };
}

router.use('/api/records', requireSupabaseUser);

router.get('/api/records', async (req, res) => {
  try {
    const membership = await requireActiveMembership(req, res);
    if (!membership) {
      return;
    }

    const { data: records, error: recordsError } = await req.supabase
      .from('records')
      .select(RECORD_COLUMNS)
      .eq('family_id', membership.family_id)
      .order('event_start', { ascending: false });

    if (recordsError) {
      return sendSupabaseError(res, recordsError, 'Could not load records:');
    }

    const recordIds = records.map((record) => record.id);
    let attachments = [];
    if (recordIds.length) {
      const { data, error } = await req.supabase
        .from('attachments')
        .select(ATTACHMENT_COLUMNS)
        .in('record_id', recordIds);

      if (error) {
        return sendSupabaseError(res, error, 'Could not load record attachments:');
      }
      attachments = data;
    }

    const attachmentsByRecordId = new Map();
    for (const attachment of attachments) {
      const current = attachmentsByRecordId.get(attachment.record_id) || [];
      current.push(attachment);
      attachmentsByRecordId.set(attachment.record_id, current);
    }

    const data = records.map((record) => ({
      ...record,
      attachments: attachmentsByRecordId.get(record.id) || [],
    }));
    return apiSuccess(res, 200, data, 'Records loaded successfully.');
  } catch (error) {
    console.error('Failed to load records:', error);
    return apiFailure(res, 500, 'Could not load records.');
  }
});

router.post('/api/records/batch', async (req, res) => {
  try {
    const membership = await requireActiveMembership(req, res);
    if (!membership) {
      return;
    }
    if (!['admin', 'master'].includes(membership.role)) {
      return apiFailure(res, 403, 'Only a family Master or Admin can import schedules.');
    }
    if (
      !req.body
      || typeof req.body !== 'object'
      || Array.isArray(req.body)
      || Object.keys(req.body).some((field) => field !== 'records')
      || !Array.isArray(req.body.records)
      || req.body.records.length < 1
      || req.body.records.length > 100
    ) {
      return apiFailure(res, 400, 'A batch of one to 100 records is required.');
    }

    const validatedRecords = [];
    for (const body of req.body.records) {
      const validated = validateCreateBody(body, membership, true);
      if (validated.error) {
        return apiFailure(res, 400, validated.error);
      }
      if (validated.forbidden) {
        return apiFailure(res, 403, 'Your role cannot create this type of record.');
      }
      if (validated.record.record_kind !== 'plan') {
        return apiFailure(res, 400, 'Schedule batches can only contain plan records.');
      }
      if (validated.participantNames.length !== 1) {
        return apiFailure(res, 400, 'Each schedule record must have exactly one participant.');
      }
      validatedRecords.push(validated);
    }

    const requestedNames = Array.from(new Set(
      validatedRecords.flatMap((item) => item.participantNames),
    ));
    const { data: members, error: membersError } = await req.supabase
      .from('family_members')
      .select('id, display_name')
      .eq('family_id', membership.family_id)
      .eq('status', 'active');
    if (membersError) {
      return sendSupabaseError(res, membersError, 'Could not verify schedule participants:');
    }

    const membersByName = new Map();
    for (const member of members) {
      const key = member.display_name.trim().toLocaleLowerCase('en');
      const matches = membersByName.get(key) || [];
      matches.push(member);
      membersByName.set(key, matches);
    }

    const memberIdByName = new Map();
    for (const name of requestedNames) {
      const key = name.toLocaleLowerCase('en');
      const matches = membersByName.get(key) || [];
      if (matches.length !== 1) {
        return apiFailure(
          res,
          400,
          'Every participant must match exactly one active family member.',
        );
      }
      memberIdByName.set(key, matches[0].id);
    }

    const payload = validatedRecords.map(({ record, participantNames }) => ({
      ...record,
      family_id: membership.family_id,
      created_by: req.user.id,
      record_participants: participantNames.map((name) => ({
        member_id: memberIdByName.get(name.toLocaleLowerCase('en')),
        added_by: req.user.id,
      })),
    }));
    const { data, error } = await req.supabase
      .from('records')
      .insert(payload)
      .select(`${RECORD_COLUMNS}, record_participants(record_id, member_id)`);
    if (error) {
      return sendSupabaseError(res, error, 'Could not import schedule records:');
    }
    if (data.length !== payload.length) {
      console.error('Schedule batch insert returned an unexpected record count.', {
        expectedCount: payload.length,
        returnedCount: data.length,
      });
      return apiFailure(res, 502, 'The schedule import could not be verified.');
    }
    return apiSuccess(res, 201, data, 'Schedule records imported successfully.');
  } catch (error) {
    console.error('Failed to import schedule records:', error);
    return apiFailure(res, 500, 'Could not import schedule records.');
  }
});

router.post('/api/records', async (req, res) => {
  try {
    console.info('[DEBUG] Record insert request received.', {
      authenticatedUserId: req.user.id,
    });

    const membership = await requireActiveMembership(req, res);
    if (!membership) {
      return;
    }

    const validated = validateCreateBody(req.body, membership);
    if (validated.error) {
      return apiFailure(res, 400, validated.error);
    }
    if (validated.forbidden) {
      return apiFailure(res, 403, 'Your role cannot create this type of record.');
    }

    if (validated.record.linked_plan_id) {
      const linkCheck = await canAccessLinkedPlan(
        req,
        membership,
        validated.record.linked_plan_id,
      );
      if (linkCheck.error) {
        return sendSupabaseError(res, linkCheck.error, 'Could not verify linked plan:');
      }
      if (!linkCheck.accessible) {
        return apiFailure(res, 400, 'linked_plan_id must refer to a plan you can access.');
      }
    }

    // TODO: Private diary encryption is undecided; do not treat plaintext storage as an approved security design.
    const payload = {
      ...validated.record,
      family_id: membership.family_id,
      created_by: req.user.id,
    };
    console.info('[DEBUG] Record insert payload metadata.', {
      authenticatedUserId: req.user.id,
      membershipFamilyId: membership.family_id,
      payloadFamilyId: payload.family_id,
      payloadCreatedBy: payload.created_by,
      createdByMatchesAuthenticatedUser: payload.created_by === req.user.id,
      membershipRole: membership.role,
      recordKind: payload.record_kind,
      recordType: payload.record_type,
    });

    const { data, error } = await req.supabase
      .from('records')
      .insert(payload)
      .select(RECORD_COLUMNS)
      .single();

    if (error) {
      console.error('[DEBUG] Record insert rejected by Supabase.', {
        code: error.code || null,
        status: error.status || null,
      });
      return sendSupabaseError(res, error, 'Could not create record:');
    }
    console.info('[DEBUG] Record insert succeeded.', {
      recordId: data.id,
      familyId: data.family_id,
      createdBy: data.created_by,
      createdByMatchesAuthenticatedUser: data.created_by === req.user.id,
    });
    return apiSuccess(res, 201, data, 'Record created successfully.');
  } catch (error) {
    console.error('Failed to create record:', error);
    return apiFailure(res, 500, 'Could not create the record.');
  }
});

router.patch('/api/records/:recordId', async (req, res) => {
  try {
    const membership = await requireActiveMembership(req, res);
    if (!membership) {
      return;
    }

    const existing = await loadRecord(req, res, membership, req.params.recordId);
    if (!existing) {
      return;
    }
    if (!canEditRecord(existing, req.user, membership)) {
      return apiFailure(res, 403, 'You do not have permission to edit this record.');
    }

    const validated = validateUpdateBody(req.body, existing, membership);
    if (validated.error) {
      return apiFailure(res, 400, validated.error);
    }

    if (validated.patch.linked_plan_id) {
      const linkCheck = await canAccessLinkedPlan(
        req,
        membership,
        validated.patch.linked_plan_id,
      );
      if (linkCheck.error) {
        return sendSupabaseError(res, linkCheck.error, 'Could not verify linked plan:');
      }
      if (!linkCheck.accessible) {
        return apiFailure(res, 400, 'linked_plan_id must refer to a plan you can access.');
      }
    }

    const { data, error } = await req.supabase
      .from('records')
      .update(validated.patch)
      .eq('id', existing.id)
      .eq('family_id', membership.family_id)
      .select(RECORD_COLUMNS)
      .maybeSingle();

    if (error) {
      return sendSupabaseError(res, error, 'Could not update record:');
    }
    if (!data) {
      return apiFailure(res, 403, 'You do not have permission to edit this record.');
    }
    return apiSuccess(res, 200, data, 'Record updated successfully.');
  } catch (error) {
    console.error('Failed to update record:', error);
    return apiFailure(res, 500, 'Could not update the record.');
  }
});

router.delete('/api/records/:recordId', async (req, res) => {
  try {
    const membership = await requireActiveMembership(req, res);
    if (!membership) {
      return;
    }

    const existing = await loadRecord(req, res, membership, req.params.recordId);
    if (!existing) {
      return;
    }
    if (!canEditRecord(existing, req.user, membership)) {
      return apiFailure(res, 403, 'You do not have permission to delete this record.');
    }

    const { data: attachments, error: attachmentError } = await req.supabase
      .from('attachments')
      .select('id, storage_bucket, storage_path')
      .eq('record_id', existing.id);

    if (attachmentError) {
      return sendSupabaseError(res, attachmentError, 'Could not load record attachments:');
    }

    if (attachments.length) {
      const objectPaths = attachments
        .filter((attachment) => attachment.storage_bucket === ATTACHMENT_BUCKET)
        .map((attachment) => attachment.storage_path);
      const { error: storageError } = await req.supabase
        .storage
        .from(ATTACHMENT_BUCKET)
        .remove(objectPaths);

      if (storageError) {
        return sendSupabaseError(res, storageError, 'Could not remove record attachments:');
      }
    }

    const { data, error } = await req.supabase
      .from('records')
      .delete()
      .eq('id', existing.id)
      .eq('family_id', membership.family_id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error(
        'Record deletion failed after its private storage objects were removed:',
        error,
      );
      return sendSupabaseError(res, error, 'Could not delete record:');
    }
    if (!data) {
      return apiFailure(
        res,
        403,
        'The record could not be deleted. Its attached files may already have been removed.',
      );
    }
    return apiSuccess(res, 200, data, 'Record deleted successfully.');
  } catch (error) {
    console.error('Failed to delete record:', error);
    return apiFailure(res, 500, 'Could not delete the record.');
  }
});

router.post(
  '/api/records/:recordId/attachments',
  express.raw({ type: 'application/octet-stream', limit: '10mb' }),
  async (req, res) => {
    try {
      const membership = await requireActiveMembership(req, res);
      if (!membership) {
        return;
      }

      const record = await loadRecord(req, res, membership, req.params.recordId);
      if (!record) {
        return;
      }
      if (!canEditRecord(record, req.user, membership)) {
        return apiFailure(res, 403, 'You do not have permission to attach files to this record.');
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return apiFailure(res, 400, 'A non-empty attachment file is required.');
      }

      let fileName;
      try {
        fileName = decodeURIComponent(req.get('x-file-name') || '');
      } catch (error) {
        return apiFailure(res, 400, 'The attachment file name is invalid.');
      }
      if (
        !fileName
        || fileName.length > 255
        || /[\u0000-\u001f\u007f/\\]/.test(fileName)
      ) {
        return apiFailure(res, 400, 'A valid attachment file name is required.');
      }

      const fileType = req.get('x-file-type') || 'application/octet-stream';
      if (!/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(fileType)) {
        return apiFailure(res, 400, 'The attachment file type is invalid.');
      }

      const extensionMatch = fileName.match(/\.([A-Za-z0-9]{1,10})$/);
      const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : '.bin';
      const storagePath =
        `${record.family_id}/${record.id}/${crypto.randomUUID()}${extension}`;
      const { error: uploadError } = await req.supabase
        .storage
        .from(ATTACHMENT_BUCKET)
        .upload(storagePath, req.body, {
          contentType: fileType,
          upsert: false,
        });

      if (uploadError) {
        return sendSupabaseError(res, uploadError, 'Could not upload record attachment:');
      }

      const { data, error } = await req.supabase
        .from('attachments')
        .insert({
          record_id: record.id,
          storage_bucket: ATTACHMENT_BUCKET,
          storage_path: storagePath,
          file_name: fileName,
          file_type: fileType,
          size_bytes: req.body.length,
          uploaded_by: req.user.id,
        })
        .select(ATTACHMENT_COLUMNS)
        .single();

      if (error) {
        const { error: cleanupError } = await req.supabase
          .storage
          .from(ATTACHMENT_BUCKET)
          .remove([storagePath]);
        if (cleanupError) {
          console.error('Could not clean up an uploaded object without metadata:', cleanupError);
          return apiFailure(
            res,
            502,
            'The file uploaded but could not be linked or removed. Contact an administrator.',
          );
        }
        return sendSupabaseError(res, error, 'Could not save attachment metadata:');
      }

      return apiSuccess(res, 201, data, 'Attachment uploaded successfully.');
    } catch (error) {
      console.error('Failed to upload record attachment:', error);
      return apiFailure(res, 500, 'Could not upload the attachment.');
    }
  },
);

module.exports = router;
