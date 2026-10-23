require('dotenv').config();

const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const FAMILY_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_FAMILY_ID = '44444444-4444-4444-8444-444444444444';

const users = {
  master: {
    id: '33333333-3333-4333-8333-333333333301',
    email: 'rls.master@family-calendar.test',
    displayName: 'RLS Test Master',
    role: 'master',
  },
  spouse: {
    id: '33333333-3333-4333-8333-333333333302',
    email: 'rls.spouse@family-calendar.test',
    displayName: 'RLS Test Spouse',
    role: 'master',
  },
  worker: {
    id: '33333333-3333-4333-8333-333333333303',
    email: 'rls.worker@family-calendar.test',
    displayName: 'RLS Test Worker',
    role: 'worker',
  },
  disabled: {
    id: '33333333-3333-4333-8333-333333333304',
    email: 'rls.disabled@family-calendar.test',
    displayName: 'RLS Test Disabled',
    role: 'worker',
  },
  outsider: {
    id: '44444444-4444-4444-8444-444444444401',
    email: 'rls.outsider@family-calendar.test',
    displayName: 'RLS Test Outsider',
    role: 'master',
  },
  admin: {
    id: '33333333-3333-4333-8333-333333333305',
    email: 'rls.admin@family-calendar.test',
    displayName: 'RLS Test Admin',
    role: 'admin',
  },
  guest: {
    id: '33333333-3333-4333-8333-333333333306',
    email: 'rls.guest@family-calendar.test',
    displayName: 'RLS Test Guest',
    role: 'guest',
  },
};

const memberIds = {
  master: '33333333-3333-4333-8333-333333333311',
  spouse: '33333333-3333-4333-8333-333333333312',
  worker: '33333333-3333-4333-8333-333333333313',
  disabled: '33333333-3333-4333-8333-333333333314',
  outsider: '44444444-4444-4444-8444-444444444411',
  admin: '33333333-3333-4333-8333-333333333315',
  guest: '33333333-3333-4333-8333-333333333316',
};

const workerDiaryId = '55555555-5555-4555-8555-555555555510';
const workerChangeRequestId = '66666666-6666-4666-8666-666666666610';
const successfulChangeRequestId = '66666666-6666-4666-8666-666666666611';

const recordIds = {
  disabledPrivate: '55555555-5555-4555-8555-555555555501',
  ownerPrivate: '55555555-5555-4555-8555-555555555502',
  ungrantedPlan: '55555555-5555-4555-8555-555555555503',
  grantedPlan: '55555555-5555-4555-8555-555555555504',
  immutablePlan: '55555555-5555-4555-8555-555555555505',
  outsiderPlan: '55555555-5555-4555-8555-555555555506',
  privateApprovalPlan: '55555555-5555-4555-8555-555555555507',
  experienceApprovalPlan: '55555555-5555-4555-8555-555555555508',
  existingExperience: '55555555-5555-4555-8555-555555555509',
};

const requestIds = {
  privateApproval: '66666666-6666-4666-8666-666666666601',
  outsiderApproval: '66666666-6666-4666-8666-666666666602',
  experienceApproval: '66666666-6666-4666-8666-666666666603',
  guestRequest: '66666666-6666-4666-8666-666666666604',
};

let assertionCount = 0;

function getEnvironment() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RLS_TEST_PASSWORD',
    'RLS_TEST_PROJECT_CONFIRM',
  ];
  const missing = required.filter(
    (name) => !process.env[name] || process.env[name].trim() === '',
  );

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('The anon key and service-role key must be different.');
  }

  if (
    process.env.RLS_TEST_PROJECT_CONFIRM
    !== 'I_AM_USING_A_DISPOSABLE_TEST_PROJECT'
  ) {
    throw new Error(
      'Set RLS_TEST_PROJECT_CONFIRM=I_AM_USING_A_DISPOSABLE_TEST_PROJECT only for a disposable test project.',
    );
  }
}

