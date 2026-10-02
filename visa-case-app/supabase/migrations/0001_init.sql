-- 在留資格案件管理 初期スキーマ
-- Supabase の SQL Editor に貼り付けて実行してください。

-- ============================================================
-- テーブル
-- ============================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_name text not null check (char_length(case_name) <= 100),
  procedure_type text not null check (procedure_type in ('renewal', 'change', 'coe', 'other')),
  current_status text,
  target_status text,
  memo text,
  workflow_status text not null default 'preparing'
    check (workflow_status in ('preparing', 'processing', 'review', 'confirmed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 案件名とは別に、確認済みの正式な申請人情報を保持する
create table public.applicants (
  case_id uuid primary key references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text,
  nationality text,
  date_of_birth date,
  residence_status text,
  residence_expiry_date date,
  confirmation_status text not null default 'unconfirmed'
    check (confirmation_status in ('unconfirmed', 'confirmed')),
  confirmed_at timestamptz,
  confirmed_by text
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  mime_type text,
  storage_path text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'processed', 'failed')),
  uploaded_at timestamptz not null default now()
);

-- OCR・AIの抽出結果（候補）と、行政書士が確認した値を分けて保持する
create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  field_name text not null,
  extracted_value text,
  reviewed_value text,
  confidence numeric,
  review_status text not null default 'pending' check (review_status in ('pending', 'confirmed')),
  unique (document_id, field_name)
);

-- 案件を削除しても残すため、案件への外部キーは設けない
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid,
  user_id uuid references auth.users(id),
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index on public.cases (organization_id, updated_at desc);
create index on public.documents (case_id);
create index on public.document_extractions (document_id);
create index on public.audit_logs (organization_id, created_at desc);

-- ============================================================
-- 所属判定の関数と、初回の事務所作成
-- ============================================================
create or replace function public.is_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members where organization_id = org and user_id = auth.uid()
  );
$$;

-- ログイン後、所属がなければ事務所を1つ作成して所属させる（自分用の初期設定）
create or replace function public.bootstrap_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  org uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select organization_id into org from public.members where user_id = uid limit 1;
  if org is not null then
    return org;
  end if;
  insert into public.organizations (name) values (org_name) returning id into org;
  insert into public.members (organization_id, user_id, role) values (org, uid, 'owner');
  return org;
end;
$$;

revoke all on function public.is_member(uuid) from public;
revoke all on function public.bootstrap_organization(text) from public;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.bootstrap_organization(text) to authenticated;
-- Supabase は anon にも既定で実行権限を付与するため、明示的に取り消す
revoke execute on function public.is_member(uuid) from anon;
revoke execute on function public.bootstrap_organization(text) from anon;

-- ============================================================
-- 行単位のアクセス制御（Row Level Security）
-- ============================================================
alter table public.organizations enable row level security;
alter table public.members enable row level security;
alter table public.cases enable row level security;
alter table public.applicants enable row level security;
alter table public.documents enable row level security;
alter table public.document_extractions enable row level security;
alter table public.audit_logs enable row level security;

create policy "members_select_own" on public.members
  for select to authenticated using (user_id = auth.uid());

create policy "organizations_select_member" on public.organizations
  for select to authenticated using (public.is_member(id));

create policy "cases_member_all" on public.cases
  for all to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));

create policy "applicants_member_all" on public.applicants
  for all to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));

create policy "documents_member_all" on public.documents
  for all to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));

create policy "document_extractions_member_all" on public.document_extractions
  for all to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));

-- 監査ログは閲覧と追記のみ（修正・削除は不可）
create policy "audit_logs_select_member" on public.audit_logs
  for select to authenticated using (public.is_member(organization_id));

create policy "audit_logs_insert_member" on public.audit_logs
  for insert to authenticated
  with check (public.is_member(organization_id) and user_id = auth.uid());

-- ============================================================
-- ファイル保存（非公開バケット）
-- 保存先のパスは「事務所ID/案件ID/書類ID.拡張子」とする
-- ============================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_bucket_member_all" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'documents'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'documents'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
