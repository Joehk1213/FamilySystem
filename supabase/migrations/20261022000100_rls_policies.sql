-- Stage 3: Family-scoped authorization, RLS policies, and guarded approvals.
-- Apply only after 20261022000000_initial_schema.sql.

create or replace function public.can_read_record(p_record_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.records r
    join public.family_members fm
      on fm.family_id = r.family_id
    where r.id = p_record_id
      and fm.profile_id = auth.uid()
      and fm.status = 'active'
      and fm.role is not null
      and r.visibility <> 'public'
      and (
        (
          r.visibility = 'private'
          and r.created_by = auth.uid()
        )
        or (
          r.visibility = 'family'
          and (
            fm.role in ('admin', 'master')
            or r.created_by = auth.uid()
            or exists (
              select 1
              from public.record_audience ra
              where ra.record_id = r.id
                and ra.member_id = fm.id
            )
          )
        )
      )
  );
$$;

revoke all on function public.can_read_record(uuid) from public;
grant execute on function public.can_read_record(uuid) to authenticated;

create or replace function public.can_edit_record(p_record_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.records r
    join public.family_members fm
      on fm.family_id = r.family_id
    where r.id = p_record_id
      and fm.profile_id = auth.uid()
      and fm.status = 'active'
      and fm.role is not null
      and (
        (
          r.visibility = 'private'
          and r.created_by = auth.uid()
        )
        or (
          r.visibility <> 'private'
          and (
            fm.role in ('admin', 'master')
            or (
              fm.role = 'worker'
              and r.created_by = auth.uid()
              and r.record_kind = 'experience'
              and r.record_type in ('diary', 'photo')
            )
          )
        )
      )
  );
$$;

revoke all on function public.can_edit_record(uuid) from public;
grant execute on function public.can_edit_record(uuid) to authenticated;

create or replace function public.is_active_family_role(
  p_family_id uuid,
  p_allowed_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.profile_id = auth.uid()
      and fm.status = 'active'
      and fm.role is not null
      and (
        p_allowed_roles is null
        or fm.role = any(p_allowed_roles)
      )
  );
$$;

revoke all on function public.is_active_family_role(uuid, text[]) from public;
grant execute on function public.is_active_family_role(uuid, text[]) to authenticated;

create or replace function public.can_read_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_profile_id = auth.uid()
    or exists (
      select 1
      from public.family_members target_member
      join public.family_members actor
        on actor.family_id = target_member.family_id
      where target_member.profile_id = p_profile_id
        and actor.profile_id = auth.uid()
        and actor.status = 'active'
        and actor.role in ('admin', 'master')
    );
$$;

revoke all on function public.can_read_profile(uuid) from public;
grant execute on function public.can_read_profile(uuid) to authenticated;

create or replace function public.record_member_same_family(
  p_record_id uuid,
  p_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.records r
    join public.family_members fm
      on fm.family_id = r.family_id
    where r.id = p_record_id
      and public.can_edit_record(r.id)
      and fm.id = p_member_id
  );
$$;

revoke all on function public.record_member_same_family(uuid, uuid) from public;
grant execute on function public.record_member_same_family(uuid, uuid) to authenticated;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at then
    raise exception 'Profile identity fields cannot be changed';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_profile_update() from public;

create trigger trg_profiles_guard_update
before update on public.profiles
for each row execute function public.guard_profile_update();

create or replace function public.guard_family_member_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.family_id is distinct from old.family_id
     or new.profile_id is distinct from old.profile_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Family member identity fields cannot be changed';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_family_member_update() from public;

create trigger trg_family_members_guard_update
before update on public.family_members
for each row execute function public.guard_family_member_update();

create or replace function public.guard_record_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.family_id is distinct from old.family_id
     or new.created_by is distinct from old.created_by
     or new.record_kind is distinct from old.record_kind
     or new.created_at is distinct from old.created_at then
    raise exception 'Record identity fields cannot be changed';
  end if;

  if new.record_type is distinct from old.record_type
     or new.visibility is distinct from old.visibility
     or new.linked_plan_id is distinct from old.linked_plan_id then
    select fm.role
      into actor_role
    from public.family_members fm
    where fm.family_id = old.family_id
      and fm.profile_id = auth.uid()
      and fm.status = 'active'
      and fm.role in ('admin', 'master');

    if actor_role is null then
      raise exception 'Only an active family master or admin can change record_type, visibility, or linked_plan_id';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_record_update() from public;

create trigger trg_records_guard_update
before update on public.records
for each row execute function public.guard_record_update();

