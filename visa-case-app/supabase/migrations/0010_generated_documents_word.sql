-- 生成文書のWord出力（フェーズ6-B）
-- 0001〜0008 の実行後に、SQL Editor で実行してください（0009 の有無に依存しません）。
-- Wordファイルは非公開バケットに保存し、出力のたびに新しい版として登録します。
-- 保存先のパスは「事務所ID/案件ID/文書ID.docx」です。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-documents', 'generated-documents', false, 10485760,
  array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 閲覧は事務所の所属者。追加は、その事務所の案件に限る。更新と削除は許可しない（上書き不可）
create policy "generated_documents_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'generated-documents'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy "generated_documents_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'generated-documents'
    and public.is_member(((storage.foldername(name))[1])::uuid)
    and exists (
      select 1 from public.cases c
      where c.id = ((storage.foldername(name))[2])::uuid
        and c.organization_id = ((storage.foldername(name))[1])::uuid
    )
  );

-- 既存の版の内容を複製して、Word出力の版として登録する。元の版は変更しない。
-- 新しい版は「行政書士確認前（draft）」から始まる。呼び出し元の権限（RLS）で実行される
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
  if p_output_format <> 'docx' then
    raise exception '対応していない出力形式です。';
  end if;
  select * into src from public.generated_documents where id = p_source_id;
  if src.id is null then
    raise exception '文書が見つかりません。';
  end if;
  if p_storage_path <> src.organization_id::text || '/' || src.case_id::text || '/' || p_new_id::text || '.docx' then
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
