require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || '.env',
});

const { createClient } = require('@supabase/supabase-js');

const TEST_EMAIL = 'test.dad@family-calendar.test';

function requireEnvironment() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const password = process.env.SEED_TEST_USER_PASSWORD;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !password) {
    throw new Error('Local Supabase keys and SEED_TEST_USER_PASSWORD are required.');
  }
  if (process.env.RLS_TEST_PROJECT_CONFIRM !== 'I_AM_USING_A_DISPOSABLE_TEST_PROJECT') {
    throw new Error('Set RLS_TEST_PROJECT_CONFIRM for the disposable test project.');
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(new URL(SUPABASE_URL).hostname)) {
    throw new Error('Family reminder integration tests may only use a loopback Supabase URL.');
  }
  return { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, password };
}

async function request(appUrl, token, endpoint, method = 'GET', body) {
  const response = await fetch(`${appUrl}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  return { response, result };
}

async function run() {
  const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    password,
  } = requireEnvironment();
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const appUrl = process.env.FAMILY_APP_URL
    || `http://127.0.0.1:${process.env.PORT || 3000}`;
  const reminderIds = [];
  let checks = 0;

  try {
    const { data: sessionData, error: signInError } = await userClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password,
    });
    if (signInError || !sessionData.session) {
      throw signInError || new Error('The fictional reminder test account could not sign in.');
    }
    const token = sessionData.session.access_token;

    const listed = await request(appUrl, token, '/api/reminders/list');
    if (!listed.response.ok || !listed.result.success || !Array.isArray(listed.result.data)) {
      throw new Error(listed.result.message || 'The active member could not list reminders.');
    }
    checks += 1;

    const invalid = await request(appUrl, token, '/api/reminders/save', 'POST', {
      title: ' ',
      dueAt: 'not-a-date',
    });
    if (invalid.response.status !== 400 || invalid.result.success) {
      throw new Error('Invalid reminder input was not rejected.');
    }
    checks += 1;

    const savedLate = await request(appUrl, token, '/api/reminders/save', 'POST', {
      title: 'Fictional reminder integration test late',
      dueAt: '2030-05-01T09:00:00.000Z',
    });
    if (savedLate.response.status !== 201 || !savedLate.result.success || !savedLate.result.data.id) {
      throw new Error(savedLate.result.message || 'The active member could not save a reminder.');
    }
    const lateReminderId = savedLate.result.data.id;
    reminderIds.push(lateReminderId);
    const savedEarly = await request(appUrl, token, '/api/reminders/save', 'POST', {
      title: 'Fictional reminder integration test early',
      dueAt: '2029-05-01T09:00:00.000Z',
    });
    if (savedEarly.response.status !== 201 || !savedEarly.result.success || !savedEarly.result.data.id) {
      throw new Error(savedEarly.result.message || 'The active member could not save an earlier reminder.');
    }
    const earlyReminderId = savedEarly.result.data.id;
    reminderIds.push(earlyReminderId);
    const ordered = await request(appUrl, token, '/api/reminders/list');
    if (!ordered.response.ok || !ordered.result.success || !Array.isArray(ordered.result.data)) {
      throw new Error(ordered.result.message || 'The active member could not reload reminders.');
    }
    const earlyIndex = ordered.result.data.findIndex((reminder) => reminder.id === earlyReminderId);
    const lateIndex = ordered.result.data.findIndex((reminder) => reminder.id === lateReminderId);
    if (earlyIndex < 0 || earlyIndex >= lateIndex) {
      throw new Error('Reminders were not listed in ascending due-date order.');
    }
    checks += 1;

    const toggled = await request(appUrl, token, '/api/reminders/toggle', 'POST', {
      id: earlyReminderId,
      isDone: true,
    });
    if (!toggled.response.ok || !toggled.result.success || !toggled.result.data.is_done) {
      throw new Error(toggled.result.message || 'The active member could not toggle the reminder.');
    }
    checks += 1;

    const verified = await request(appUrl, token, '/api/reminders/list');
    if (!verified.response.ok || !verified.result.success
      || !verified.result.data.some((reminder) => reminder.id === earlyReminderId && reminder.is_done)
      || !verified.result.data.some((reminder) => reminder.id === lateReminderId && !reminder.is_done)) {
      throw new Error('The reminder list did not reflect the updated completion state.');
    }
    checks += 1;
    console.log(`Family reminders integration: ${checks}/5 checks passed (active membership, validation, due-date order, list/save/toggle).`);
  } finally {
    if (reminderIds.length) {
      const { error: deleteError } = await adminClient
        .from('reminders')
        .delete()
        .in('id', reminderIds);
      if (deleteError) {
        throw deleteError;
      }
    }
    const { error: signOutError } = await userClient.auth.signOut();
    if (signOutError) {
      throw signOutError;
    }
  }
}

run().catch((error) => {
  console.error('Family reminders integration failed:', error.message || error);
  process.exitCode = 1;
});
