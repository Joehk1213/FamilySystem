const { performance } = require('node:perf_hooks');
const { checkInput } = require('./securityAgent');
const { searchFamilyMemories } = require('./librarianAgent');
const analystAgent = require('./analystAgent');
const editorAgent = require('./editorAgent');

async function runQueryOrchestrator(
  query,
  { familyId, profileId, supabaseClient } = {},
) {
  const startedAt = performance.now();
  if (typeof query !== 'string' || !query.trim()) {
    throw new TypeError('Enter a non-empty search query.');
  }
  if (!familyId || !profileId || !supabaseClient) {
    throw new TypeError('Family, profile, and authenticated Supabase context are required.');
  }

  const security = await checkInput(query, {
    familyId,
    profileId,
    supabaseClient,
  });
  if (!security.isSafe) {
    return {
      security,
      memories: [],
      analyst: null,
      editor: {
        blocked: true,
        answer: '查詢已被安全檢查阻擋',
        reason: security.reason,
        final: '',
      },
      final: {
        blocked: true,
        answer: '查詢已被安全檢查阻擋',
        reason: security.reason,
        citations: [],
      },
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }

  const safeQuery = query.slice(0, 2000);
  const memories = await searchFamilyMemories(safeQuery, {
    familyId,
    supabaseClient,
    topK: 5,
    threshold: 0.4,
  });
  const analyst = analystAgent.analyze(safeQuery, memories);
  const editor = editorAgent.validateAndFormat(analyst, memories);
  const final = memories.length === 0
    ? {
      blocked: false,
      answer: analyst.answer,
      citations: [],
    }
    : editor.blocked
      ? {
        blocked: true,
        answer: editor.answer,
        reason: editor.reason,
        citations: [],
      }
      : {
        blocked: false,
        answer: editor.final,
        citations: editor.citations,
      };

  return {
    security,
    memories,
    analyst,
    editor,
    final,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}

module.exports = { runQueryOrchestrator };
