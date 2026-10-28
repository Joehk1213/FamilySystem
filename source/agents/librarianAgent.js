const { searchFamilyMemories: searchRag } = require('../rag/search');

async function searchFamilyMemories(
  query,
  {
    familyId,
    supabaseClient,
    topK = 5,
    metric = 'cosine',
  },
) {
  if (!familyId || !supabaseClient) {
    throw new TypeError('Family and authenticated Supabase context are required.');
  }

  const { data: userResult, error: userError } = await supabaseClient.auth.getUser();
  if (userError) {
    throw userError;
  }
  if (!userResult.user) {
    throw new Error('An authenticated user is required for family memory search.');
  }

  const { data: membership, error: membershipError } = await supabaseClient
    .from('family_members')
    .select('family_id, is_active, role')
    .eq('profile_id', userResult.user.id)
    .eq('family_id', familyId)
    .eq('is_active', true)
    .not('role', 'is', null)
    .maybeSingle();
  if (membershipError) {
    throw membershipError;
  }
  if (!membership) {
    throw new Error('An active family membership is required for memory search.');
  }

  const { data, error } = await searchRag(supabaseClient, query, topK, metric);
  if (error) {
    throw error;
  }

  return (data || [])
    .filter((memory) => Number.isFinite(Number(memory.distance)) && Number(memory.distance) <= 0.75)
    .map((memory) => ({
      id: memory.id,
      content: memory.content,
      source_file_name: memory.source_file_name || memory.source_file || 'Family memory',
      distance: Number(memory.distance),
      metadata: {
        created_by: memory.created_by || null,
        created_at: memory.created_at || null,
      },
    }));
}

module.exports = { searchFamilyMemories };
