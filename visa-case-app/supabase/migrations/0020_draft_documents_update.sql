-- 生成文書：確認前（draft）の版を、同じ行・同じ保管庫のファイルのまま更新できるようにする（Issue #203）
-- 0019 の実行後に、SQL Editor で実行してください。
-- 確認済み（reviewed）・提出済み（submitted）・保管（archived）の版は、内容もファイルも変更できません。
-- 行の削除のポリシーは、設けないままです（案件の削除に伴う連動削除は、従来どおりです）。

-- 内容の変更の規則：確認前のまま変更する場合に限り、題名・内容・版番号の変更を許可する（0019 の関数の差し替え）
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
    or new.created_at is distinct from old.created_at then
    raise exception '生成済みの文書の内容は変更できません。再生成して新しい版を作成してください。';
  end if;

  if (
    new.title is distinct from old.title
    or new.version is distinct from old.version
    or new.content_json is distinct from old.content_json
  ) and not (old.document_status = 'draft' and new.document_status = 'draft') then
    raise exception '確認前の版以外は、内容を変更できません。再生成して新しい版を作成してください。';
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

-- 確認前の版を更新する。版番号は、同じ案件・同じ種類の最大値の次へ進める。呼び出し元の権限（RLS）で実行される
create or replace function public.update_draft_generated_document(
  p_id uuid,
  p_title text,
  p_content jsonb
)
returns public.generated_documents
language plpgsql
set search_path = public
as $$
declare
  r public.generated_documents;
  v integer;
begin
  select * into r from public.generated_documents where id = p_id for update;
  if not found then
    raise exception '文書が見つかりません。';
  end if;
  if r.document_status <> 'draft' then
    raise exception '確認前の版のみ更新できます。再生成して新しい版を作成してください。';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(r.case_id::text || ':' || r.document_type, 0));
  select max(version) + 1 into v
    from public.generated_documents
    where case_id = r.case_id and document_type = r.document_type;
  update public.generated_documents
    set title = p_title, content_json = p_content, version = v
    where id = p_id
    returning * into r;
  return r;
end;
$$;

revoke all on function public.update_draft_generated_document(uuid, text, jsonb) from public;
revoke execute on function public.update_draft_generated_document(uuid, text, jsonb) from anon;
grant execute on function public.update_draft_generated_document(uuid, text, jsonb) to authenticated;

-- 保管庫（generated-documents）：上書きできるのは、対応する行が確認前の版のファイルのみ
drop policy if exists "generated_documents_bucket_update" on storage.objects;
create policy "generated_documents_bucket_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'generated-documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'staff'])
    and exists (
      select 1 from public.generated_documents g
      where g.storage_path = storage.objects.name and g.document_status = 'draft'
    )
  )
  with check (
    bucket_id = 'generated-documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'staff'])
  );
