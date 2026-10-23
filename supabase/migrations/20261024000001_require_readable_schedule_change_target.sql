drop policy if exists schedule_change_requests_insert_active_requester
on public.schedule_change_requests;

create policy schedule_change_requests_insert_active_requester
on public.schedule_change_requests
for insert
to authenticated
with check (
  schedule_change_requests.requested_by = auth.uid()
  and schedule_change_requests.status = 'pending'
  and schedule_change_requests.decided_by is null
  and schedule_change_requests.decided_at is null
  and public.can_read_record(schedule_change_requests.record_id)
  and public.is_active_family_role(schedule_change_requests.family_id)
);
