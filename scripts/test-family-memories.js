require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || '.env',
});

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  MAX_BATCH_SIZE,
  MAX_TEXT_LENGTH,
  embedText,
  embedTexts,
  getEmbeddingInfo,
  getModelPath,
  isPlaceholder,
} = require('../source/rag/embed');

const TEST_EMAIL = 'test.dad@family-calendar.test';
const TEST_CONTENT = 'Fictional family test memory: the blue kite is stored for Saturday.';
const INGEST_SOURCE_FILE = `fictional-ingestion-${randomUUID()}.txt`;
const INGEST_PDF_SOURCE_FILE = `fictional-ingestion-${randomUUID()}.pdf`;

function createPdfFixture(text) {
  const escapedText = text.replace(/([\\()])/g, '\\$1');
  const content = `BT /F1 12 Tf 72 720 Td (${escapedText}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'ascii');
}

async function extractPdfText(buffer) {
  const pdfjsPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjs = await import(pathToFileURL(pdfjsPath).href);
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: pathToFileURL(
      `${path.resolve('node_modules/pdfjs-dist/standard_fonts')}${path.sep}`,
    ).href,
    isEvalSupported: false,
  });
  try {
    const document = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      pages.push(textContent.items
        .map((item) => item.str)
        .filter(Boolean)
        .join(' ')
        .trim());
      page.cleanup();
    }
    return pages.filter(Boolean).join('\n');
  } finally {
    await loadingTask.destroy();
  }
}

async function expectRangeError(operation, message) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof RangeError) {
      return;
    }
    throw error;
  }
  throw new Error(message);
}

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
  const memoryIds = [];
  const signedInClients = [];
  let profileId;
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
    profileId = sessionData.user.id;
    signedInClients.push(userClient);
    checks += 1;

    const { data: membership, error: membershipError } = await userClient
      .from('family_members')
      .select('family_id, status, role')
      .eq('profile_id', sessionData.user.id)
      .maybeSingle();
    if (membershipError) {
      throw membershipError;
    }
    if (membership?.status !== 'active' || !membership.family_id || !membership.role) {
      throw new Error('The fictional test account must have an active family membership.');
    }
    checks += 1;

    const embedding = await embedText('藍色風箏');
    const embeddingNorm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
    const embeddingInfo = getEmbeddingInfo();
    const expectedDimensions = isPlaceholder() ? 384 : 512;
    if (embedding.length !== embeddingInfo.dimensions
      || embedding.length !== expectedDimensions
      || Math.abs(embeddingNorm - 1) > 1e-6
      || isPlaceholder() !== (embeddingInfo.mode === 'local-feature-hash-placeholder')) {
      throw new Error(`Chinese text embedding must be normalized and contain ${expectedDimensions} dimensions for the selected model mode.`);
    }
    const boundaryBatch = await embedTexts(Array(MAX_BATCH_SIZE).fill('boundary'));
    if (boundaryBatch.length !== MAX_BATCH_SIZE
      || boundaryBatch.some((vector) => vector.length !== embeddingInfo.dimensions)) {
      throw new Error(`An embedding batch of ${MAX_BATCH_SIZE} texts was not accepted.`);
    }
    await expectRangeError(
      () => embedTexts(Array(MAX_BATCH_SIZE + 1).fill('boundary')),
      `An embedding batch larger than ${MAX_BATCH_SIZE} texts was accepted.`,
    );
    const maxLengthEmbedding = await embedText('x'.repeat(MAX_TEXT_LENGTH));
    if (maxLengthEmbedding.length !== embeddingInfo.dimensions) {
      throw new Error(`Text of ${MAX_TEXT_LENGTH} characters did not produce an embedding.`);
    }
    await expectRangeError(
      () => embedText('x'.repeat(MAX_TEXT_LENGTH + 1)),
      `Text longer than ${MAX_TEXT_LENGTH} characters was accepted.`,
    );
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
    memoryIds.push(inserted.id);
    checks += 1;

    const appUrl = process.env.FAMILY_APP_URL
      || `http://127.0.0.1:${process.env.PORT || 3000}`;
    const authorization = `Bearer ${sessionData.session.access_token}`;
    const ingestionChunks = [
      'Fictional family ingestion test chunk one: blue kite preparations.',
      'Fictional family ingestion test chunk two: test picnic checklist.',
      'Fictional family ingestion test chunk three: pretend Saturday plan.',
    ];
    const pdfFixtureText = 'Fictional PDF fixture: pretend Saturday housekeeper reminder checklist.';
    const extractedPdfText = await extractPdfText(createPdfFixture(pdfFixtureText));
    if (!extractedPdfText.includes(pdfFixtureText)) {
      throw new Error('Local PDF text extraction did not return the fictional fixture text.');
    }
    const ingestionItems = [
      ...ingestionChunks.map((content, index) => ({
        content,
        source_file_name: INGEST_SOURCE_FILE,
        metadata: { chunk_index: index + 1, chunk_count: ingestionChunks.length },
      })),
      {
        content: extractedPdfText,
        source_file_name: INGEST_PDF_SOURCE_FILE,
        metadata: { chunk_index: 1, chunk_count: 1 },
      },
    ];
    const ingestionResponse = await fetch(`${appUrl}/api/memories/ingest`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chunks: ingestionItems,
      }),
    });
    const ingestionResult = await ingestionResponse.json();
    if (!ingestionResponse.ok || !ingestionResult.success
      || ingestionResult.data.insertedCount !== ingestionItems.length
      || ingestionResult.data.items.length !== ingestionItems.length
      || ingestionResult.data.items.some((memory, index) => (
        memory.content !== ingestionItems[index].content
        || memory.source_file_name !== ingestionItems[index].source_file_name
        || memory.created_by !== sessionData.user.id
        || memory.metadata?.chunk_index !== ingestionItems[index].metadata.chunk_index
        || memory.metadata?.chunk_count !== ingestionItems[index].metadata.chunk_count
      ))) {
      throw new Error(ingestionResult.message || 'Authenticated file-memory ingestion failed.');
    }
    memoryIds.push(...ingestionResult.data.items.map((memory) => memory.id));
    if (ingestionResult.data.embedding.dimensions !== expectedDimensions
      || ingestionResult.data.embedding.mode !== embeddingInfo.mode) {
      throw new Error('Authenticated ingestion did not use the selected real-model embedding dimensions.');
    }
    checks += 1;

    const historyResponse = await fetch(`${appUrl}/api/memories`, {
      headers: { Authorization: authorization },
    });
    const historyResult = await historyResponse.json();
    if (!historyResponse.ok || !historyResult.success
      || !historyResult.data.some((memory) => memory.id === inserted.id)) {
      throw new Error(historyResult.message || 'Authenticated memory history did not return the saved fixture.');
    }
    checks += 1;

    const listResponse = await fetch(`${appUrl}/api/memories/list`, {
      headers: { Authorization: authorization },
    });
    const listResult = await listResponse.json();
    const listedFixture = listResult.data?.find((memory) => memory.id === inserted.id);
    if (!listResponse.ok || !listResult.success
      || !listedFixture
      || listedFixture.source_file_name !== 'fictional-test.txt'
      || !listedFixture.created_at
      || listedFixture.distance !== null
      || listedFixture.metadata?.created_at !== listedFixture.created_at) {
      throw new Error(listResult.message || 'The memory list did not return citation metadata.');
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
      || !workerResult.data.some((memory) => memory.id === inserted.id)) {
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
      || pendingResult.data.some((memory) => memory.id === inserted.id)) {
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
    if (!searchResult.data.security
      || !Array.isArray(searchResult.data.memories)
      || !Array.isArray(searchResult.data.citations)
      || !searchResult.data.editor
      || !searchResult.data.final
      || searchResult.data.embedding.dimensions !== expectedDimensions
      || searchResult.data.embedding.mode !== embeddingInfo.mode) {
      throw new Error('Memory search did not return the four-agent security and citation payload.');
    }
    if (!searchResult.data.matches.some((match) => match.id === inserted.id)) {
      throw new Error('Authenticated family memory search did not return the saved fixture.');
    }
    const match = searchResult.data.matches.find((item) => item.id === inserted.id);
    if (!Number.isFinite(match.distance)
      || (match.source_file || match.source_file_name) !== 'fictional-test.txt'
      || !match.created_at
      || searchResult.data.embedding.modelPath !== getModelPath()) {
      throw new Error('Family memory search did not return citation distance and metadata.');
    }
    if (!searchResult.data.citations.includes(inserted.id)) {
      throw new Error('Memory search did not cite the matching fictional family memory.');
    }
    const pdfSearchResponse = await fetch(`${appUrl}/api/memories/search`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'family housekeeper reminder' }),
    });
    const pdfSearchResult = await pdfSearchResponse.json();
    const pdfCitation = pdfSearchResult.data?.matches?.find(
      (memory) => memory.source_file === INGEST_PDF_SOURCE_FILE,
    );
    if (!pdfSearchResponse.ok || !pdfSearchResult.success
      || !pdfCitation
      || !pdfSearchResult.data.citations.includes(pdfCitation.id)) {
      throw new Error('Family housekeeper reminder search did not cite the fictional PDF memory.');
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

    console.log(`Family memories integration: ${checks}/10 checks passed (${embeddingInfo.mode}, ${embeddingInfo.dimensions}-dimensional normalized embeddings, ${MAX_BATCH_SIZE}-text batch and ${MAX_TEXT_LENGTH}-character boundaries, three text chunks plus locally extracted PDF ingestion, list metadata, same-family access, exact and PDF semantic citations, unrelated-query filtering).`);
  } finally {
    for (const memoryId of memoryIds) {
      const { error: deleteError } = await adminClient
        .from('family_memories')
        .delete()
        .eq('id', memoryId);
      if (deleteError) {
        throw deleteError;
      }
    }
    if (profileId) {
      const { error: ingestionCleanupError } = await adminClient
        .from('family_memories')
        .delete()
        .eq('created_by', profileId)
        .in('source_file', [INGEST_SOURCE_FILE, INGEST_PDF_SOURCE_FILE]);
      if (ingestionCleanupError) {
        throw ingestionCleanupError;
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
