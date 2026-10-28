require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || '.env',
});

const { createClient } = require('@supabase/supabase-js');
const {
  embedText,
  getEmbeddingInfo,
  getModelPath,
} = require('../source/rag/embed');

const TEST_EMAIL = 'test.dad@family-calendar.test';
const TEST_CONTENT = 'Fictional family test memory: the blue kite is stored for Saturday.';

function requireEnvironment() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const password = process.env.SEED_TEST_USER_PASSWORD;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !password) {
    throw new Error('Local Supabase keys and SEED_TEST_USER_PASSWORD are required.');
  }
  if (process.env.RLS_TEST_PROJECT_CONFIRM !== 'I_AM_USING_A_DISPOSABLE_TEST_PROJECT') {
    throw new Error('Set RLS_TEST_PROJECT_CONFIRM for the disposable test project.');
  }

  const hostname = new URL(SUPABASE_URL).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    throw new Error('Family memory integration tests may only use a loopback Supabase URL.');
  }
  return { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, password };
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
  const workerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const pendingClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let memoryId;
  const signedInClients = [];
  let checks = 0;

  try {
    const { data: sessionData, error: signInError } = await userClient.auth.signInWithPassword({
      email: TEST_EMAIL,
      password,
    });
    if (signInError) {
      throw signInError;
    }
    if (!sessionData.user) {
      throw new Error('The fictional test account could not sign in.');
    }
    signedInClients.push(userClient);
    checks += 1;

    const { data: membership, error: membershipError } = await userClient
      .from('family_members')
      .select('status, role, is_active')
      .eq('profile_id', sessionData.user.id)
      .maybeSingle();
    if (membershipError) {
      throw membershipError;
    }
    if (membership?.status !== 'active' || membership.is_active !== true || !membership.role) {
      throw new Error('The fictional test account must have an active family membership.');
    }
    checks += 1;

    const embedding = await embedText('藍色風箏');
    const embeddingNorm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
    const embeddingInfo = getEmbeddingInfo();
    if (embedding.length !== embeddingInfo.dimensions
      || ![384, 512].includes(embedding.length)
      || Math.abs(embeddingNorm - 1) > 1e-6) {
      throw new Error('Chinese text embedding must be normalized and match the reported model dimensions.');
    }
    checks += 1;

    const testEmbedding = await embedText(TEST_CONTENT);
    const memoryVector = `[${testEmbedding.join(',')}]`;
    const memoryInsert = {
      content: TEST_CONTENT,
      source_file: 'fictional-test.txt',
      source_file_name: 'fictional-test.txt',
      created_by: sessionData.user.id,
      embedding: testEmbedding.length === 384 ? memoryVector : null,
    };
    if (testEmbedding.length === 512) {
      memoryInsert.embedding_bge = memoryVector;
    }
    const { data: inserted, error: insertError } = await userClient
      .from('family_memories')
      .insert(memoryInsert)
      .select('id')
      .single();
    if (insertError) {
      throw insertError;
    }
    memoryId = inserted.id;
    checks += 1;

    const appUrl = process.env.FAMILY_APP_URL
      || `http://127.0.0.1:${process.env.PORT || 3000}`;
    const authorization = `Bearer ${sessionData.session.access_token}`;
    const historyResponse = await fetch(`${appUrl}/api/memories`, {
      headers: { Authorization: authorization },
    });
    const historyResult = await historyResponse.json();
    if (!historyResponse.ok || !historyResult.success
      || !historyResult.data.some((memory) => memory.id === memoryId)) {
      throw new Error(historyResult.message || 'Authenticated memory history did not return the saved fixture.');
    }
    checks += 1;

    const workerSignIn = await workerClient.auth.signInWithPassword({
      email: 'test.helper@family-calendar.test',
      password,
    });
    if (workerSignIn.error || !workerSignIn.data.session) {
      throw workerSignIn.error || new Error('The fictional Worker test account could not sign in.');
    }
    signedInClients.push(workerClient);
    const workerHistory = await fetch(`${appUrl}/api/memories`, {
      headers: { Authorization: `Bearer ${workerSignIn.data.session.access_token}` },
    });
    const workerResult = await workerHistory.json();
    if (!workerHistory.ok || !workerResult.success
      || !workerResult.data.some((memory) => memory.id === memoryId)) {
      throw new Error('An active same-family Worker could not read family memory.');
    }
    checks += 1;

    const pendingSignIn = await pendingClient.auth.signInWithPassword({
      email: 'test.pending@family-calendar.test',
      password,
    });
    if (pendingSignIn.error || !pendingSignIn.data.session) {
      throw pendingSignIn.error || new Error('The fictional pending test account could not sign in.');
    }
    signedInClients.push(pendingClient);
    const pendingHistory = await fetch(`${appUrl}/api/memories`, {
      headers: { Authorization: `Bearer ${pendingSignIn.data.session.access_token}` },
    });
    const pendingResult = await pendingHistory.json();
    if (!pendingHistory.ok || !pendingResult.success
      || pendingResult.data.some((memory) => memory.id === memoryId)) {
      throw new Error('A pending account could read active family memory.');
    }
    checks += 1;

    const searchResponse = await fetch(`${appUrl}/api/memories/search`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: TEST_CONTENT }),
    });
    const searchResult = await searchResponse.json();
    if (!searchResponse.ok || !searchResult.success) {
      throw new Error(searchResult.message || 'Authenticated family memory search failed.');
    }
    if (!searchResult.data.matches.some((match) => match.id === memoryId)) {
      throw new Error('Authenticated family memory search did not return the saved fixture.');
    }
    const match = searchResult.data.matches.find((item) => item.id === memoryId);
    const metadata = match.metadata || match;
    if (!Number.isFinite(match.distance) || match.source_file_name !== 'fictional-test.txt'
      || !metadata.created_by || !metadata.created_at
      || searchResult.data.embedding.modelPath !== getModelPath()) {
      throw new Error('Family memory search did not return citation distance and metadata.');
    }
    const unrelatedResponse = await fetch(`${appUrl}/api/memories/search`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'MEME' }),
    });
    const unrelatedResult = await unrelatedResponse.json();
    if (!unrelatedResponse.ok || !unrelatedResult.success || unrelatedResult.data.matches.length) {
      throw new Error('An unrelated MEME query returned a family memory citation.');
    }
    checks += 1;

    console.log(`Family memories integration: ${checks}/8 checks passed (active membership, normalized embeddings, same-family access, cosine citations, unrelated-query filtering).`);
  } finally {
    if (memoryId) {
      const { error: deleteError } = await adminClient
        .from('family_memories')
        .delete()
        .eq('id', memoryId);
      if (deleteError) {
        throw deleteError;
      }
    }
    for (const client of signedInClients) {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
    }
  }
}

run().catch((error) => {
  console.error('Family memories integration failed:', error.message || error);
  process.exitCode = 1;
});
