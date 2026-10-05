import { createClient } from "@supabase/supabase-js";
import { fillOfficialExcel } from "../../../../lib/documents/excelFill";
import { parseFillInput } from "../../../../lib/documents/excelFill/input";
import { byteLength, checkSharedRateLimit, clientKey, createRateLimiter, isDeclaredTooLarge, MAX_BODY_BYTES } from "../../../../lib/documents/officialFormGuard";
import { isSupabaseEnabled } from "../../../../lib/supabase";
import { supabaseKey, supabaseUrl } from "../../../../lib/env";

// 公式様式（Excel）への差し込み。fillOfficialExcel は node:fs でテンプレートを読むため、Node.js ランタイム専用。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 10;
const RATE_WINDOW_SEC = 60;
// Supabase 未設定のローカル（データを保存しない）用。設定済みの環境では、共有ストアで数える。
const localLimiter = createRateLimiter(RATE_LIMIT, RATE_WINDOW_SEC * 1000);

type Auth = { allowed: false } | { allowed: true; userId: string | null; token: string | null };

/**
 * 呼び出しの可否。Supabase 設定済みの環境では、アクセストークンの検証のみで通す（X-Demo-Mode は無視する）。
 * Supabase 未設定のローカル（ブラウザ内の仮データ）は、このAPIがデータを保存・参照しないため、そのまま通す。
 */
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

/** Supabase 設定済みなら、共有ストア（ユーザー単位）。未設定なら、プロセス内メモリ（IP 単位）。 */
async function checkRate(auth: { userId: string | null; token: string | null }, headers: Headers) {
  if (auth.token && supabaseUrl && supabaseKey) {
    // 利用者のトークンで呼ぶ（関数側が auth.uid() でキーを決めるため、他人の枠は使えない）
    const client = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${auth.token}` } } });
    return checkSharedRateLimit(() => client.rpc("check_rate_limit", { p_scope: "official-form", p_limit: RATE_LIMIT, p_window_sec: RATE_WINDOW_SEC }));
  }
  return localLimiter(clientKey(auth.userId, headers));
}

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (!auth.allowed) return fail("ログインが必要です。", 401);
  const rate = await checkRate(auth, req.headers);
  if (!rate.ok) return fail("短時間に呼び出しが集中しています。しばらくしてから、もう一度お試しください。", 429, { "Retry-After": String(rate.retryAfterSec) });
  if (isDeclaredTooLarge(req.headers.get("content-length"))) return fail("入力が大きすぎます。", 413);
  const text = await req.text();
  if (byteLength(text) > MAX_BODY_BYTES) return fail("入力が大きすぎます。", 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("入力の形式が正しくありません。", 400);
  }
  const input = parseFillInput(raw);
  if (!input) return fail("入力の形式が正しくありません。", 400);
  try {
    const { buffer, warnings } = await fillOfficialExcel(input);
    return Response.json({ warnings, xlsxBase64: buffer.toString("base64") });
  } catch {
    // 内容（個人情報を含む）は、エラーメッセージに含めない
    return fail("エクセルの生成に失敗しました。時間をおいて、もう一度お試しください。", 500);
  }
}
