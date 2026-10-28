-- Generated from supabase/migrations/*.sql in filename order. Do not edit by hand.
BEGIN;

-- Source: 20261022000000_initial_schema.sql
-- ============================================================================
-- Family Calendar System — MVP Database Schema DDL (DRAFT v0.3)
-- 依據：Family_Calendar_System_Requirements_v3.md + 設計文檔（source/DB_DESIGN.md）
-- 狀態：【未驗證草稿 — 唔係正式 migration】
--   只包含：表、約束、索引、結構性 trigger
--   唔包含：RLS 政策、審批函式（approve_schedule_change）—— 權限規格見設計文檔，
--   實作前必須通過設計文檔嘅測試清單，並用 authenticated 身份驗證
-- 目標：Supabase (Postgres 15+)，auth.users（Google 登入）
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. 表結構
-- ============================================================================

-- families：家庭範圍（MVP 單家庭，結構預留）
create table families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  timezone    text not null default 'Asia/Hong_Kong',
  created_at  timestamptz not null default now()
);

-- profiles：身份（只放顯示資料；角色權限喺 family_members）
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  locale        text not null default 'zh' check (locale in ('zh','en')),
  created_at    timestamptz not null default now()
);

-- family_members：家庭成員 + 已批准權限
-- profile_id null = 冇帳戶成員（小朋友檔案）；role 由 Admin 批，用戶唔可以自批
create table family_members (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families(id) on delete cascade,
  profile_id     uuid unique references profiles(id) on delete set null,
  display_name   text not null,
  birthdate      date,
  requested_role text check (requested_role in ('master','worker','guest')),
  role           text check (role in ('admin','master','worker','guest')),
  status         text not null default 'pending'
                   check (status in ('pending','active','disabled')),
  created_at     timestamptz not null default now(),
  unique (family_id, profile_id)
);

-- records：核心表
-- record_kind：plan（計劃行程，原定時間／內容永久保留）/ experience（實際經歷）
-- 兩者互不覆蓋；完成計劃唔會自動生成歷史，經歷另開記錄用 linked_plan_id 關聯
-- is_all_day 語義：true 時 event_start 存當地日期 00:00；event_end 係不包含嘅界線
-- （例：10 月 21 日全天 = start 21日00:00、end 22日00:00，家庭時區）；顯示層取日期部分
create table records (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  record_kind     text not null check (record_kind in ('plan','experience')),
  record_type     text not null check (record_type in ('schedule','diary','photo','receipt','notice')),
  title           text,
  content         text,
  event_start     timestamptz not null,  -- plan：原定開始；experience：實際發生開始
  event_end       timestamptz,            -- plan：原定結束；experience：實際結束
  is_all_day      boolean not null default false,
  status          text not null default 'active',
  visibility      text not null default 'family'
                    check (visibility in ('public','family','private')),
  linked_plan_id  uuid references records(id),
  created_by      uuid not null references profiles(id),
  row_version     integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_records_kind_type check (
    (record_kind = 'plan' and record_type = 'schedule')
    or (record_kind = 'experience' and record_type in ('diary','photo','receipt','notice'))
  ),
  constraint chk_records_time check (
    event_end is null or event_end >= event_start
  ),
  constraint chk_records_status check (
    (record_kind = 'plan' and status in ('active','cancelled'))
    or (record_kind = 'experience' and status in ('active','final'))
  )
);

-- record_participants：參與者（小朋友冇帳戶都可以被標記；參與 ≠ 閱讀權限）
-- 規格：member 同 record 必須同家庭（RLS 之外，實作時加 trigger 或 CHECK 約束）
create table record_participants (
  record_id   uuid not null references records(id) on delete cascade,
  member_id   uuid not null references family_members(id) on delete cascade,
  added_by    uuid references profiles(id),
  created_at  timestamptz not null default now(),
  primary key (record_id, member_id)
);

-- record_audience：指定分享（姐姐獲授權嘅行程）
-- 規格：私人記錄一律唔可以授權（見下方 guard_audience_grant trigger）
create table record_audience (
  record_id   uuid not null references records(id) on delete cascade,
  member_id   uuid not null references family_members(id) on delete cascade,
  granted_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  primary key (record_id, member_id)
);

-- attachments：附件（object path，非公開 URL；Storage 政策見設計文檔）
-- 規格：uploaded_by 必須係操作者本人；object path 必須屬於該 record（實作時驗證）
create table attachments (
  id             uuid primary key default gen_random_uuid(),
  record_id      uuid not null references records(id) on delete cascade,
  storage_bucket text not null default 'family-attachments',
  storage_path    text not null,     -- 慣例：{family_id}/{record_id}/{filename}
  file_name      text,
  file_type      text,
  size_bytes     bigint,
  uploaded_by    uuid not null references profiles(id),
  created_at     timestamptz not null default now()
);

-- schedule_change_requests：改行程請求（FR011）
-- requested_changes 只限白名單欄位：title, content, event_start, event_end, is_all_day, status
-- 規格：審批一律經受控函式 approve_schedule_change()，冇直接 UPDATE 途徑
create table schedule_change_requests (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references families(id),
  record_id         uuid not null references records(id),
  record_version    integer not null,
  requested_changes jsonb not null,
  requested_by      uuid not null references profiles(id),
  status            text not null default 'pending'
                      check (status in ('pending','approved','rejected')),
  decided_by        uuid references profiles(id),
  decided_at        timestamptz,
  decision_note     text,
  created_at        timestamptz not null default now()
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================
create index idx_records_family_start  on records (family_id, event_start);
create index idx_records_linked_plan    on records (linked_plan_id);
create index idx_records_created_by     on records (created_by);
create index idx_records_visibility     on records (family_id, visibility);
create index idx_participants_member    on record_participants (member_id);
create index idx_audience_member        on record_audience (member_id);
create index idx_attachments_record     on attachments (record_id);
create index idx_scr_family_status      on schedule_change_requests (family_id, status);
create index idx_members_profile        on family_members (profile_id);

-- ============================================================================
-- 3. 結構性 Triggers（唔依賴 auth.uid() 嘅資料完整性規則）
-- ============================================================================

-- 新用戶註冊時自動建立 profile（登入申請流程入口）
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- linked_plan_id 驗證：必須係同一家戶嘅 plan；plan 唔可以被人 link
-- （一個 plan 可以對多個經歷；一個經歷最多 link 一個 plan）
create or replace function validate_linked_plan() returns trigger as $$
begin
  if new.record_kind = 'plan' and new.linked_plan_id is not null then
    raise exception '計劃記錄唔可以設 linked_plan_id';
  end if;
  if new.record_kind = 'experience' and new.linked_plan_id is not null then
    if not exists (
      select 1 from records p
      where p.id = new.linked_plan_id
        and p.family_id = new.family_id
        and p.record_kind = 'plan'
    ) then
      raise exception 'linked_plan_id 必須指向同一家戶嘅計劃記錄';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_records_linked_plan
  before insert or update on records
  for each row execute function validate_linked_plan();

-- 版本遞增 + updated_at：所有修改一律經呢個 trigger，令 row_version 可靠
create or replace function bump_row_version() returns trigger as $$
begin
  new.row_version := old.row_version + 1;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_records_version
  before update on records
  for each row execute function bump_row_version();

-- record_audience 防護：私人記錄一律唔可以授權指定分享
create or replace function guard_audience_grant() returns trigger as $$
declare
  r records%rowtype;
begin
  select * into r from records where id = new.record_id;
  if not found then
    raise exception '目標記錄不存在';
  end if;
  if r.visibility = 'private' then
    raise exception '私人記錄唔可以授權指定分享';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_audience_guard
  before insert or update on record_audience
  for each row execute function guard_audience_grant();

-- 改行程請求建立時驗證：同家庭、目標係 plan、非私人、版本相符、欄位白名單
create or replace function guard_scr_insert() returns trigger as $$
declare
  r records%rowtype;
  k text;
  allowed text[] := array['title','content','event_start','event_end','is_all_day','status'];
begin
  select * into r from records where id = new.record_id;
  if not found or r.family_id <> new.family_id then
    raise exception '請求目標必須係同一家戶嘅記錄';
  end if;
  if r.record_kind <> 'plan' then
    raise exception '只可以對計劃（行程）記錄提出修改請求';
  end if;
  if r.visibility = 'private' then
    raise exception '私人記錄唔可以提出修改請求';
  end if;
  if r.row_version <> new.record_version then
    raise exception 'record_version 同記錄現時版本不符';
  end if;
  for k in select jsonb_object_keys(new.requested_changes) loop
    if not (k = any(allowed)) then
      raise exception '欄位 % 唔喺可申請白名單', k;
    end if;
  end loop;
  return new;
end;
$$ language plpgsql;

create trigger trg_scr_guard_insert
  before insert on schedule_change_requests
  for each row execute function guard_scr_insert();

-- ============================================================================
-- 4. RLS：啟用但唔加放行政策（預設全部拒絕）
--    政策規格見設計文檔第 4 節；實作必須配合測試清單，通過先可以加政策
-- ============================================================================
alter table families                   enable row level security;
alter table profiles                   enable row level security;
alter table family_members             enable row level security;
alter table records                    enable row level security;
alter table record_participants        enable row level security;
alter table record_audience            enable row level security;
alter table attachments                enable row level security;
alter table schedule_change_requests   enable row level security;
-- 註：冇政策 = authenticated 使用者全部讀寫被拒（安全預設）。
-- 政策實作時要收窄函式執行權限（REVOKE/GRANT EXECUTE 只限 authenticated），
-- 並按設計文檔測試清單逐項驗證。

-- 私人 bucket；本階段不建立 storage.objects 放行政策。
-- 無政策時物件讀寫預設拒絕；待 can_read_record 完成並通過權限測試後，
-- 再按記錄權限及 {family_id}/{record_id}/{filename} 路徑加入政策。
insert into storage.buckets (id, name, public)
values ('family-attachments', 'family-attachments', false)
on conflict (id) do update
set public = false;

-- Source: 20261022000100_rls_policies.sql
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

-- Source: 20261022000200_repair_records_insert_policy.sql
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

-- Source: 20261024000001_require_readable_schedule_change_target.sql
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

-- Source: 20261024000002_allow_owner_record_returning.sql
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

-- Source: 20261024000003_approve_schedule_change_function.sql
create or replace function public.approve_schedule_change(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.approve_schedule_change(p_request_id, true, null::text);
end;
$$;

revoke all on function public.approve_schedule_change(uuid) from public;
grant execute on function public.approve_schedule_change(uuid) to authenticated;

-- Source: 20261024000004_restrict_approve_function_execute.sql
revoke all on function public.approve_schedule_change(uuid)
from public, anon, service_role;
grant execute on function public.approve_schedule_change(uuid)
to authenticated;

revoke all on function public.approve_schedule_change(uuid, boolean, text)
from public, anon, service_role;
grant execute on function public.approve_schedule_change(uuid, boolean, text)
to authenticated;

-- Source: 20261024000005_limit_family_attachments_to_10mb.sql
do $$
begin
  update storage.buckets
  set public = false,
      file_size_limit = 10485760
  where id = 'family-attachments';

  if not found then
    raise exception 'The family-attachments storage bucket does not exist.';
  end if;
end;
$$;

-- Source: 20261024000006_fix_guest_cannot_request.sql
-- Guest 不可提交 schedule change request；只限可讀取目標記錄的家庭成員。
drop policy if exists schedule_change_requests_insert_active_requester
  on public.schedule_change_requests;
drop policy if exists schedule_change_requests_insert_policy
  on public.schedule_change_requests;
drop policy if exists "Allow authenticated to insert schedule change requests"
  on public.schedule_change_requests;
drop policy if exists schedule_change_requests_insert_worker_only
  on public.schedule_change_requests;

create policy schedule_change_requests_insert_worker_only
on public.schedule_change_requests
for insert
to authenticated
with check (
  schedule_change_requests.requested_by = auth.uid()
  and schedule_change_requests.status = 'pending'
  and schedule_change_requests.decided_by is null
  and schedule_change_requests.decided_at is null
  and public.is_active_family_role(
    schedule_change_requests.family_id,
    array['worker', 'master', 'admin']
  )
  and public.can_read_record(schedule_change_requests.record_id)
);

-- Source: 20261028000001_family_memories.sql
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

-- Source: 20261028000002_reminders.sql
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

-- Source: 20261028000003_family_memory_metrics.sql
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

-- Source: 20261028000005_family_member_active_flag.sql
alter table public.family_members
  add column if not exists is_active boolean generated always as (status = 'active') stored;

create index if not exists reminders_family_due_at_idx
  on public.reminders (family_id, due_at);

-- Source: 20261028000006_security_logs.sql
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

-- Source: 20261028000007_family_memory_placeholder_search.sql
create or replace function public.search_family_memories_placeholder(
  query_embedding vector(384),
  match_count integer default 5
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
    memory.id,
    memory.content,
    memory.source_file as source_file_name,
    memory.created_by,
    memory.created_at,
    (memory.embedding <=> query_embedding)::real as distance,
    (1 - (memory.embedding <=> query_embedding))::real as similarity
  from public.family_memories memory
  where memory.embedding is not null
  order by memory.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 5), 1), 12);
$$;

revoke all on function public.search_family_memories_placeholder(vector, integer) from public;
grant execute on function public.search_family_memories_placeholder(vector, integer) to authenticated;

-- Source: 20261028000008_family_memories_bge.sql
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

-- Source: 20261028000009_family_memory_placeholder_threshold.sql
create or replace function public.search_family_memories_placeholder(
  query_embedding vector(384),
  match_count integer default 5
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
      (memory.embedding <=> query_embedding)::real as distance
    from public.family_memories memory
    where memory.embedding is not null
  ) matched
  where matched.distance <= 0.75
  order by matched.distance
  limit least(greatest(coalesce(match_count, 5), 1), 12);
$$;

revoke all on function public.search_family_memories_placeholder(vector, integer) from public;
grant execute on function public.search_family_memories_placeholder(vector, integer) to authenticated;

COMMIT;
