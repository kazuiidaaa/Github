-- Phase 2：書類アップロードの強化
-- 0001〜0003 の実行後に、SQL Editor で実行してください。

-- ============================================================
-- documents：ファイルサイズと更新日時
-- ============================================================
alter table public.documents
  add column if not exists file_size bigint
    check (file_size is null or (file_size > 0 and file_size <= 20971520)),
  add column if not exists updated_at timestamptz not null default now();

-- ============================================================
-- バケット：20MB・JPEG/PNG/PDFのみ（非公開のまま）
-- ============================================================
update storage.buckets
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf']
where id = 'documents';

-- ============================================================
-- Storage の RLS：全操作の1本を、select / insert / delete に分割する
-- update は許可しない（既存ファイルを上書きできない）。
-- パスは「事務所ID/案件ID/ファイル名」。事務所に所属し、
-- かつ案件IDが当該事務所の案件であることを確認する。
-- ============================================================
drop policy if exists "documents_bucket_member_all" on storage.objects;

create policy "documents_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_member(((storage.foldername(name))[1])::uuid)
    and exists (
      select 1 from public.cases c
      where c.id = ((storage.foldername(name))[2])::uuid
        and c.organization_id = ((storage.foldername(name))[1])::uuid
    )
  );

create policy "documents_bucket_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
