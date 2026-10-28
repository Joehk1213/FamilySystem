create index if not exists family_memories_embedding_l2_hnsw_idx
  on public.family_memories using hnsw (embedding vector_l2_ops);

create index if not exists family_memories_embedding_ip_hnsw_idx
  on public.family_memories using hnsw (embedding vector_ip_ops);

drop function public.search_family_memories(vector, integer);

create function public.search_family_memories(
  query_embedding vector(384),
  match_count integer default 5
)
returns table (
  id uuid,
  content text,
  source_file text,
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
    memory.source_file,
    memory.created_by,
    memory.created_at,
    (memory.embedding <=> query_embedding)::real as distance,
    (1 - (memory.embedding <=> query_embedding))::real as similarity
  from public.family_memories memory
  order by memory.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 5), 1), 20);
$$;

create function public.search_family_memories_l2(
  query_embedding vector(384),
  match_count integer default 5
)
returns table (
  id uuid,
  content text,
  source_file text,
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
    memory.source_file,
    memory.created_by,
    memory.created_at,
    (memory.embedding <-> query_embedding)::real as distance,
    (1.0 / (1.0 + (memory.embedding <-> query_embedding)))::real as similarity
  from public.family_memories memory
  order by memory.embedding <-> query_embedding
  limit least(greatest(coalesce(match_count, 5), 1), 20);
$$;

create function public.search_family_memories_inner_product(
  query_embedding vector(384),
  match_count integer default 5
)
returns table (
  id uuid,
  content text,
  source_file text,
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
    memory.source_file,
    memory.created_by,
    memory.created_at,
    (memory.embedding <#> query_embedding)::real as distance,
    (-(memory.embedding <#> query_embedding))::real as similarity
  from public.family_memories memory
  order by memory.embedding <#> query_embedding
  limit least(greatest(coalesce(match_count, 5), 1), 20);
$$;

revoke all on function public.search_family_memories(vector, integer) from public;
revoke all on function public.search_family_memories_l2(vector, integer) from public;
revoke all on function public.search_family_memories_inner_product(vector, integer) from public;
grant execute on function public.search_family_memories(vector, integer) to authenticated;
grant execute on function public.search_family_memories_l2(vector, integer) to authenticated;
grant execute on function public.search_family_memories_inner_product(vector, integer) to authenticated;
