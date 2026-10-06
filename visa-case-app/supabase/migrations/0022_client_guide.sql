-- 依頼者向けのご案内書類（お願いする書類のご案内）を、生成履歴（版管理）へ登録する（Issue #224）
-- 0021 の実行後に、SQL Editor で実行してください。
-- generated_documents.document_type に 'client_guide' を追加します。
-- 既存のデータ・ポリシー・トリガーは変更しません。

alter table public.generated_documents
  drop constraint if exists generated_documents_document_type_check;

alter table public.generated_documents
  add constraint generated_documents_document_type_check
  check (document_type in (
    'case_summary', 'applicant_summary', 'application_checklist',
    'reason_statement', 'official_application_form', 'transcription_aid',
    'hsp_point_sheet', 'client_guide'
  ));
