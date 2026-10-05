-- 公式様式の生成 API のレート制限を、複数の実行単位で共有するための集計表と関数。
-- 固定窓（秒数は呼び出し側が指定）で、ログイン中のユーザー単位に数える。

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- 利用者からの直接の読み書きは、すべて拒否する（方針なしの RLS）。関数経由のみ。
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- 呼び出しを1回数え、上限内なら 0、超過なら次の窓までの待ち秒数（1以上）を返す。
create or replace function public.check_rate_limit(p_scope text, p_limit integer, p_window_sec integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  w_start timestamptz;
  new_count integer;
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;
  if p_scope is null or length(p_scope) = 0 or length(p_scope) > 64
     or p_limit < 1 or p_limit > 10000 or p_window_sec < 1 or p_window_sec > 3600 then
    raise exception 'invalid arguments';
  end if;
  w_start := to_timestamp(floor(extract(epoch from now()) / p_window_sec) * p_window_sec);
  insert into public.rate_limits as r (key, window_start, count)
  values (p_scope || ':' || uid::text, w_start, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into new_count;
  -- 古い行の掃除（呼び出しの一部でのみ行い、負荷を抑える）
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 hour';
  end if;
  if new_count > p_limit then
    return greatest(1, ceil(extract(epoch from (w_start + make_interval(secs => p_window_sec) - now())))::integer);
  end if;
  return 0;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke execute on function public.check_rate_limit(text, integer, integer) from anon;
grant execute on function public.check_rate_limit(text, integer, integer) to authenticated;
