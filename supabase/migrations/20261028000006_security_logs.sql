-- Use the next unused migration version after the existing Family Memory migrations.
create extension if not exists vector;

create table if not exists public.security_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id),
  user_id uuid references auth.users(id),
  event_type text check (event_type in ('injection', 'jailbreak', 'hallucination_blocked', 'safe')),
  input_text text,
  created_at timestamptz default now()
);

create index if not exists idx_security_logs_family
  on public.security_logs (family_id);

alter table public.security_logs enable row level security;

drop policy if exists "same family active can read security_logs"
  on public.security_logs;
create policy "same family active can read security_logs"
  on public.security_logs
  for select
  to authenticated
  using (public.is_active_family_role(family_id));

drop policy if exists "same family active can insert security_logs"
  on public.security_logs;
create policy "same family active can insert security_logs"
  on public.security_logs
  for insert
  to authenticated
  with check (
    public.is_active_family_role(family_id)
    and user_id = auth.uid()
  );

revoke all on public.security_logs from anon, public;
grant select, insert on public.security_logs to authenticated;
grant all on public.security_logs to service_role;