create or replace function public.approve_schedule_change(
  request_id uuid,
  approve boolean,
  note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  change_request public.schedule_change_requests%rowtype;
  target_record public.records%rowtype;
  requested_field text;
  allowed_fields constant text[] := array[
    'title',
    'content',
    'event_start',
    'event_end',
    'is_all_day',
    'status'
  ];
begin
  if auth.uid() is null then
    raise exception 'An authenticated family master or admin is required';
  end if;

  select scr.*
    into change_request
  from public.schedule_change_requests scr
  where scr.id = request_id
  for update;

  if not found then
    raise exception 'Schedule change request not found';
  end if;

  if change_request.status <> 'pending' then
    raise exception 'Schedule change request is not pending';
  end if;

  if not exists (
    select 1
    from public.family_members fm
    where fm.family_id = change_request.family_id
      and fm.profile_id = auth.uid()
      and fm.status = 'active'
      and fm.role in ('admin', 'master')
  ) then
    raise exception 'Only an active family master or admin can decide this request';
  end if;

  select r.*
    into target_record
  from public.records r
  where r.id = change_request.record_id
  for update;

  if not found
     or target_record.family_id <> change_request.family_id
     or target_record.record_kind <> 'plan'
     or target_record.visibility = 'private' then
    raise exception 'Request must target a non-private plan in the same family';
  end if;

  if target_record.row_version <> change_request.record_version then
    raise exception 'Record version changed; submit a new request';
  end if;

  for requested_field in
    select jsonb_object_keys(change_request.requested_changes)
  loop
    if not (requested_field = any(allowed_fields)) then
      raise exception 'Requested field % is not allowed', requested_field;
    end if;
  end loop;

  if approve then
    update public.records r
    set title = case
          when change_request.requested_changes ? 'title'
            then change_request.requested_changes ->> 'title'
          else r.title
        end,
        content = case
          when change_request.requested_changes ? 'content'
            then change_request.requested_changes ->> 'content'
          else r.content
        end,
        event_start = case
          when change_request.requested_changes ? 'event_start'
            then (change_request.requested_changes ->> 'event_start')::timestamptz
          else r.event_start
        end,
        event_end = case
          when change_request.requested_changes ? 'event_end'
            then (change_request.requested_changes ->> 'event_end')::timestamptz
          else r.event_end
        end,
        is_all_day = case
          when change_request.requested_changes ? 'is_all_day'
            then (change_request.requested_changes ->> 'is_all_day')::boolean
          else r.is_all_day
        end,
        status = case
          when change_request.requested_changes ? 'status'
            then change_request.requested_changes ->> 'status'
          else r.status
        end
    where r.id = target_record.id;
  end if;

  update public.schedule_change_requests scr
  set status = case when approve then 'approved' else 'rejected' end,
      decided_by = auth.uid(),
      decided_at = now(),
      decision_note = note
  where scr.id = change_request.id;
end;
$$;

revoke all on function public.approve_schedule_change(uuid, boolean, text) from public;
grant execute on function public.approve_schedule_change(uuid, boolean, text) to authenticated;

create policy families_select_active_member
on public.families
for select
to authenticated
using (
  public.is_active_family_role(families.id)
);

create policy families_update_admin
on public.families
for update
to authenticated
using (
  public.is_active_family_role(families.id, array['admin'])
)
with check (
  public.is_active_family_role(families.id, array['admin'])
);

create policy profiles_select_self_or_family_admin
on public.profiles
for select
to authenticated
using (
  public.can_read_profile(profiles.id)
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (profiles.id = auth.uid())
with check (profiles.id = auth.uid());

create policy family_members_select_self_or_family_admin
on public.family_members
for select
to authenticated
using (
  family_members.profile_id = auth.uid()
  or public.is_active_family_role(family_members.family_id, array['admin', 'master'])
);

create policy family_members_insert_self_pending
on public.family_members
for insert
to authenticated
with check (
  family_members.profile_id = auth.uid()
  and family_members.requested_role is not null
  and family_members.role is null
  and family_members.status = 'pending'
);

create policy family_members_insert_admin
on public.family_members
for insert
to authenticated
with check (
  public.is_active_family_role(family_members.family_id, array['admin'])
);

create policy family_members_update_admin
on public.family_members
for update
to authenticated
using (
  public.is_active_family_role(family_members.family_id, array['admin'])
)
with check (
  public.is_active_family_role(family_members.family_id, array['admin'])
);

create policy records_select_readable
on public.records
for select
to authenticated
using (public.can_read_record(records.id));

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

create policy records_update_editable
on public.records
for update
to authenticated
using (public.can_edit_record(records.id))
with check (
  public.can_edit_record(records.id)
  or (
    records.visibility = 'private'
    and public.is_active_family_role(
      records.family_id,
      array['admin', 'master']
    )
  )
);

create policy records_delete_editable
on public.records
for delete
to authenticated
using (public.can_edit_record(records.id));

create policy record_participants_select_readable_record
on public.record_participants
for select
to authenticated
using (public.can_read_record(record_participants.record_id));

create policy record_participants_insert_editable_record
on public.record_participants
for insert
to authenticated
with check (
  public.can_edit_record(record_participants.record_id)
  and public.record_member_same_family(
    record_participants.record_id,
    record_participants.member_id
  )
);

create policy record_participants_update_editable_record
on public.record_participants
for update
to authenticated
using (public.can_edit_record(record_participants.record_id))
with check (
  public.can_edit_record(record_participants.record_id)
  and public.record_member_same_family(
    record_participants.record_id,
    record_participants.member_id
  )
);

create policy record_participants_delete_editable_record
on public.record_participants
for delete
to authenticated
using (public.can_edit_record(record_participants.record_id));

create policy record_audience_select_readable_record
on public.record_audience
for select
to authenticated
using (public.can_read_record(record_audience.record_id));

create policy record_audience_insert_admin
on public.record_audience
for insert
to authenticated
with check (
    public.record_member_same_family(
      record_audience.record_id,
      record_audience.member_id
    )
    and exists (
      select 1
      from public.records r
      where r.id = record_audience.record_id
        and r.visibility <> 'private'
        and public.is_active_family_role(r.family_id, array['admin', 'master'])
    )
    and record_audience.granted_by = auth.uid()
);

create policy record_audience_delete_admin
on public.record_audience
for delete
to authenticated
using (
  exists (
    select 1
    from public.records r
    where r.id = record_audience.record_id
        and public.is_active_family_role(r.family_id, array['admin', 'master'])
    )
);

create policy attachments_select_readable_record
on public.attachments
for select
to authenticated
using (public.can_read_record(attachments.record_id));

create policy attachments_insert_editable_record
on public.attachments
for insert
to authenticated
with check (
  attachments.uploaded_by = auth.uid()
  and attachments.storage_bucket = 'family-attachments'
  and public.can_edit_record(attachments.record_id)
  and exists (
    select 1
    from public.records r
    where r.id = attachments.record_id
      and attachments.storage_path ~* (
        '^' || r.family_id::text || '/' || r.id::text || '/[^/]+$'
      )
  )
);

create policy attachments_update_editable_record
on public.attachments
for update
to authenticated
using (public.can_edit_record(attachments.record_id))
with check (
  attachments.uploaded_by = auth.uid()
  and attachments.storage_bucket = 'family-attachments'
  and public.can_edit_record(attachments.record_id)
  and exists (
    select 1
    from public.records r
    where r.id = attachments.record_id
      and attachments.storage_path ~* (
        '^' || r.family_id::text || '/' || r.id::text || '/[^/]+$'
      )
  )
);

create policy attachments_delete_editable_record
on public.attachments
for delete
to authenticated
using (public.can_edit_record(attachments.record_id));

create policy schedule_change_requests_select_requester_or_master
on public.schedule_change_requests
for select
to authenticated
using (
  schedule_change_requests.requested_by = auth.uid()
  or public.is_active_family_role(
    schedule_change_requests.family_id,
    array['admin', 'master']
  )
);

create policy schedule_change_requests_insert_active_requester
on public.schedule_change_requests
for insert
to authenticated
with check (
  schedule_change_requests.requested_by = auth.uid()
  and schedule_change_requests.status = 'pending'
  and schedule_change_requests.decided_by is null
  and schedule_change_requests.decided_at is null
  and public.is_active_family_role(schedule_change_requests.family_id)
);

create policy storage_objects_select_readable_record
on storage.objects
for select
to authenticated
using (
  bucket_id = 'family-attachments'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  and exists (
    select 1
    from public.records r
    where r.id::text = (storage.foldername(name))[2]
      and r.family_id::text = (storage.foldername(name))[1]
      and public.can_read_record(r.id)
  )
);

create policy storage_objects_insert_editable_record
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'family-attachments'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  and exists (
    select 1
    from public.records r
    where r.id::text = (storage.foldername(name))[2]
      and r.family_id::text = (storage.foldername(name))[1]
      and public.can_edit_record(r.id)
  )
);

create policy storage_objects_update_editable_record
on storage.objects
for update
to authenticated
using (
  bucket_id = 'family-attachments'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  and exists (
    select 1
    from public.records r
    where r.id::text = (storage.foldername(name))[2]
      and r.family_id::text = (storage.foldername(name))[1]
      and public.can_edit_record(r.id)
  )
)
with check (
  bucket_id = 'family-attachments'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  and exists (
    select 1
    from public.records r
    where r.id::text = (storage.foldername(name))[2]
      and r.family_id::text = (storage.foldername(name))[1]
      and public.can_edit_record(r.id)
  )
);

create policy storage_objects_delete_editable_record
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'family-attachments'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  and exists (
    select 1
    from public.records r
    where r.id::text = (storage.foldername(name))[2]
      and r.family_id::text = (storage.foldername(name))[1]
      and public.can_edit_record(r.id)
  )
);
