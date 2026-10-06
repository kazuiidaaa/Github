-- 画面の表示言語を、利用者ごとに保存する表（user_preferences）を追加する（Issue #255 第1段階）。
-- 0001〜0023 の実行後に、SQL Editor で実行してください。
--
-- 既存データへの影響：なし。新しい表を1つ追加するのみで、既存の表・列・方針は変更しません。
-- 実行しなくても、アプリは動きます（保存・取得に失敗した場合は、ブラウザの記憶のみで表示します）。
--
-- 各利用者が、自分の設定の行のみを、参照・追加・更新できる。他の利用者の行は、参照も更新もできない。
-- 削除の方針は付けない。利用者（auth.users）が削除されると、設定の行も連動して削除される。

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  language text not null check (language in ('ja', 'en', 'ko')),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own" on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own" on public.user_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own" on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ログイン前（anon）には権限を残さない。ログイン中の利用者には、必要最小の権限のみを付ける。
revoke all on public.user_preferences from anon;
revoke all on public.user_preferences from authenticated;
grant select, insert, update on public.user_preferences to authenticated;
