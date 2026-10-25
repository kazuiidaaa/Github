-- メンバー一覧 list_members の戻り値に、氏名 display_name を追加する(Issue #456)。
-- 0025 の実行後に、SQL Editor で実行してください。任意の更新です。実行しなくても、アプリは従来どおり動作します
-- (氏名が無い場合、アプリは氏名なしとして扱います)。本ファイルは、運用者が確認のうえで実行します。
-- 氏名は auth.users の raw_user_meta_data の full_name から取得します(無ければ null)。
--
-- 実行前の確認:
--   1) 現在の戻り値の形(user_id, email, role, created_at の4列であること)
--      select pg_get_function_result(p.oid)
--      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'public' and p.proname = 'list_members';
--   2) 実行権限(authenticated_ok が true、anon_ok が false であること)
--      select has_function_privilege('anon', 'public.list_members(uuid)', 'execute') as anon_ok,
--             has_function_privilege('authenticated', 'public.list_members(uuid)', 'execute') as authenticated_ok;
--
-- 戻し方:
--   0013_roles.sql にある list_members の定義(create or replace function public.list_members ...)と、
--   末尾の list_members に関する revoke / grant を、そのまま再実行してください。
--   戻り値の形が違うため、再実行の前に次を実行します。
--     drop function if exists public.list_members(uuid);
--   戻した後も、アプリは氏名なしとして動作します。

-- 戻り値の列が変わるため、create or replace ではなく、削除してから作り直す
drop function if exists public.list_members(uuid);

-- 一覧(メールアドレスと氏名を含むため、owner / admin のみ)
create function public.list_members(p_org uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz, display_name text)
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
    select m.user_id, u.email::text, m.role, m.created_at,
           nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')::text
    from public.members m join auth.users u on u.id = m.user_id
    where m.organization_id = p_org
    order by m.created_at;
end;
$$;

revoke all on function public.list_members(uuid) from public;
revoke execute on function public.list_members(uuid) from anon;
grant execute on function public.list_members(uuid) to authenticated;
