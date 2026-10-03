-- 生成文書のエクセル出力（フェーズ11・公式様式の差し込み）
-- 0015 の実行後に、SQL Editor で実行してください。
-- generated_documents.output_format、バケット generated-documents の許可形式、登録関数を、xlsx に対応させる。
-- 保存先のパスは「事務所ID/案件ID/文書ID.拡張子」です（0010・0011 と同じ）。既存のデータは変更しません。

-- 出力形式の制約（0008 の列定義に付いた check。名称は自動命名のため、あれば削除して作り直す）
alter table public.generated_documents
  drop constraint if exists generated_documents_output_format_check;

alter table public.generated_documents
  add constraint generated_documents_output_format_check
  check (output_format in ('html', 'docx', 'pdf', 'xlsx'));

update storage.buckets
set allowed_mime_types = array[
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
where id = 'generated-documents';

create or replace function public.register_generated_file(
  p_source_id uuid,
  p_new_id uuid,
  p_output_format text,
  p_storage_path text
)
returns public.generated_documents
language plpgsql
as $$
declare
  src public.generated_documents;
  v integer;
  r public.generated_documents;
begin
  if p_output_format not in ('docx', 'pdf', 'xlsx') then
    raise exception '対応していない出力形式です。';
  end if;
  select * into src from public.generated_documents where id = p_source_id;
  if src.id is null then
    raise exception '文書が見つかりません。';
  end if;
  if p_storage_path <> src.organization_id::text || '/' || src.case_id::text || '/' || p_new_id::text || '.' || p_output_format then
    raise exception '保存先が正しくありません。';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(src.case_id::text || ':' || src.document_type, 0));
  select coalesce(max(version), 0) + 1 into v
    from public.generated_documents
    where case_id = src.case_id and document_type = src.document_type;
  insert into public.generated_documents
    (id, case_id, organization_id, created_by, document_type, title, version,
     content_json, output_format, storage_path)
  values
    (p_new_id, src.case_id, src.organization_id, auth.uid(), src.document_type, src.title, v,
     src.content_json, p_output_format, p_storage_path)
  returning * into r;
  return r;
end;
$$;

revoke all on function public.register_generated_file(uuid, uuid, text, text) from public;
revoke execute on function public.register_generated_file(uuid, uuid, text, text) from anon;
grant execute on function public.register_generated_file(uuid, uuid, text, text) to authenticated;
