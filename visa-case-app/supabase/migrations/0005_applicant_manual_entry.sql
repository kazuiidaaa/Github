-- 申請人情報の手入力化（OCR・AIによる抽出の廃止）
-- 0001〜0004 の実行後に、SQL Editor で実行してください。
-- document_extractions テーブルは、今回は残します（後続の移行で削除します）。

-- 申請人情報に任意項目を追加する
alter table public.applicants
  add column gender text,
  add column address text,
  add column residence_card_number text,
  add column work_restriction text,
  add column updated_at timestamptz not null default now();

-- 確認状態：unconfirmed → draft
alter table public.applicants drop constraint applicants_confirmation_status_check;
update public.applicants set confirmation_status = 'draft' where confirmation_status = 'unconfirmed';
alter table public.applicants alter column confirmation_status set default 'draft';
alter table public.applicants add constraint applicants_confirmation_status_check
  check (confirmation_status in ('draft', 'confirmed'));

-- 確認済みにできるのは、必須5項目が揃っている場合のみ（画面だけでなくDB側でも担保する）
alter table public.applicants add constraint applicants_confirmed_requires_fields
  check (
    confirmation_status <> 'confirmed'
    or (
      coalesce(btrim(legal_name), '') <> ''
      and coalesce(btrim(nationality), '') <> ''
      and coalesce(btrim(residence_status), '') <> ''
      and date_of_birth is not null
      and residence_expiry_date is not null
    )
  );

-- 案件の状態：preparing / applicant_confirmed の2値へ
alter table public.cases drop constraint cases_workflow_status_check;
update public.cases set workflow_status = 'applicant_confirmed' where workflow_status = 'confirmed';
update public.cases set workflow_status = 'preparing' where workflow_status in ('processing', 'review');
alter table public.cases add constraint cases_workflow_status_check
  check (workflow_status in ('preparing', 'applicant_confirmed'));

-- 書類の状態：OCR処理を行わないため、uploaded に統一する
update public.documents set status = 'uploaded' where status <> 'uploaded';
