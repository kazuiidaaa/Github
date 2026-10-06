import { createClient } from "@supabase/supabase-js";
import { byteLength, checkSharedRateLimit, clientKey, createRateLimiter } from "../../../lib/documents/officialFormGuard";
import { supabaseKey, supabaseUrl } from "../../../lib/env";
import { lookupAddress } from "../../../lib/japanPost";
import { toPostalDigits } from "../../../lib/postalCode";
import { isSupabaseEnabled } from "../../../lib/supabase";

// 郵便番号から住所の前半を返す。日本郵便の API は、このサーバー側からのみ呼ぶ（認証情報を画面へ出さない）。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 30;
const RATE_WINDOW_SEC = 60;
const MAX_BODY = 1000;
const localLimiter = createRateLimiter(RATE_LIMIT, RATE_WINDOW_SEC * 1000);

type Auth = { allowed: false } | { allowed: true; userId: string | null; token: string | null };

/** Supabase 設定済みの環境では、アクセストークンの検証のみで通す。未設定のローカルは、データを扱わないため通す */
async function authenticate(req: Request): Promise<Auth> {
  if (!isSupabaseEnabled) return { allowed: true, userId: null, token: null };
  const token = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token || !supabaseUrl || !supabaseKey) return { allowed: false };
  const { data, error } = await createClient(supabaseUrl, supabaseKey).auth.getUser(token);
  return !error && data.user ? { allowed: true, userId: data.user.id, token } : { allowed: false };
}

function fail(message: string, status: number, headers?: Record<string, string>) {
  return Response.json({ error: message }, { status, headers });
}

async function checkRate(auth: { userId: string | null; token: string | null }, headers: Headers) {
  if (auth.token && supabaseUrl && supabaseKey) {
    const client = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${auth.token}` } } });
    return checkSharedRateLimit(() => client.rpc("check_rate_limit", { p_scope: "postal-code", p_limit: RATE_LIMIT, p_window_sec: RATE_WINDOW_SEC }));
  }
  return localLimiter(clientKey(auth.userId, headers));
}

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth.allowed) return fail("ログインが必要です。", 401);
  const rate = await checkRate(auth, req.headers);
  if (!rate.ok) return fail("短時間に呼び出しが集中しています。しばらくしてから、もう一度お試しください。", 429, { "Retry-After": String(rate.retryAfterSec) });
  const text = await req.text();
  if (byteLength(text) > MAX_BODY) return fail("入力が大きすぎます。", 413);
  let zip: string | null = null;
  try {
    const raw = JSON.parse(text) as { zip?: unknown };
    zip = typeof raw?.zip === "string" ? toPostalDigits(raw.zip) : null;
  } catch {
    zip = null;
  }
  if (!zip) return fail("郵便番号は、7桁の数字で入力してください。", 400);
  // 日本郵便へ送るのは、郵便番号のみ。接続元 IP は、必須ヘッダー x-forwarded-for 用（値の扱いは確認事項）
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  if (!clientIp) return Response.json({ status: "unavailable" });
  return Response.json(await lookupAddress(zip, clientIp), { headers: { "Cache-Control": "no-store" } });
}
