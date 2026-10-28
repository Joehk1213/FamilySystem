create extension if not exists vector;

create table public.family_memories (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(384) not null,
  source_file text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index family_memories_embedding_hnsw_idx
  on public.family_memories using hnsw (embedding vector_cosine_ops);

alter table public.family_memories enable row level security;

create or replace function public.can_read_family_memory(p_created_by text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members creator
    join public.family_members reader
      on reader.family_id = creator.family_id
    where creator.profile_id::text = p_created_by
      and creator.status = 'active'
      and creator.role is not null
      and reader.profile_id = auth.uid()
      and reader.status = 'active'
      and reader.role is not null
  );
$$;

revoke all on function public.can_read_family_memory(text) from public;
grant execute on function public.can_read_family_memory(text) to authenticated;

create or replace function public.can_create_family_memory(p_created_by text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_created_by = auth.uid()::text
    and exists (
      select 1
      from public.family_members member
      where member.profile_id = auth.uid()
        and member.status = 'active'
        and member.role is not null
    );
$$;

revoke all on function public.can_create_family_memory(text) from public;
grant execute on function public.can_create_family_memory(text) to authenticated;

create policy family_memories_select_same_active_family
  on public.family_memories
  for select
  to authenticated
  using (public.can_read_family_memory(created_by));

create policy family_memories_insert_active_member
  on public.family_memories
  for insert
  to authenticated
  with check (public.can_create_family_memory(created_by));

revoke all on public.family_memories from anon, public;
grant select, insert on public.family_memories to authenticated;
grant all on public.family_memories to service_role;

create or replace function public.search_family_memories(
  query_embedding vector(384),
  match_count integer default 5
)
returns table (
  id uuid,
  content text,
  source_file text,
  created_by text,
  created_at timestamptz,
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
    1 - (memory.embedding <=> query_embedding) as similarity
  from public.family_memories memory
  order by memory.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 5), 1), 20);
$$;

revoke all on function public.search_family_memories(vector, integer) from public;
grant execute on function public.search_family_memories(vector, integer) to authenticated;
