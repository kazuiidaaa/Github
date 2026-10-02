-- 生成文書（フェーズ6-A：内部確認シート）
-- 0001〜0007 の実行後に、SQL Editor で実行してください。
-- content_json は生成時点の案件情報の写しであり、生成後は内容を変更できません。

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id),
  document_type text not null
    check (document_type in (
      'case_summary', 'applicant_summary', 'application_checklist',
      'reason_statement', 'official_application_form'
    )),
  title text not null,
  version integer not null check (version >= 1),
  content_json jsonb not null,
  storage_path text,
  output_format text check (output_format in ('html', 'docx', 'pdf')),
  document_status text not null default 'draft'
    check (document_status in ('draft', 'reviewed', 'final', 'archived')),
  reviewed_by uuid references auth.users(id),
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, document_type, version)
);

create index on public.generated_documents (case_id, document_type, version desc);

alter table public.generated_documents enable row level security;

-- 同じ事務所の所属者のみ。削除のポリシーは設けない（不要な版は archived にする）
create policy "generated_documents_select_member" on public.generated_documents
  for select to authenticated using (public.is_member(organization_id));

create policy "generated_documents_insert_member" on public.generated_documents
  for insert to authenticated
  with check (public.is_member(organization_id) and created_by = auth.uid());

create policy "generated_documents_update_member" on public.generated_documents
  for update to authenticated
  using (public.is_member(organization_id))
  with check (public.is_member(organization_id));

-- 生成済みの内容の変更を拒否し、状態の遷移を制限する
create or replace function public.guard_generated_documents()
returns trigger
language plpgsql
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
      or (old.document_status = 'reviewed' and new.document_status in ('final', 'archived'))
      or (old.document_status = 'final' and new.document_status = 'archived')
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

create trigger generated_documents_guard
  before update on public.generated_documents
  for each row execute function public.guard_generated_documents();

-- 版番号を採番して登録する。呼び出し元の権限（RLS）で実行される
create or replace function public.create_generated_document(
  p_case_id uuid,
  p_document_type text,
  p_title text,
  p_content jsonb
)
returns public.generated_documents
language plpgsql
as $$
declare
  org uuid;
  v integer;
  r public.generated_documents;
begin
  select organization_id into org from public.cases where id = p_case_id;
  if org is null then
    raise exception '案件が見つかりません。';
  end if;
  -- 同じ案件・同じ種類の同時生成で版番号が重複しないようにする
  perform pg_advisory_xact_lock(hashtextextended(p_case_id::text || ':' || p_document_type, 0));
  select coalesce(max(version), 0) + 1 into v
    from public.generated_documents
    where case_id = p_case_id and document_type = p_document_type;
  insert into public.generated_documents
    (case_id, organization_id, created_by, document_type, title, version, content_json, output_format)
  values
    (p_case_id, org, auth.uid(), p_document_type, p_title, v, p_content, 'html')
  returning * into r;
  return r;
end;
$$;

revoke all on function public.create_generated_document(uuid, text, text, jsonb) from public;
revoke execute on function public.create_generated_document(uuid, text, text, jsonb) from anon;
grant execute on function public.create_generated_document(uuid, text, text, jsonb) to authenticated;
