-- 案件を「グループ」(フォルダ)でまとめて管理するための、表と列を追加する(Issue #474 / #456)。
-- 0001〜0026 の実行後に、SQL Editor で実行してください。実行前にバックアップを取ってください。
-- 本ファイルは、運用者が内容を確認したうえで実行します(開発側は本番へ適用しません)。
--
-- 実行しなくても、アプリは従来どおり動作します(表・列が無い間は、グループの機能が画面に出ないだけです)。
-- 既存データへの影響: なし。表を1つと、cases に任意の列を2つ加えるのみ。既存の行は null(グループなし)のまま。
-- 既存の列・ポリシー・トリガー・関数は変更しません。
--
-- 内容
--   1) case_groups : グループ(名前・組織・作成日)。1つの組織の中の、案件のまとまり。
--   2) cases.group_id       : 属するグループ(任意。1案件は1グループのみ)。
--   3) cases.group_relation : 主たる申請人との関係の印(任意)。'primary'(主たる申請人) / 'companion'(帯同者) / 'other'(その他)。
--                             表示用の印のみ。判定・自動処理には使わない。1グループに主たる申請人が何人いてもよい(人数制限なし)。
--
-- 削除の挙動(案件を巻き込んで消さない)
--   - グループを削除しても、案件は削除されない。cases.group_id のみが null になる(on delete set null (group_id))。
--     アプリは、空になったグループも削除せず残す。グループの削除操作自体も、画面には設けない。
--   - 案件を削除しても、グループは削除されない(外部キーは cases 側にあり、グループ側には影響しない)。
--   - 組織(organizations)を削除すると、その組織のグループも連動して削除される(他の表と同じ)。
--     このとき cases も同じ組織の削除で連動して削除されるため、案件だけが先に失われることはない。
--
-- 外部キー
--   - case_groups.organization_id -> organizations(id) on delete cascade
--   - cases (group_id, organization_id) -> case_groups (id, organization_id) on delete set null (group_id)
--     複合の外部キーにして、他の組織のグループを案件に結び付けられないようにする(0009 の子表と同じ方針)。
--     group_id が null の行は検査されない(MATCH SIMPLE)。
--     「on delete set null (列名)」は PostgreSQL 15 以上の書き方(Supabase は 15 以上)。
--
-- 権限(RLS): 既存の cases と同等
--   - 閲覧   : 同じ組織のメンバー全員(viewer を含む)
--   - 作成・更新 : owner / admin / staff
--   - 削除   : owner / admin(cases と同じ。アプリからは使わない)
--   - viewer は閲覧のみ。anon(未ログイン)には権限を残さない。
--
-- インデックス
--   - case_groups (organization_id, created_at) : 組織ごとの一覧(登録順)
--   - cases (organization_id, group_id) where group_id is not null : グループごとの案件の取得、外部キーの検査
--
-- 実行前の確認(どちらも 0 件であること。既に別の用途で使われていないかの確認)
--   select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'case_groups';
--   select count(*) from information_schema.columns
--     where table_schema = 'public' and table_name = 'cases' and column_name in ('group_id', 'group_relation');
--
-- 戻し方(元に戻す SQL)
--   グループの情報(どの案件がどのグループか、関係の印)は失われます。案件そのものは残ります。
--   必要なら、先に次で控えを取ってください:
--     select id, group_id, group_relation from public.cases where group_id is not null or group_relation is not null;
--   戻す手順(この順に実行する):
--     alter table public.cases drop constraint if exists cases_group_fkey;
--     drop index if exists public.cases_org_group_idx;
--     alter table public.cases drop column if exists group_relation;
--     alter table public.cases drop column if exists group_id;
--     drop table if exists public.case_groups;
--   戻した後も、アプリは従来どおり動作します(グループの機能が画面に出なくなります)。

-- ============================================================
-- 1) グループの表
-- ============================================================
create table if not exists public.case_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  -- cases からの複合の外部キーの参照先(他の組織のグループを結び付けられないようにする)
  constraint case_groups_id_org_unique unique (id, organization_id)
);

create index if not exists case_groups_org_created_idx on public.case_groups (organization_id, created_at);

-- ============================================================
-- 2) 案件の列(任意)
-- ============================================================
alter table public.cases add column if not exists group_id uuid;
alter table public.cases add column if not exists group_relation text;

alter table public.cases drop constraint if exists cases_group_relation_check;
alter table public.cases
  add constraint cases_group_relation_check
  check (group_relation is null or group_relation in ('primary', 'companion', 'other'));

alter table public.cases drop constraint if exists cases_group_fkey;
alter table public.cases
  add constraint cases_group_fkey
  foreign key (group_id, organization_id)
  references public.case_groups (id, organization_id)
  on delete set null (group_id);

create index if not exists cases_org_group_idx on public.cases (organization_id, group_id) where group_id is not null;

-- ============================================================
-- 3) RLS(既存の cases と同等。閲覧は全役割、作成・更新は staff 以上、削除は owner / admin)
-- ============================================================
alter table public.case_groups enable row level security;

drop policy if exists "case_groups_select" on public.case_groups;
create policy "case_groups_select" on public.case_groups
  for select to authenticated using (public.is_member(organization_id));

drop policy if exists "case_groups_insert" on public.case_groups;
create policy "case_groups_insert" on public.case_groups
  for insert to authenticated
  with check (public.has_role(organization_id, array['owner', 'admin', 'staff']));

drop policy if exists "case_groups_update" on public.case_groups;
create policy "case_groups_update" on public.case_groups
  for update to authenticated
  using (public.has_role(organization_id, array['owner', 'admin', 'staff']))
  with check (public.has_role(organization_id, array['owner', 'admin', 'staff']));

drop policy if exists "case_groups_delete" on public.case_groups;
create policy "case_groups_delete" on public.case_groups
  for delete to authenticated
  using (public.has_role(organization_id, array['owner', 'admin']));

-- ログイン前(anon)には権限を残さない。ログイン中の利用者には、必要な権限のみを付ける(行の範囲は上の RLS が決める)。
revoke all on public.case_groups from anon;
revoke all on public.case_groups from authenticated;
grant select, insert, update, delete on public.case_groups to authenticated;
