-- 生成文書の状態：「最終版」（final）を「提出済み」（submitted）にする（Issue #203）
-- 0018 の実行後に、SQL Editor で実行してください。
-- 流れは、確認前（draft）→ 行政書士確認済み（reviewed）→ 提出済み（submitted）→ 保管（archived）。
-- 既存の final は、submitted に読み替えます（実際に提出済みかどうかは、DB からは判別できません）。
-- 監査ログ（audit_logs）の過去の記録は、書き換えません。

-- 状態の制約（0008 の列定義に付いた check。名称は自動命名）
alter table public.generated_documents
  drop constraint if exists generated_documents_document_status_check;

-- 制約を外した状態で、既存の final を読み替える
update public.generated_documents
set document_status = 'submitted'
where document_status = 'final';

alter table public.generated_documents
  add constraint generated_documents_document_status_check
  check (document_status in ('draft', 'reviewed', 'submitted', 'archived'));

-- 遷移の規則：final を submitted に置き換える（0008 の関数の差し替え。search_path は 0009 と同じく固定する）
create or replace function public.guard_generated_documents()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.case_id is distinct from old.case_id
    or new.organization_id is distinct from old.organization_id
    or new.created_by is distinct from old.created_by
    or new.document_type is distinct from old.document_type
    or new.title is distinct from old.title
    or new.version is distinct from old.version
    or new.content_json is distinct from old.content_json
    or new.created_at is distinct from old.created_at then
    raise exception '生成済みの文書の内容は変更できません。再生成して新しい版を作成してください。';
  end if;

  if new.document_status is distinct from old.document_status then
    if not (
      (old.document_status = 'draft' and new.document_status in ('reviewed', 'archived'))
      or (old.document_status = 'reviewed' and new.document_status in ('submitted', 'archived'))
      or (old.document_status = 'submitted' and new.document_status = 'archived')
    ) then
      raise exception '文書の状態を % から % へ変更できません。', old.document_status, new.document_status;
    end if;
    if new.document_status = 'reviewed' then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
  else
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
