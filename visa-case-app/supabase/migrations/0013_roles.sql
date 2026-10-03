-- フェーズ10：複数ユーザーと役割（owner / admin / staff / viewer）
-- 0001〜0012 の実行後に、SQL Editor で実行してください。実行前にバックアップを取ってください。
--
-- 役割ごとの権限
--   owner  ：全操作、事務所名の変更、メンバー管理（役割の変更を含む）、案件の削除
--   admin  ：メンバーの追加と削除（staff / viewer のみ）、案件の削除、案件の作成・編集
--   staff  ：案件の作成・編集、書類・必要書類・チェック・文書の管理。案件の削除は不可
--   viewer ：閲覧のみ（操作の記録は残る）
-- 既存の所属者は、すべて owner のまま変わりません。
--
-- 実行前の確認：次の結果が 0 であること（owner / admin / staff / viewer 以外の役割が無いこと）
--   select count(*) from public.members where role not in ('owner', 'admin', 'staff', 'viewer');

alter table public.members
  add constraint members_role_check check (role in ('owner', 'admin', 'staff', 'viewer'));

-- ============================================================
-- 役割の判定
-- ============================================================
create or replace function public.has_role(org uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where organization_id = org and user_id = auth.uid() and role = any (roles)
  );
$$;

revoke all on function public.has_role(uuid, text[]) from public;
revoke execute on function public.has_role(uuid, text[]) from anon;
grant execute on function public.has_role(uuid, text[]) to authenticated;

-- ============================================================
-- members：同じ事務所の所属者は一覧を参照できる。変更は下の関数からのみ行う
-- ============================================================
drop policy if exists "members_select_own" on public.members;
create policy "members_select_org" on public.members
  for select to authenticated using (public.is_member(organization_id));

-- ============================================================
-- 案件：閲覧は全役割、作成・更新は staff 以上、削除は owner / admin
-- ============================================================
drop policy if exists "cases_member_all" on public.cases;
create policy "cases_select" on public.cases
  for select to authenticated using (public.is_member(organization_id));
create policy "cases_insert" on public.cases
  for insert to authenticated
  with check (public.has_role(organization_id, array['owner', 'admin', 'staff']));
create policy "cases_update" on public.cases
  for update to authenticated
  using (public.has_role(organization_id, array['owner', 'admin', 'staff']))
  with check (public.has_role(organization_id, array['owner', 'admin', 'staff']));
create policy "cases_delete" on public.cases
  for delete to authenticated
  using (public.has_role(organization_id, array['owner', 'admin']));

-- ============================================================
-- 案件の子テーブル：閲覧は全役割、作成・更新・削除は staff 以上
-- （画面での書類の差し替えやチェック項目の削除は、staff も行うため）
-- 案件そのものの削除は上のポリシーで owner / admin に限り、子テーブルは連動して削除される
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'applicants', 'documents', 'document_extractions', 'employment_details',
    'requirement_states', 'custom_requirements', 'case_checks'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_member_all', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_member(organization_id))',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_role(organization_id, array[''owner'', ''admin'', ''staff'']))',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_role(organization_id, array[''owner'', ''admin'', ''staff''])) with check (public.has_role(organization_id, array[''owner'', ''admin'', ''staff'']))',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_role(organization_id, array[''owner'', ''admin'', ''staff'']))',
      t || '_delete', t);
  end loop;
end $$;

-- ============================================================
-- 生成文書：閲覧は全役割、作成・更新は staff 以上（削除は不可のまま）
-- ============================================================
drop policy if exists "generated_documents_insert_member" on public.generated_documents;
drop policy if exists "generated_documents_update_member" on public.generated_documents;
create policy "generated_documents_insert_staff" on public.generated_documents
  for insert to authenticated
  with check (
    public.has_role(organization_id, array['owner', 'admin', 'staff']) and created_by = auth.uid()
  );
create policy "generated_documents_update_staff" on public.generated_documents
  for update to authenticated
  using (public.has_role(organization_id, array['owner', 'admin', 'staff']))
  with check (public.has_role(organization_id, array['owner', 'admin', 'staff']));

-- ============================================================
-- ファイル保存：閲覧は全役割。追加・削除は staff 以上
-- ============================================================
drop policy if exists "documents_bucket_insert" on storage.objects;
create policy "documents_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'staff'])
    and exists (
      select 1 from public.cases c
      where c.id = ((storage.foldername(name))[2])::uuid
        and c.organization_id = ((storage.foldername(name))[1])::uuid
    )
  );

drop policy if exists "documents_bucket_delete" on storage.objects;
create policy "documents_bucket_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'staff'])
  );

drop policy if exists "generated_documents_bucket_insert" on storage.objects;
create policy "generated_documents_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'generated-documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'staff'])
    and exists (
      select 1 from public.cases c
      where c.id = ((storage.foldername(name))[2])::uuid
        and c.organization_id = ((storage.foldername(name))[1])::uuid
    )
  );

