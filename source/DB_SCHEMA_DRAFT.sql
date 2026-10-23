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
