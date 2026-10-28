const { performance } = require('node:perf_hooks');
const { checkInput } = require('./securityAgent');
const { searchFamilyMemories } = require('./librarianAgent');
const analystAgent = require('./analystAgent');
const editorAgent = require('./editorAgent');

async function runQueryOrchestrator(query, ctx) {
  const startedAt = performance.now();
  if (typeof query !== 'string' || !query.trim()) {
    throw new TypeError('Enter a non-empty search query.');
  }
  if (!ctx?.familyId || !ctx?.userId || !ctx?.supabaseClient) {
    throw new TypeError('Family, user, and authenticated Supabase context are required.');
  }

  const security = await checkInput(query, ctx);
  if (!security.isSafe) {
    return {
      security,
      memories: [],
      analyst: null,
      final: {
        blocked: true,
        answer: '查詢已被安全檢查阻擋',
        reason: security.reason,
      },
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }

  const safeQuery = query.slice(0, 2000);
  const memories = await searchFamilyMemories(safeQuery, {
    familyId: ctx.familyId,
    supabaseClient: ctx.supabaseClient,
    metric: ctx.metric || 'cosine',
  });
  const analyst = analystAgent.analyze(safeQuery, memories);
  const editorResult = editorAgent.validateAndFormat(analyst, memories);
  const final = memories.length === 0
    && analyst.answer === analystAgent.NO_MEMORY_ANSWER
    ? { blocked: false, answer: analyst.answer }
    : editorResult;

  return {
    security,
    memories,
    analyst,
    final,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}

module.exports = { runQueryOrchestrator };