function unwrap(result, operation) {
  if (result.error) {
    throw new Error(`${operation} failed: ${result.error.message}`);
  }

  return result.data;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function recordFixture(id, familyId, creatorId, kind, type, visibility, title) {
  return {
    id,
    family_id: familyId,
    created_by: creatorId,
    record_kind: kind,
    record_type: type,
    title,
    content: 'Fictional RLS test fixture',
    event_start: '2030-01-02T10:00:00.000Z',
    event_end: '2030-01-02T11:00:00.000Z',
    is_all_day: false,
    status: 'active',
    visibility,
    linked_plan_id: null,
  };
}

async function findUserByEmail(service, email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const data = unwrap(
      await service.auth.admin.listUsers({ page, perPage }),
      'Listing Auth users',
    );
    const existing = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (existing) {
      return existing;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function ensureUser(service, fixture, password) {
  const existing = await findUserByEmail(service, fixture.email);
  const result = existing
    ? await service.auth.admin.updateUserById(existing.id, {
        email_confirm: true,
        password,
        user_metadata: { full_name: fixture.displayName },
      })
    : await service.auth.admin.createUser({
        email: fixture.email,
        email_confirm: true,
        password,
        user_metadata: { full_name: fixture.displayName },
      });
  const data = unwrap(result, `Preparing fictional account ${fixture.email}`);

  if (!data.user?.id) {
    throw new Error(`No Auth user was returned for ${fixture.email}.`);
  }

  return { ...fixture, id: data.user.id };
}

async function authenticateAccount(account) {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  unwrap(
    await client.auth.signInWithPassword({
      email: account.email,
      password: process.env.RLS_TEST_PASSWORD,
    }),
    `Signing in fictional account ${account.email}`,
  );

  return client;
}

async function prepareFixtures(service) {
  unwrap(
    await service.from('families').upsert(
      [
        {
          id: FAMILY_ID,
          name: 'RLS Test Family',
          timezone: 'Asia/Hong_Kong',
        },
        {
          id: OTHER_FAMILY_ID,
          name: 'RLS Other Test Family',
          timezone: 'Asia/Hong_Kong',
        },
      ],
      { onConflict: 'id' },
    ),
    'Preparing RLS test families',
  );

  const accounts = {};
  for (const [key, fixture] of Object.entries(users)) {
    accounts[key] = await ensureUser(
      service,
      fixture,
      process.env.RLS_TEST_PASSWORD,
    );
  }

  unwrap(
    await service.from('profiles').upsert(
      Object.values(accounts).map((account) => ({
        id: account.id,
        display_name: account.displayName,
        locale: account.role === 'worker' ? 'en' : 'zh',
      })),
      { onConflict: 'id' },
    ),
    'Preparing RLS test profiles',
  );

  const familyMembers = Object.entries(accounts).map(([key, account]) => ({
    id: memberIds[key],
    family_id: key === 'outsider' ? OTHER_FAMILY_ID : FAMILY_ID,
    profile_id: account.id,
    display_name: account.displayName,
    requested_role: account.role === 'admin' ? 'master' : account.role,
    role: account.role,
    status: key === 'disabled' ? 'disabled' : 'active',
  }));
  unwrap(
    await service.from('family_members').upsert(familyMembers, {
      onConflict: 'id',
    }),
    'Preparing RLS test memberships',
  );

  const records = [
    recordFixture(
      recordIds.disabledPrivate,
      FAMILY_ID,
      accounts.disabled.id,
      'experience',
      'diary',
      'private',
      'Disabled account private diary',
    ),
    recordFixture(
      recordIds.ownerPrivate,
      FAMILY_ID,
      accounts.master.id,
      'experience',
      'diary',
      'private',
      'Master private diary',
    ),
    recordFixture(
      recordIds.ungrantedPlan,
      FAMILY_ID,
      accounts.master.id,
      'plan',
      'schedule',
      'family',
      'Unshared test plan',
    ),
    recordFixture(
      recordIds.grantedPlan,
      FAMILY_ID,
      accounts.master.id,
      'plan',
      'schedule',
      'family',
      'Shared test plan',
    ),
    recordFixture(
      recordIds.immutablePlan,
      FAMILY_ID,
      accounts.master.id,
      'plan',
      'schedule',
      'family',
      'Immutable test plan',
    ),
    recordFixture(
      recordIds.outsiderPlan,
      OTHER_FAMILY_ID,
      accounts.outsider.id,
      'plan',
      'schedule',
      'family',
      'Other family test plan',
    ),
    recordFixture(
      recordIds.privateApprovalPlan,
      FAMILY_ID,
      accounts.master.id,
      'plan',
      'schedule',
      'family',
      'Private approval test plan',
    ),
    recordFixture(
      recordIds.experienceApprovalPlan,
      FAMILY_ID,
      accounts.master.id,
      'plan',
      'schedule',
      'family',
      'Non-plan approval test target',
    ),
    recordFixture(
      recordIds.existingExperience,
      FAMILY_ID,
      accounts.master.id,
      'experience',
      'diary',
      'family',
      'Existing experience test target',
    ),
  ];
  unwrap(
    await service.from('records').upsert(records, { onConflict: 'id' }),
    'Preparing RLS test records',
  );
  unwrap(
    await service.from('records').delete().eq('id', workerDiaryId),
    'Resetting fictional worker diary fixture',
  );
  unwrap(
    await service
      .from('schedule_change_requests')
      .delete()
      .in('id', [
        workerChangeRequestId,
        successfulChangeRequestId,
        requestIds.guestRequest,
      ]),
    'Resetting fictional worker request fixture',
  );

  const versions = unwrap(
    await service
      .from('records')
      .select('id, row_version')
      .in('id', [
        recordIds.privateApprovalPlan,
        recordIds.outsiderPlan,
        recordIds.ungrantedPlan,
        recordIds.grantedPlan,
        recordIds.experienceApprovalPlan,
      ]),
    'Reading fixture record versions',
  );
  const versionById = Object.fromEntries(
    versions.map((record) => [record.id, record.row_version]),
  );

  unwrap(
    await service.from('record_audience').upsert(
      [
        {
          record_id: recordIds.grantedPlan,
          member_id: memberIds.worker,
          granted_by: accounts.master.id,
        },
        {
          record_id: recordIds.grantedPlan,
          member_id: memberIds.guest,
          granted_by: accounts.master.id,
        },
      ],
      { onConflict: 'record_id,member_id' },
    ),
    'Granting access to the fictional shared plan',
  );

  const approvalRequests = [
    {
      id: requestIds.privateApproval,
      family_id: FAMILY_ID,
      record_id: recordIds.privateApprovalPlan,
      record_version: versionById[recordIds.privateApprovalPlan],
      requested_changes: { title: 'Approved private fixture' },
      requested_by: accounts.worker.id,
      status: 'pending',
    },
    {
      id: requestIds.outsiderApproval,
      family_id: OTHER_FAMILY_ID,
      record_id: recordIds.outsiderPlan,
      record_version: versionById[recordIds.outsiderPlan],
      requested_changes: { title: 'Other family fixture' },
      requested_by: accounts.outsider.id,
      status: 'pending',
    },
    {
      id: requestIds.experienceApproval,
      family_id: FAMILY_ID,
      record_id: recordIds.experienceApprovalPlan,
      record_version: versionById[recordIds.experienceApprovalPlan],
      requested_changes: { title: 'Non-plan approval fixture' },
      requested_by: accounts.worker.id,
      status: 'pending',
    },
  ];
  unwrap(
    await service
      .from('schedule_change_requests')
      .upsert(approvalRequests, { onConflict: 'id' }),
    'Preparing guarded approval test requests',
  );

  return { accounts, versionById };
}

async function expectRejectedRpc(client, requestId, description) {
  const result = await client.rpc('approve_schedule_change', {
    request_id: requestId,
    approve: true,
    note: 'RLS automated test',
  });
  assert(Boolean(result.error), `${description} was not rejected.`);
}

async function runTests(service, accounts, versionById) {
  const master = await authenticateAccount(accounts.master);
  const spouse = await authenticateAccount(accounts.spouse);
  const worker = await authenticateAccount(accounts.worker);
  const guest = await authenticateAccount(accounts.guest);
  const disabled = await authenticateAccount(accounts.disabled);
  const outsider = await authenticateAccount(accounts.outsider);
  const admin = await authenticateAccount(accounts.admin);

  const disabledRead = await disabled
    .from('records')
    .select('id')
    .eq('id', recordIds.disabledPrivate);
  assert(
    !disabledRead.error && disabledRead.data.length === 0,
    'Test 1 failed: disabled account read its private diary.',
  );
  assertionCount += 1;

  const spouseRead = await spouse
    .from('records')
    .select('id')
    .eq('id', recordIds.ownerPrivate);
  const privateGrant = await spouse.from('record_audience').insert({
    record_id: recordIds.ownerPrivate,
    member_id: memberIds.spouse,
    granted_by: accounts.spouse.id,
  });
  assert(
    !spouseRead.error
      && spouseRead.data.length === 0
      && Boolean(privateGrant.error),
    'Test 2 failed: another master read or granted access to a private record.',
  );
  assertionCount += 1;

  const ungranted = await worker
    .from('records')
    .select('id')
    .eq('id', recordIds.ungrantedPlan);
  const granted = await worker
    .from('records')
    .select('id')
    .eq('id', recordIds.grantedPlan);
  assert(
    !ungranted.error
      && ungranted.data.length === 0
      && !granted.error
      && granted.data.length === 1,
    'Test 3 failed: worker plan visibility did not follow its audience grant.',
  );
  assertionCount += 1;

  const planInsert = await worker.from('records').insert({
    family_id: FAMILY_ID,
    record_kind: 'plan',
    record_type: 'schedule',
    title: 'Worker forbidden plan',
    event_start: '2030-02-01T10:00:00.000Z',
    created_by: accounts.worker.id,
  });
  const planUpdate = await worker
    .from('records')
    .update({ title: 'Worker changed plan' })
    .eq('id', recordIds.grantedPlan)
    .select('id');
  const planDelete = await worker
    .from('records')
    .delete()
    .eq('id', recordIds.grantedPlan)
    .select('id');
  assert(
    Boolean(planInsert.error)
      && (Boolean(planUpdate.error) || planUpdate.data.length === 0)
      && (Boolean(planDelete.error) || planDelete.data.length === 0),
    'Test 4 failed: worker changed a plan.',
  );
  assertionCount += 1;

  const workerDiary = unwrap(
    await worker
      .from('records')
      .insert({
        id: workerDiaryId,
        family_id: FAMILY_ID,
        record_kind: 'experience',
        record_type: 'diary',
        title: 'Worker editable diary',
        event_start: '2030-02-02T10:00:00.000Z',
        created_by: accounts.worker.id,
      })
      .select('id')
      .single(),
    'Creating worker-owned diary fixture',
  );
  const diaryId = workerDiary.id;
  const changeType = await worker
    .from('records')
    .update({ record_type: 'schedule' })
    .eq('id', diaryId)
    .select('id');
  const changeVisibility = await worker
    .from('records')
    .update({ visibility: 'private' })
    .eq('id', diaryId)
    .select('id');
  const impersonate = await worker
    .from('records')
    .update({ created_by: accounts.master.id })
    .eq('id', diaryId)
    .select('id');
  const diaryAfter = unwrap(
    await service
      .from('records')
      .select('record_type, visibility, created_by')
      .eq('id', diaryId)
      .single(),
    'Checking worker diary immutability',
  );
  assert(
    (Boolean(changeType.error) || changeType.data.length === 0)
      && (Boolean(changeVisibility.error) || changeVisibility.data.length === 0)
      && (Boolean(impersonate.error) || impersonate.data.length === 0)
      && diaryAfter.record_type === 'diary'
      && diaryAfter.visibility === 'family'
      && diaryAfter.created_by === accounts.worker.id,
    'Test 5 failed: worker changed restricted diary fields.',
  );
  assertionCount += 1;

  const immutableChanges = [
    { created_by: accounts.spouse.id },
    { family_id: OTHER_FAMILY_ID },
    { record_kind: 'experience' },
  ];
  let masterImmutableDenied = true;
  for (const changes of immutableChanges) {
    const result = await master
      .from('records')
      .update(changes)
      .eq('id', recordIds.immutablePlan)
      .select('id');
    if (!result.error && result.data.length > 0) {
      masterImmutableDenied = false;
    }
  }
  const immutableAfter = unwrap(
    await service
      .from('records')
      .select('family_id, created_by, record_kind')
      .eq('id', recordIds.immutablePlan)
      .single(),
    'Checking master record immutability',
  );
  assert(
    masterImmutableDenied
      && immutableAfter.family_id === FAMILY_ID
      && immutableAfter.created_by === accounts.master.id
      && immutableAfter.record_kind === 'plan',
    'Test 6 failed: master changed an immutable record field.',
  );
  assertionCount += 1;

  const crossFamilyProfile = await outsider
    .from('profiles')
    .select('id')
    .eq('id', accounts.master.id);
  const crossFamilyProfileUpdate = await outsider
    .from('profiles')
    .update({ display_name: 'Unauthorized profile change' })
    .eq('id', accounts.master.id)
    .select('id');
  assert(
    !crossFamilyProfile.error
      && crossFamilyProfile.data.length === 0
      && (Boolean(crossFamilyProfileUpdate.error)
        || crossFamilyProfileUpdate.data.length === 0),
    'Test 7 failed: profile access crossed family boundaries.',
  );
  assertionCount += 1;

  const wrongParticipant = await master.from('record_participants').insert({
    record_id: recordIds.immutablePlan,
    member_id: memberIds.outsider,
    added_by: accounts.master.id,
  });
  const wrongAudience = await master.from('record_audience').insert({
    record_id: recordIds.immutablePlan,
    member_id: memberIds.outsider,
    granted_by: accounts.master.id,
  });
  assert(
    Boolean(wrongParticipant.error) && Boolean(wrongAudience.error),
    'Test 8 failed: cross-family participant or audience association was accepted.',
  );
  assertionCount += 1;

  const objectPath = `${FAMILY_ID}/${recordIds.ungrantedPlan}/rls-test.txt`;
  unwrap(
    await master.storage
      .from('family-attachments')
      .upload(objectPath, Buffer.from('fictional RLS test attachment'), {
        contentType: 'text/plain',
        upsert: true,
      }),
    'Uploading private RLS test object',
  );
  const unauthorizedDownload = await worker.storage
    .from('family-attachments')
    .download(objectPath);
  assert(
    Boolean(unauthorizedDownload.error),
    'Test 9 failed: worker downloaded an object for an unreadable record.',
  );
  assertionCount += 1;

  const unreadableChangeRequest = await worker
    .from('schedule_change_requests')
    .insert({
      id: workerChangeRequestId,
      family_id: FAMILY_ID,
      record_id: recordIds.ungrantedPlan,
      record_version: versionById[recordIds.ungrantedPlan],
      requested_changes: { title: 'Unauthorized fictional title' },
      requested_by: accounts.worker.id,
    })
    .select('id');
  const changeRequest = unwrap(
    await worker
      .from('schedule_change_requests')
      .insert({
        id: workerChangeRequestId,
        family_id: FAMILY_ID,
        record_id: recordIds.grantedPlan,
        record_version: versionById[recordIds.grantedPlan],
        requested_changes: { title: 'Requested fictional title' },
        requested_by: accounts.worker.id,
      })
      .select('id')
      .single(),
    'Creating worker schedule change request',
  );
  const directRequestUpdate = await worker
    .from('schedule_change_requests')
    .update({ status: 'approved' })
    .eq('id', changeRequest.id)
    .select('id');
  unwrap(
    await service
      .from('records')
      .update({ title: 'Master changed the plan version' })
      .eq('id', recordIds.grantedPlan),
    'Advancing plan version for stale-request test',
  );
  const staleApproval = await master.rpc('approve_schedule_change', {
    request_id: changeRequest.id,
    approve: true,
    note: 'Stale version must be rejected',
  });

  const currentPlan = unwrap(
    await service
      .from('records')
      .select('row_version')
      .eq('id', recordIds.grantedPlan)
      .single(),
    'Reading plan version for successful approval test',
  );
  const validRequest = unwrap(
    await worker
      .from('schedule_change_requests')
      .insert({
        id: successfulChangeRequestId,
        family_id: FAMILY_ID,
        record_id: recordIds.grantedPlan,
        record_version: currentPlan.row_version,
        requested_changes: { title: 'Approved fictional title' },
        requested_by: accounts.worker.id,
      })
      .select('id')
      .single(),
    'Creating valid worker change request',
  );
  const successfulApproval = await master.rpc('approve_schedule_change', {
    request_id: validRequest.id,
    approve: true,
    note: 'Approved by fictional master',
  });
  const approvedPlan = unwrap(
    await service
      .from('records')
      .select('title')
      .eq('id', recordIds.grantedPlan)
      .single(),
    'Checking approved record changes',
  );
  const approvedRequest = unwrap(
    await service
      .from('schedule_change_requests')
      .select('status, decided_by')
      .eq('id', validRequest.id)
      .single(),
    'Checking approved request state',
  );
  assert(
    (Boolean(unreadableChangeRequest.error)
      || !unreadableChangeRequest.data?.length)
      && (Boolean(directRequestUpdate.error)
        || directRequestUpdate.data.length === 0)
      && Boolean(staleApproval.error)
      && !successfulApproval.error
      && approvedPlan.title === 'Approved fictional title'
      && approvedRequest.status === 'approved'
      && approvedRequest.decided_by === accounts.master.id,
    'Test 10 failed: unauthorized request, direct update, or stale approval was accepted.',
  );
  assertionCount += 1;

  unwrap(
    await service
      .from('records')
      .update({ visibility: 'private' })
      .eq('id', recordIds.privateApprovalPlan),
    'Making private approval fixture private',
  );
  const privateApproval = await expectRejectedRpc(
    master,
    requestIds.privateApproval,
    'Private-record approval',
  );
  const foreignApproval = await expectRejectedRpc(
    master,
    requestIds.outsiderApproval,
    'Cross-family approval',
  );
  unwrap(
    await service
      .from('records')
      .update({ record_kind: 'experience', record_type: 'diary' })
      .eq('id', recordIds.experienceApprovalPlan),
    'Preparing invalid non-plan approval fixture',
  );
  const nonPlanApproval = await expectRejectedRpc(
    master,
    requestIds.experienceApproval,
    'Non-plan approval',
  );
  assertionCount += 1;

  const crossFamilyLink = await master.from('records').insert({
    family_id: FAMILY_ID,
    record_kind: 'experience',
    record_type: 'diary',
    title: 'Cross-family link must fail',
    event_start: '2030-02-03T10:00:00.000Z',
    created_by: accounts.master.id,
    linked_plan_id: recordIds.outsiderPlan,
  });
  const experienceLink = await master.from('records').insert({
    family_id: FAMILY_ID,
    record_kind: 'experience',
    record_type: 'diary',
    title: 'Experience link must fail',
    event_start: '2030-02-03T10:00:00.000Z',
    created_by: accounts.master.id,
    linked_plan_id: recordIds.existingExperience,
  });
  assert(
    Boolean(crossFamilyLink.error) && Boolean(experienceLink.error),
    'Test 12 failed: invalid linked_plan_id was accepted.',
  );
  assertionCount += 1;

  const registration = await createRegistrationFixture(service, master, admin);
  assert(registration, 'Test 13 failed: pending registration flow was rejected.');
  assertionCount += 1;

  const oversizedObjectPath =
    `${FAMILY_ID}/${recordIds.ungrantedPlan}/rls-test-over-10-mib.bin`;
  const oversizedUpload = await master.storage
    .from('family-attachments')
    .upload(
      oversizedObjectPath,
      Buffer.alloc(10 * 1024 * 1024 + 1, 0x5a),
      {
        contentType: 'application/octet-stream',
        upsert: false,
      },
    );
  if (!oversizedUpload.error) {
    unwrap(
      await master.storage
        .from('family-attachments')
        .remove([oversizedObjectPath]),
      'Removing an unexpectedly accepted oversized test object',
    );
  }
  assert(
    Boolean(oversizedUpload.error),
    'Test 14 failed: the family-attachments bucket accepted a file larger than 10 MiB.',
  );
  assertionCount += 1;

  const guestRead = await guest
    .from('records')
    .select('id')
    .eq('id', recordIds.grantedPlan);
  const guestReadablePlanVersion = unwrap(
    await service
      .from('records')
      .select('row_version')
      .eq('id', recordIds.grantedPlan)
      .single(),
    'Reading the guest-readable plan version',
  ).row_version;
  const guestInsert = await guest.from('records').insert({
    family_id: FAMILY_ID,
    record_kind: 'experience',
    record_type: 'diary',
    title: 'Guest write must fail',
    event_start: '2030-02-02T12:00:00.000Z',
    created_by: accounts.guest.id,
  });
  const guestUpdate = await guest
    .from('records')
    .update({ title: 'Guest update must fail' })
    .eq('id', recordIds.grantedPlan)
    .select('id');
  const guestDelete = await guest
    .from('records')
    .delete()
    .eq('id', recordIds.grantedPlan)
    .select('id');
  const guestChangeRequest = await guest
    .from('schedule_change_requests')
    .insert({
      id: requestIds.guestRequest,
      family_id: FAMILY_ID,
      record_id: recordIds.grantedPlan,
      record_version: guestReadablePlanVersion,
      requested_changes: { title: 'Guest request must fail' },
      requested_by: accounts.guest.id,
    })
    .select('id');
  const guestRequestWasAccepted =
    !guestChangeRequest.error && Boolean(guestChangeRequest.data?.length);
  if (guestRequestWasAccepted) {
    unwrap(
      await service
        .from('schedule_change_requests')
        .delete()
        .eq('id', requestIds.guestRequest),
      'Cleaning up the unexpectedly accepted guest request',
    );
  }
  assert(
    !guestRead.error
      && guestRead.data.length === 1
      && Boolean(guestInsert.error)
      && (Boolean(guestUpdate.error) || guestUpdate.data.length === 0)
      && (Boolean(guestDelete.error) || guestDelete.data.length === 0)
      && !guestRequestWasAccepted,
    'Test 15 failed: guest access was not read-only or a guest schedule request was accepted.',
  );
  assertionCount += 1;
}

async function createRegistrationFixture(service, authenticatedMaster, authenticatedAdmin) {
  const email = `rls.signup.${randomUUID()}@family-calendar.test`;
  const password = process.env.RLS_TEST_PASSWORD;
  const created = unwrap(
    await service.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { full_name: 'Fictional Pending Applicant' },
    }),
    'Creating fictional registration test account',
  );
  const memberId = randomUUID();

  try {
    const signupClient = await authenticateAccount({
      email,
      displayName: 'Fictional Pending Applicant',
    });
    const profile = unwrap(
      await signupClient
        .from('profiles')
        .select('id')
        .eq('id', created.user.id)
        .single(),
      'Checking registration profile trigger',
    );
    const pending = unwrap(
      await signupClient
        .from('family_members')
        .insert({
          id: memberId,
          family_id: FAMILY_ID,
          profile_id: created.user.id,
          display_name: 'Fictional Pending Applicant',
          requested_role: 'worker',
          role: null,
          status: 'pending',
        })
        .select('id')
        .single(),
      'Submitting own pending family application',
    );
    const selfApproval = await signupClient
      .from('family_members')
      .update({ role: 'master', status: 'active' })
      .eq('id', pending.id)
      .select('id');
    const masterApproval = await authenticatedMaster
      .from('family_members')
      .update({ role: 'worker', status: 'active' })
      .eq('id', pending.id)
      .select('id');
    const adminApproval = await authenticatedAdmin
      .from('family_members')
      .update({ role: 'worker', status: 'active' })
      .eq('id', pending.id)
      .select('id');
    const storedMember = unwrap(
      await service
        .from('family_members')
        .select('role, status')
        .eq('id', memberId)
        .single(),
      'Checking pending application was not self-approved',
    );

    return profile.id === created.user.id
      && (Boolean(selfApproval.error) || selfApproval.data.length === 0)
      && (Boolean(masterApproval.error) || masterApproval.data.length === 0)
      && !adminApproval.error
      && adminApproval.data.length === 1
      && storedMember.role === 'worker'
      && storedMember.status === 'active';
  } finally {
    unwrap(
      await service.from('family_members').delete().eq('id', memberId),
      'Removing temporary fictional pending application',
    );
    unwrap(
      await service.auth.admin.deleteUser(created.user.id),
      'Removing temporary fictional registration account',
    );
  }
}

async function main() {
  getEnvironment();
  const service = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  const { accounts, versionById } = await prepareFixtures(service);
  await runTests(service, accounts, versionById);

  if (assertionCount !== 15) {
    throw new Error(`Expected 15 security tests, ran ${assertionCount}.`);
  }

  console.log('All 15 DB_DESIGN.md RLS security tests passed.');
}

main().catch((error) => {
  console.error('RLS security tests failed:', error);
  process.exitCode = 1;
});
