-- 案件の削除時に、生成したWord・PDF（generated-documents バケット）のファイルも削除できるようにする
-- 0013 の実行後に、SQL Editor で実行してください。
-- 削除できるのは、所有者（owner）と管理者（admin）のみ（案件の削除と同じ権限）。

drop policy if exists "generated_documents_bucket_delete" on storage.objects;
create policy "generated_documents_bucket_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'generated-documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin'])
  );
