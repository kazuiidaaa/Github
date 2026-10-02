-- 公式申請書の追加入力項目（フェーズ9）
-- 0012 の実行後に、SQL Editor で実行してください。実行前に、データベースのバックアップを取得してください。
-- 旅券番号・犯罪を理由とする処分の内容・在日親族の情報などの個人情報を含みます。
-- 案件ごとに1行。値は data（JSON）に保存し、項目名は lib/formDetails.ts の FormDetails に対応します。
-- RLS は他の案件関連テーブルと同じく、同じ事務所の所属者のみに許可します。

create table public.form_details (
  case_id uuid primary key references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 200000),
  updated_at timestamptz not null default now()
);

alter table public.form_details enable row level security;

create policy "form_details_select_member" on public.form_details
  for select to authenticated using (public.is_member(organization_id));

create policy "form_details_insert_member" on public.form_details
  for insert to authenticated with check (public.is_member(organization_id));

create policy "form_details_update_member" on public.form_details
  for update to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));

create policy "form_details_delete_member" on public.form_details
  for delete to authenticated using (public.is_member(organization_id));
