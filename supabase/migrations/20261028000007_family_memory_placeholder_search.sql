create or replace function public.search_family_memories_placeholder(
  query_embedding vector(384),
  match_count integer default 5
)
returns table (
  id uuid,
  content text,
  source_file_name text,
  created_by text,
  created_at timestamptz,
  distance real,
  similarity real
)
language sql
stable
set search_path = public
as $$
  select
    memory.id,
    memory.content,
    memory.source_file as source_file_name,
    memory.created_by,
    memory.created_at,
    (memory.embedding <=> query_embedding)::real as distance,
    (1 - (memory.embedding <=> query_embedding))::real as similarity
  from public.family_memories memory
  where memory.embedding is not null
  order by memory.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 5), 1), 12);
$$;

revoke all on function public.search_family_memories_placeholder(vector, integer) from public;
grant execute on function public.search_family_memories_placeholder(vector, integer) to authenticated;
