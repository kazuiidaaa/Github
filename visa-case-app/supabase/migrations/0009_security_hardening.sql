-- 本番化（フェーズ7）：RLS・監査ログの強化
-- 0001〜0008 の実行後に、SQL Editor で実行してください。
--
-- 実行前の確認：次の各クエリの結果がすべて 0 であること。
-- 0 でない場合は、他事務所の案件に紐づく不整合なデータが存在するため、実行せずにご相談ください。
--   select count(*) from public.applicants x join public.cases c on c.id = x.case_id where c.organization_id <> x.organization_id;
--   select count(*) from public.documents x join public.cases c on c.id = x.case_id where c.organization_id <> x.organization_id;
--   select count(*) from public.employment_details x join public.cases c on c.id = x.case_id where c.organization_id <> x.organization_id;
--   select count(*) from public.requirement_states x join public.cases c on c.id = x.case_id where c.organization_id <> x.organization_id;
--   select count(*) from public.custom_requirements x join public.cases c on c.id = x.case_id where c.organization_id <> x.organization_id;
--   select count(*) from public.case_checks x join public.cases c on c.id = x.case_id where c.organization_id <> x.organization_id;
--   select count(*) from public.generated_documents x join public.cases c on c.id = x.case_id where c.organization_id <> x.organization_id;
--   select count(*) from public.document_extractions x join public.documents d on d.id = x.document_id where d.organization_id <> x.organization_id;

-- ============================================================
-- R1：子テーブルの case_id が、自事務所の案件を指すことを DB 側で保証する
-- ============================================================
alter table public.cases add constraint cases_id_org_unique unique (id, organization_id);

alter table public.applicants add constraint applicants_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.documents add constraint documents_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.employment_details add constraint employment_details_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.requirement_states add constraint requirement_states_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.custom_requirements add constraint custom_requirements_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.case_checks add constraint case_checks_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;
alter table public.generated_documents add constraint generated_documents_case_org_fk
  foreign key (case_id, organization_id) references public.cases (id, organization_id) on delete cascade;

alter table public.documents add constraint documents_id_org_unique unique (id, organization_id);
alter table public.document_extractions add constraint document_extractions_doc_org_fk
  foreign key (document_id, organization_id) references public.documents (id, organization_id) on delete cascade;

-- ============================================================
-- R2：ログイン前（anon）には、テーブルの権限を残さない
-- ============================================================
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- ============================================================
-- R3：トリガー関数の search_path を固定する
-- ============================================================
alter function public.guard_generated_documents() set search_path = public;

-- ============================================================
-- 7-4：監査ログに、操作の成否を追加する
-- 個人情報を保存しないため、detail には項目名・ID・列挙値のみを記録する（アプリ側で制限）
-- ============================================================
alter table public.audit_logs
  add column outcome text not null default 'success' check (outcome in ('success', 'failure'));
