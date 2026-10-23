require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const FAMILY_ID = '11111111-1111-4111-8111-111111111111';

const accountFixtures = [
  {
    email: 'test.dad@family-calendar.test',
    displayName: 'Test Dad',
    locale: 'zh',
    requestedRole: 'master',
    role: 'master',
    status: 'active',
  },
  {
    email: 'test.mom@family-calendar.test',
    displayName: 'Test Mom',
    locale: 'zh',
    requestedRole: 'master',
    role: 'master',
    status: 'active',
  },
  {
    email: 'test.helper@family-calendar.test',
    displayName: 'Test Helper',
    locale: 'en',
    requestedRole: 'worker',
    role: 'worker',
    status: 'active',
  },
  {
    email: 'test.pending@family-calendar.test',
    displayName: 'Pending Applicant',
    locale: 'zh',
    requestedRole: 'master',
    role: null,
    status: 'pending',
  },
];

const accountMemberIds = [
  '22222222-2222-4222-8222-222222222201',
  '22222222-2222-4222-8222-222222222202',
  '22222222-2222-4222-8222-222222222203',
  '22222222-2222-4222-8222-222222222206',
];

const childFixtures = [
  {
    id: '22222222-2222-4222-8222-222222222204',
    display_name: 'Test Child One',
  },
  {
    id: '22222222-2222-4222-8222-222222222205',
    display_name: 'Test Child Two',
  },
];

function requireEnvironment() {
  const requiredVariables = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SEED_TEST_USER_PASSWORD',
  ];
  const missingVariables = requiredVariables.filter(
    (name) => !process.env[name] || process.env[name].trim() === '',
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}`,
    );
  }

  if (
    process.env.SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.SUPABASE_ANON_KEY
  ) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY must not be the anon key.',
    );
  }
}

function getDataOrThrow(result, operation) {
  if (result.error) {
    throw new Error(`${operation} failed: ${result.error.message}`);
  }

  return result.data;
}

async function findAuthUserByEmail(supabase, email) {
  const usersPerPage = 1000;
  let page = 1;

  while (true) {
    const result = await supabase.auth.admin.listUsers({
      page,
      perPage: usersPerPage,
    });
    const data = getDataOrThrow(result, 'Listing Supabase Auth users');
    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );

    if (user) {
      return user;
    }

    if (data.users.length < usersPerPage) {
      return null;
    }

    page += 1;
  }
}

async function ensureAuthUser(supabase, fixture, password) {
  const existingUser = await findAuthUserByEmail(supabase, fixture.email);
  const userMetadata = { full_name: fixture.displayName };
  const result = existingUser
    ? await supabase.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true,
        password,
        user_metadata: userMetadata,
      })
    : await supabase.auth.admin.createUser({
        email: fixture.email,
        email_confirm: true,
        password,
        user_metadata: userMetadata,
      });
  const operation = existingUser
    ? `Updating test user ${fixture.email}`
    : `Creating test user ${fixture.email}`;
  const data = getDataOrThrow(result, operation);

  if (!data.user || !data.user.id) {
    throw new Error(`Supabase Auth returned no user for ${fixture.email}.`);
  }

  return data.user;
}

async function main() {
  requireEnvironment();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  getDataOrThrow(
    await supabase
      .from('families')
      .upsert(
        {
          id: FAMILY_ID,
          name: 'Test Family',
          timezone: 'Asia/Hong_Kong',
        },
        { onConflict: 'id' },
      ),
    'Upserting Test Family',
  );

  const users = [];
  for (const fixture of accountFixtures) {
    const user = await ensureAuthUser(
      supabase,
      fixture,
      process.env.SEED_TEST_USER_PASSWORD,
    );
    users.push({ fixture, user });
  }

  const profiles = users.map(({ fixture, user }) => ({
    id: user.id,
    display_name: fixture.displayName,
    locale: fixture.locale,
  }));

  getDataOrThrow(
    await supabase.from('profiles').upsert(profiles, { onConflict: 'id' }),
    'Upserting test profiles',
  );

  const accountMembers = users.map(({ fixture, user }, index) => ({
    id: accountMemberIds[index],
    family_id: FAMILY_ID,
    profile_id: user.id,
    display_name: fixture.displayName,
    requested_role: fixture.requestedRole,
    role: fixture.role,
    status: fixture.status,
  }));
  const children = childFixtures.map((fixture) => ({
    ...fixture,
    family_id: FAMILY_ID,
    profile_id: null,
    requested_role: null,
    role: null,
    status: 'active',
  }));

  getDataOrThrow(
    await supabase
      .from('family_members')
      .upsert([...accountMembers, ...children], { onConflict: 'id' }),
    'Upserting test family members',
  );

  console.log(
    'Seed completed: Test Family, four fictional Auth users and profiles, and six family members.',
  );
  console.log(
    'The helper test account locale is English. The pending account has no approved role.',
  );
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
