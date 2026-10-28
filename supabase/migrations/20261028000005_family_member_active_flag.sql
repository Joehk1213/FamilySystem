alter table public.family_members
  add column if not exists is_active boolean generated always as (status = 'active') stored;

create index if not exists reminders_family_due_at_idx
  on public.reminders (family_id, due_at);
