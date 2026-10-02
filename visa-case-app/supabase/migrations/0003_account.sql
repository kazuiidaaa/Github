-- アカウント画面用：事務所名の変更を、所有者（owner）のみに許可する
-- 0001・0002 の実行後に、SQL Editor で実行してください。

create policy "organizations_update_owner" on public.organizations
  for update to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.organization_id = organizations.id and m.user_id = auth.uid() and m.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.organization_id = organizations.id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );
