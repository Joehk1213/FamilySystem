const { searchFamilyMemories: searchRag } = require('../rag/search');

async function searchFamilyMemories(
  query,
  {
    familyId,
    supabaseClient,
    topK = 5,
    threshold = 0.4,
  },
) {
  if (!familyId || !supabaseClient) {
    throw new TypeError('Family and authenticated Supabase context are required.');
  }
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 2) {
    throw new RangeError('Cosine distance threshold must be between 0 and 2.');
  }

  const { data: userResult, error: userError } = await supabaseClient.auth.getUser();
  if (userError) {
    throw userError;
  }
  if (!userResult?.user) {
    throw new Error('An authenticated user is required for family memory search.');
  }

  const { data: membership, error: membershipError } = await supabaseClient
    .from('family_members')
    .select('family_id, status, role')
    .eq('profile_id', userResult.user.id)
    .eq('family_id', familyId)
    .eq('status', 'active')
    .not('role', 'is', null)
    .maybeSingle();
  if (membershipError) {
    throw membershipError;
  }
  if (!membership) {
    throw new Error('An active family membership is required for memory search.');
  }

  const { data, error } = await searchRag(supabaseClient, query, topK, 'cosine');
  if (error) {
    throw error;
  }

  return (data || [])
    .filter((memory) => memory.distance !== null
      && memory.distance !== undefined
      && Number.isFinite(Number(memory.distance))
      && Number(memory.distance) <= threshold)
    .map((memory) => ({
      id: memory.id,
      content: memory.content,
      source_file: memory.source_file || memory.source_file_name || 'Family memory',
      distance: Number(memory.distance),
      created_at: memory.created_at,
    }));
}

module.exports = { searchFamilyMemories };
