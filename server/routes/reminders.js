const express = require('express');
const requireSupabaseUser = require('../middleware/requireSupabaseUser');

const router = express.Router();
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REMINDER_COLUMNS =
  'id, family_id, created_by, title, due_at, is_done, source_memory_id, created_at';
const MAX_TITLE_LENGTH = 500;

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

function sendSupabaseError(res, error, action) {
  console.error(action, {
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
    return apiFailure(res, 400, 'The reminder conflicts with the database rules.');
  }
  return apiFailure(res, 502, 'The reminders service could not complete the request.');
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
  return data ? { membership: data } : { membership: null };
}

function parseDueAt(value) {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    return { error: 'The reminder due date must be a valid timestamp.' };
  }
  return { value: new Date(value).toISOString() };
}

function parseReminderBody(body, action) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A reminder request body is required.' };
  }

  if (action === 'save') {
    const { title, dueAt, sourceMemoryId } = body;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > MAX_TITLE_LENGTH) {
      return { error: `Enter a reminder title of no more than ${MAX_TITLE_LENGTH} characters.` };
    }

    const parsedDueAt = parseDueAt(dueAt);
    if (parsedDueAt.error) {
      return parsedDueAt;
    }
    if (sourceMemoryId !== undefined && sourceMemoryId !== null && sourceMemoryId !== ''
      && (typeof sourceMemoryId !== 'string' || !UUID_PATTERN.test(sourceMemoryId))) {
      return { error: 'The source memory ID is invalid.' };
    }

    return {
      value: {
        title: title.trim(),
        dueAt: parsedDueAt.value,
        sourceMemoryId: sourceMemoryId || null,
      },
    };
  }

  if (action === 'toggle') {
    const { id, isDone } = body;
    if (typeof id !== 'string' || !UUID_PATTERN.test(id) || typeof isDone !== 'boolean') {
      return { error: 'A valid reminder ID and completion state are required.' };
    }
    return { value: { id, isDone } };
  }

  return { error: 'The reminder request is invalid.' };
}

router.get('/api/reminders/list', requireSupabaseUser, async (req, res) => {
  try {
    const membershipResult = await getActiveMembership(req);
    if (membershipResult.error) {
      return sendSupabaseError(res, membershipResult.error, 'Could not load reminder membership:');
    }
    if (!membershipResult.membership) {
      return apiFailure(res, 403, 'An active family membership is required.');
    }

    const { data, error } = await req.supabase
      .from('reminders')
      .select(REMINDER_COLUMNS)
      .eq('family_id', membershipResult.membership.family_id)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) {
      return sendSupabaseError(res, error, 'Could not load family reminders:');
    }
    return apiSuccess(res, 200, data, 'Family reminders loaded.');
  } catch (error) {
    console.error('Reminder list request failed:', error);
    return apiFailure(res, 500, 'Could not load family reminders.');
  }
});

router.post('/api/reminders/save', requireSupabaseUser, async (req, res) => {
  try {
    const parsedBody = parseReminderBody(req.body, 'save');
    if (parsedBody.error) {
      return apiFailure(res, 400, parsedBody.error);
    }

    const membershipResult = await getActiveMembership(req);
    if (membershipResult.error) {
      return sendSupabaseError(res, membershipResult.error, 'Could not load reminder membership:');
    }
    if (!membershipResult.membership) {
      return apiFailure(res, 403, 'An active family membership is required.');
    }

    const { data, error } = await req.supabase
      .from('reminders')
      .insert({
        family_id: membershipResult.membership.family_id,
        created_by: req.user.id,
        title: parsedBody.value.title,
        due_at: parsedBody.value.dueAt,
        source_memory_id: parsedBody.value.sourceMemoryId,
      })
      .select(REMINDER_COLUMNS)
      .single();
    if (error) {
      return sendSupabaseError(res, error, 'Could not save family reminder:');
    }
    return apiSuccess(res, 201, data, 'Family reminder saved.');
  } catch (error) {
    console.error('Reminder save request failed:', error);
    return apiFailure(res, 500, 'Could not save family reminder.');
  }
});

router.post('/api/reminders/toggle', requireSupabaseUser, async (req, res) => {
  try {
    const parsedBody = parseReminderBody(req.body, 'toggle');
    if (parsedBody.error) {
      return apiFailure(res, 400, parsedBody.error);
    }

    const membershipResult = await getActiveMembership(req);
    if (membershipResult.error) {
      return sendSupabaseError(res, membershipResult.error, 'Could not load reminder membership:');
    }
    if (!membershipResult.membership) {
      return apiFailure(res, 403, 'An active family membership is required.');
    }

    const { data, error } = await req.supabase
      .from('reminders')
      .update({ is_done: parsedBody.value.isDone })
      .eq('id', parsedBody.value.id)
      .eq('family_id', membershipResult.membership.family_id)
      .select(REMINDER_COLUMNS)
      .maybeSingle();
    if (error) {
      return sendSupabaseError(res, error, 'Could not update family reminder:');
    }
    if (!data) {
      return apiFailure(res, 404, 'The reminder was not found.');
    }
    return apiSuccess(res, 200, data, 'Family reminder updated.');
  } catch (error) {
    console.error('Reminder toggle request failed:', error);
    return apiFailure(res, 500, 'Could not update family reminder.');
  }
});

module.exports = router;
