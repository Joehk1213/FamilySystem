alter table public.family_memories
  add column if not exists embedding_bge vector(512),
  add column if not exists source_file_name text;

update public.family_memories
set source_file_name = source_file
where source_file_name is null
  and source_file is not null;

alter table public.family_memories
  alter column embedding drop not null;

create index if not exists family_memories_embedding_bge_hnsw_idx
  on public.family_memories using hnsw (embedding_bge vector_cosine_ops);

drop function if exists public.search_family_memories(vector, integer);

create function public.search_family_memories(
  query_embedding vector(512),
  match_count integer default 12
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
    matched.id,
    matched.content,
    matched.source_file_name,
    matched.created_by,
    matched.created_at,
    matched.distance,
    (1 - matched.distance)::real as similarity
  from (
    select
      memory.id,
      memory.content,
      coalesce(memory.source_file_name, memory.source_file) as source_file_name,
      memory.created_by,
      memory.created_at,
      (memory.embedding_bge <=> query_embedding)::real as distance
    from public.family_memories memory
    where memory.embedding_bge is not null
  ) matched
  where matched.distance <= 0.75
  order by matched.distance
  limit least(greatest(coalesce(match_count, 12), 1), 12);
$$;

revoke all on function public.search_family_memories(vector, integer) from public;
grant execute on function public.search_family_memories(vector, integer) to authenticated;
