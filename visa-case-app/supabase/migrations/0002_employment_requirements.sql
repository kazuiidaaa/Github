-- 雇用・会社情報と、必要書類ごとの記録
-- 0001_init.sql の実行後に、SQL Editor で実行してください。

create table public.employment_details (
  case_id uuid primary key references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_name text,
  company_address text,
  industry text,
  capital text,
  employee_count text,
  category text check (category in ('1', '2', '3', '4')),
  withholding_special boolean not null default false,
  job_description text,
  employment_type text,
  monthly_salary text,
  employment_start_date date,
  contract_period text
);

-- 規則による判定は保存せず、行政書士の記録（提出済み・上書き・メモ）のみ保存する
create table public.requirement_states (
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requirement_id text not null,
  submitted boolean not null default false,
  override text check (override in ('required', 'not_required')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (case_id, requirement_id)
);

alter table public.employment_details enable row level security;
alter table public.requirement_states enable row level security;

create policy "employment_details_member_all" on public.employment_details
  for all to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));

create policy "requirement_states_member_all" on public.requirement_states
  for all to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));
