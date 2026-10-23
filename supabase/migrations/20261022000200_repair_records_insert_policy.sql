drop policy if exists records_insert_as_self
on public.records;

create policy records_insert_as_self
on public.records
for insert
to authenticated
with check (
  (
    records.created_by = auth.uid()
    and public.is_active_family_role(
      records.family_id,
      array['admin', 'master']
    )
  )
  or (
    records.created_by = auth.uid()
    and records.record_kind = 'experience'
    and records.record_type in ('diary', 'photo')
    and public.is_active_family_role(records.family_id, array['worker'])
  )
);
