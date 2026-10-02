-- 申請前チェック（フェーズ5）
-- 0001〜0006 の実行後に、SQL Editor で実行してください。
-- チェック結果は法的判断ではなく、行政書士が確認するための管理状態です。

create table public.case_checks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  check_type text not null
    check (check_type in ('applicant', 'document', 'deadline', 'manual')),
  -- 項目の固定ID。案件ごとに同じ項目を重複して作らないために使う
  check_key text not null,
  check_name text not null,
  check_status text not null default 'pending'
    check (check_status in ('pending', 'passed', 'warning', 'failed', 'not_applicable')),
  note text,
  checked_at timestamptz,
  checked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, check_key)
);

create index on public.case_checks (case_id);

alter table public.case_checks enable row level security;

create policy "case_checks_member_all" on public.case_checks
  for all to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));

-- 申請予定日と、申請前チェック全体の行政書士メモ
alter table public.cases add column planned_application_date date;
alter table public.cases add column check_memo text;

-- 案件ステータスに「要確認」「申請準備完了」を追加する
alter table public.cases drop constraint cases_workflow_status_check;
alter table public.cases add constraint cases_workflow_status_check
  check (workflow_status in (
    'preparing', 'applicant_confirmed',
    'review_required', 'application_ready'
  ));