-- ============================================================
-- メンバー管理（関数からのみ変更できる。操作は監査ログへ記録する）
-- 監査ログには、メールアドレスを残さず、対象のユーザーIDと役割のみを記録する
-- ============================================================
create or replace function public.member_audit(org uuid, act text, target uuid, new_role text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_logs (organization_id, user_id, action, detail)
  values (org, auth.uid(), act, jsonb_build_object('targetUserId', target, 'role', new_role));
$$;
revoke all on function public.member_audit(uuid, text, uuid, text) from public;
revoke execute on function public.member_audit(uuid, text, uuid, text) from anon, authenticated;

-- 一覧（メールアドレスを含むため、owner / admin のみ）
create or replace function public.list_members(p_org uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(p_org, array['owner', 'admin']) then
    raise exception 'forbidden';
  end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at
    from public.members m join auth.users u on u.id = m.user_id
    where m.organization_id = p_org
    order by m.created_at;
end;
$$;

-- 追加：既存アカウントのメールアドレスを指定する。owner は全役割、admin は staff / viewer のみ
create or replace function public.add_member_by_email(p_org uuid, p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller text;
  target uuid;
  other record;
begin
  select role into caller from public.members where organization_id = p_org and user_id = auth.uid();
  if caller is null or caller not in ('owner', 'admin') then
    raise exception 'forbidden';
  end if;
  if p_role not in ('owner', 'admin', 'staff', 'viewer') then
    raise exception 'invalid role';
  end if;
  if caller = 'admin' and p_role in ('owner', 'admin') then
    raise exception 'forbidden';
  end if;

  select id into target from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  -- アカウントの有無を推測されないよう、見つからない場合も同じエラーにする
  if target is null or exists (select 1 from public.members where organization_id = p_org and user_id = target) then
    raise exception 'cannot add member';
  end if;

  -- 初回ログイン時に自動作成された空の事務所だけは、参加のために整理する。案件のある事務所に所属済みなら追加しない
  for other in
    select m.organization_id from public.members m where m.user_id = target
  loop
    if exists (select 1 from public.cases c where c.organization_id = other.organization_id)
       or exists (select 1 from public.members x where x.organization_id = other.organization_id and x.user_id <> target) then
      raise exception 'cannot add member';
    end if;
  end loop;
  delete from public.organizations
    where id in (select organization_id from public.members where user_id = target);

  insert into public.members (organization_id, user_id, role) values (p_org, target, p_role);
  perform public.member_audit(p_org, 'member_added', target, p_role);
end;
$$;

-- 役割の変更：owner のみ。owner が0人になる変更は拒否する
create or replace function public.set_member_role(p_org uuid, p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role_name text;
begin
  if not public.has_role(p_org, array['owner']) then
    raise exception 'forbidden';
  end if;
  if p_role not in ('owner', 'admin', 'staff', 'viewer') then
    raise exception 'invalid role';
  end if;
  perform 1 from public.members where organization_id = p_org and role = 'owner' for update;
  select role into current_role_name from public.members where organization_id = p_org and user_id = p_user;
  if current_role_name is null then
    raise exception 'not found';
  end if;
  if current_role_name = 'owner' and p_role <> 'owner'
     and (select count(*) from public.members where organization_id = p_org and role = 'owner') <= 1 then
    raise exception 'last owner';
  end if;
  update public.members set role = p_role where organization_id = p_org and user_id = p_user;
  perform public.member_audit(p_org, 'member_role_changed', p_user, p_role);
end;
$$;

-- 削除：owner は全員、admin は staff / viewer のみ。最後の owner は削除できない
create or replace function public.remove_member(p_org uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller text;
  target_role text;
begin
  select role into caller from public.members where organization_id = p_org and user_id = auth.uid();
  if caller is null or caller not in ('owner', 'admin') then
    raise exception 'forbidden';
  end if;
  perform 1 from public.members where organization_id = p_org and role = 'owner' for update;
  select role into target_role from public.members where organization_id = p_org and user_id = p_user;
  if target_role is null then
    raise exception 'not found';
  end if;
  if caller = 'admin' and target_role in ('owner', 'admin') then
    raise exception 'forbidden';
  end if;
  if target_role = 'owner'
     and (select count(*) from public.members where organization_id = p_org and role = 'owner') <= 1 then
    raise exception 'last owner';
  end if;
  delete from public.members where organization_id = p_org and user_id = p_user;
  perform public.member_audit(p_org, 'member_removed', p_user, target_role);
end;
$$;

revoke all on function public.list_members(uuid) from public;
revoke all on function public.add_member_by_email(uuid, text, text) from public;
revoke all on function public.set_member_role(uuid, uuid, text) from public;
revoke all on function public.remove_member(uuid, uuid) from public;
revoke execute on function public.list_members(uuid) from anon;
revoke execute on function public.add_member_by_email(uuid, text, text) from anon;
revoke execute on function public.set_member_role(uuid, uuid, text) from anon;
revoke execute on function public.remove_member(uuid, uuid) from anon;
grant execute on function public.list_members(uuid) to authenticated;
grant execute on function public.add_member_by_email(uuid, text, text) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
