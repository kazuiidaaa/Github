import { createClient } from "@supabase/supabase-js";
import { fillOfficialExcel } from "../../../../lib/documents/excelFill";
import { parseFillInput } from "../../../../lib/documents/excelFill/input";
import { isSupabaseEnabled } from "../../../../lib/supabase";
import { supabaseKey, supabaseUrl } from "../../../../lib/env";

// 公式様式（Excel）への差し込み。fillOfficialExcel は node:fs でテンプレートを読むため、Node.js ランタイム専用。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_000_000;

/**
 * ログイン済みか。Supabase 設定済みの環境では、アクセストークンを検証する。
 * デモモード（ブラウザ内の仮データ）は、ヘッダー X-Demo-Mode で示す。このAPIはデータを保存・参照せず、
 * 受け取った値をファイルへ差し込んで返すだけのため、デモ値で呼べても漏れる情報はない。
 */
async function isAllowed(req: Request): Promise<boolean> {
  if (!isSupabaseEnabled) return true;
  if (req.headers.get("x-demo-mode") === "1") return true;
  const token = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token || !supabaseUrl || !supabaseKey) return false;
  const { data, error } = await createClient(supabaseUrl, supabaseKey).auth.getUser(token);
  return !error && !!data.user;
}

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!(await isAllowed(req))) return fail("ログインが必要です。", 401);
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return fail("入力が大きすぎます。", 413);
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
