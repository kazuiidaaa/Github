-- 必要書類の状態・期限と、行政書士が追加する書類
-- 0002_employment_requirements.sql の実行後に、SQL Editor で実行してください。
-- 注意：submitted 列を削除します（元に戻せません）。実行前に、下記の確認を行ってください。
--   select count(*), count(*) filter (where submitted) from public.requirement_states;

-- 1. 状態と期限を追加する
alter table public.requirement_states
  add column status text not null default 'not_received'
    check (status in ('not_received', 'requested', 'received', 'reviewed')),
  add column due_date date;

-- 2. 既存の「提出済み」を「受領済み」へ移行する
update public.requirement_states set status = 'received' where submitted;

-- 3. 移行後に submitted を廃止する
alter table public.requirement_states drop column submitted;

-- 4. 規則にない書類（行政書士が案件ごとに追加）
create table public.custom_requirements (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  party text not null check (party in ('applicant', 'organization')),
  is_required boolean not null default true,
  status text not null default 'not_received'
    check (status in ('not_received', 'requested', 'received', 'reviewed')),
  due_date date,
  note text,
  created_at timestamptz not null default now()
);

create index on public.custom_requirements (case_id);

alter table public.custom_requirements enable row level security;

create policy "custom_requirements_member_all" on public.custom_requirements
  for all to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));
