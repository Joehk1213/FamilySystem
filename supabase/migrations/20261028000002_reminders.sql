create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  due_at timestamptz,
  is_done boolean not null default false,
  source_memory_id uuid references public.family_memories(id) on delete set null,
  created_at timestamptz not null default now()
);

create index reminders_family_due_at_idx
  on public.reminders (family_id, due_at);

alter table public.reminders enable row level security;

create policy reminders_select_active_family
  on public.reminders
  for select
  to authenticated
  using (public.is_active_family_role(family_id));

create policy reminders_insert_active_family
  on public.reminders
  for insert
  to authenticated
  with check (
    public.is_active_family_role(family_id)
    and created_by = auth.uid()
  );

create policy reminders_update_active_family
  on public.reminders
  for update
  to authenticated
  using (public.is_active_family_role(family_id))
  with check (public.is_active_family_role(family_id));

create policy reminders_delete_active_family
  on public.reminders
  for delete
  to authenticated
  using (public.is_active_family_role(family_id));

create or replace function public.guard_reminder_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.family_id <> old.family_id
    or new.created_by <> old.created_by
    or new.created_at <> old.created_at then
    raise exception 'Reminder identity fields cannot be changed';
  end if;
  return new;
end;
$$;

create trigger reminders_guard_update
  before update on public.reminders
  for each row execute function public.guard_reminder_update();

create or replace function public.guard_reminder_source_memory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_memory_id is not null and not exists (
    select 1
    from public.family_memories memory
    join public.family_members creator
      on creator.profile_id::text = memory.created_by
    where memory.id = new.source_memory_id
      and creator.family_id = new.family_id
      and creator.status = 'active'
      and creator.role is not null
  ) then
    raise exception 'Source memory must belong to an active member of the same family';
  end if;
  return new;
end;
$$;

create trigger reminders_guard_source_memory
  before insert or update of source_memory_id, family_id
  on public.reminders
  for each row execute function public.guard_reminder_source_memory();

revoke all on function public.guard_reminder_update() from public;
revoke all on function public.guard_reminder_source_memory() from public;
revoke all on public.reminders from anon, public;
grant select, insert, update, delete on public.reminders to authenticated;
grant all on public.reminders to service_role;
