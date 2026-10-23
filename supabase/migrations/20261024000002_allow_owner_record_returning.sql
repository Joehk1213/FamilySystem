drop policy if exists records_select_readable
on public.records;

create policy records_select_readable
on public.records
for select
to authenticated
using (
  public.can_read_record(records.id)
  or (
    records.visibility <> 'public'
    and records.created_by = auth.uid()
    and public.is_active_family_role(records.family_id)
  )
);
