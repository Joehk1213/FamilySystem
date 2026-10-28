const { embedText } = require('./embed');
const DEFAULT_MEMORIES_TABLE = 'family_memories';
const IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/i;

function getFamilyMemoriesTable() {
  const table = process.env.FAMILY_MEMORIES_TABLE || DEFAULT_MEMORIES_TABLE;
  if (!IDENTIFIER_PATTERN.test(table)) {
    throw new TypeError('FAMILY_MEMORIES_TABLE must be a simple PostgreSQL identifier.');
  }
  return table;
}

function toPgVector(vector) {
  return `[${vector.join(',')}]`;
}

async function searchFamilyMemories(supabase, query, limit = 5, metric = 'cosine') {
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) {
    throw new RangeError('Search limit must be an integer between 1 and 12.');
  }
  if (!['cosine', 'l2', 'inner_product'].includes(metric)) {
    throw new TypeError('Search metric must be cosine, l2, or inner_product.');
  }

  const table = getFamilyMemoriesTable();
  const embedding = await embedText(query);
  const isPlaceholder = embedding.length === 384;
  const functionName = isPlaceholder && metric === 'cosine'
    ? `search_${table}_placeholder`
    : metric === 'cosine'
      ? `search_${table}`
      : `search_${table}_${metric}`;
  const parameters = {
    query_embedding: toPgVector(embedding),
    match_count: Math.min(limit, 12),
  };
  const result = await supabase.rpc(functionName, parameters);
  if (isPlaceholder && metric === 'cosine' && result.error?.code === 'PGRST202') {
    return supabase.rpc(`search_${table}`, parameters);
  }
  return result;
}

module.exports = { getFamilyMemoriesTable, searchFamilyMemories };
