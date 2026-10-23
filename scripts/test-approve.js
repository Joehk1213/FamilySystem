const { createClient } = require('@supabase/supabase-js');

const FAMILY_ID = '11111111-1111-4111-8111-111111111111';
const MASTER_EMAIL = 'test.dad@family-calendar.test';
const WORKER_EMAIL = 'test.helper@family-calendar.test';
const WORKER_MEMBER_ID = '22222222-2222-4222-8222-222222222203';
const RECORD_ID = '77777777-7777-4777-8777-777777777701';
const APPROVAL_REQUEST_ID = '77777777-7777-4777-8777-777777777702';
const STALE_REQUEST_ID = '77777777-7777-4777-8777-777777777703';

function requireEnvironment() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SEED_TEST_USER_PASSWORD',
  ];
  const missing = required.filter(
    (name) => !process.env[name] || process.env[name].trim() === '',
  );

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.SUPABASE_URL).hostname,
    )
  ) {
    throw new Error('Refusing to run approval tests against a non-local Supabase URL.');
  }

  if (process.env.SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('The anon key and service-role key must be different.');
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

async function findUserByEmail(service, email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const data = unwrap(
      await service.auth.admin.listUsers({ page, perPage }),
      'Listing local Auth users',
    );
    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );

    if (user) {
      return user;
    }

    if (data.users.length < perPage) {
      throw new Error(`Seeded test account not found: ${email}`);
    }

    page += 1;
  }
}

async function authenticate(email, password) {
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
    await client.auth.signInWithPassword({ email, password }),
    `Signing in seeded test account ${email}`,
  );
  return client;
}

async function main() {
  requireEnvironment();

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

  const masterUser = await findUserByEmail(service, MASTER_EMAIL);
  const workerUser = await findUserByEmail(service, WORKER_EMAIL);

  unwrap(
    await service
      .from('schedule_change_requests')
      .delete()
      .in('id', [APPROVAL_REQUEST_ID, STALE_REQUEST_ID]),
    'Removing previous fictional approval requests',
  );
  unwrap(
    await service.from('records').delete().eq('id', RECORD_ID),
    'Removing previous fictional approval plan',
  );

  unwrap(
    await service.from('records').insert({
      id: RECORD_ID,
      family_id: FAMILY_ID,
      record_kind: 'plan',
      record_type: 'schedule',
      title: 'Fictional approval test plan',
      content: 'Initial fictional content',
      event_start: '2030-05-01T09:00:00.000Z',
      event_end: '2030-05-01T10:00:00.000Z',
      is_all_day: false,
      status: 'active',
      visibility: 'family',
      created_by: masterUser.id,
    }),
    'Creating fictional approval plan',
  );
  unwrap(
    await service.from('record_audience').upsert(
      {
        record_id: RECORD_ID,
        member_id: WORKER_MEMBER_ID,
        granted_by: masterUser.id,
      },
      { onConflict: 'record_id,member_id' },
    ),
    'Granting the helper access to the fictional plan',
  );

  const worker = await authenticate(
    WORKER_EMAIL,
    process.env.SEED_TEST_USER_PASSWORD,
  );
  const master = await authenticate(
    MASTER_EMAIL,
    process.env.SEED_TEST_USER_PASSWORD,
  );

  const request = {
    family_id: FAMILY_ID,
    record_id: RECORD_ID,
    record_version: 1,
    requested_changes: { title: 'Approved fictional plan title' },
    requested_by: workerUser.id,
  };
  const workerRequest = unwrap(
    await worker
      .from('schedule_change_requests')
      .insert({ ...request, id: APPROVAL_REQUEST_ID })
      .select('id')
      .single(),
    'Creating worker schedule change request',
  );
  const staleRequest = unwrap(
    await worker
      .from('schedule_change_requests')
      .insert({
        ...request,
        id: STALE_REQUEST_ID,
        requested_changes: { title: 'Stale fictional plan title' },
      })
      .select('id')
      .single(),
    'Creating stale-version worker schedule change request',
  );
  const workerSelfApproval = await worker.rpc('approve_schedule_change', {
    p_request_id: workerRequest.id,
  });
  assert(
    Boolean(workerSelfApproval.error),
    'Test 1 failed: worker approved their own schedule change request.',
  );
  console.log('Test 1 passed: worker submitted a request and could not approve it.');

  unwrap(
    await master.rpc('approve_schedule_change', {
      p_request_id: workerRequest.id,
    }),
    'Approving worker schedule change as master',
  );
  const approvedRecord = unwrap(
    await service
      .from('records')
      .select('title, row_version')
      .eq('id', RECORD_ID)
      .single(),
    'Checking approved plan values',
  );
  const approvedRequest = unwrap(
    await service
      .from('schedule_change_requests')
      .select('status, decided_by')
      .eq('id', workerRequest.id)
      .single(),
    'Checking approved request state',
  );
  assert(
    approvedRecord.title === 'Approved fictional plan title'
      && approvedRecord.row_version === 2
      && approvedRequest.status === 'approved'
      && approvedRequest.decided_by === masterUser.id,
    'Test 2 failed: master approval did not update the plan and request.',
  );
  console.log('Test 2 passed: master approved the request and the plan was updated.');

  const staleApproval = await master.rpc('approve_schedule_change', {
    p_request_id: staleRequest.id,
  });
  const staleRequestState = unwrap(
    await service
      .from('schedule_change_requests')
      .select('status')
      .eq('id', staleRequest.id)
      .single(),
    'Checking stale request state',
  );
  assert(
    Boolean(staleApproval.error) && staleRequestState.status === 'pending',
    'Test 3 failed: approval with an outdated row_version was accepted.',
  );
  console.log('Test 3 passed: approval with an outdated row_version was rejected.');
}

main().catch((error) => {
  console.error('Approval tests failed:', error);
  process.exitCode = 1;
});
