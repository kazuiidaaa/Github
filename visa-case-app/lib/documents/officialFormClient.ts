"use client";

import { AppError } from "../errors";
import { isDemo } from "../demo";
import { supabase, usesSupabase } from "../supabase";
import { OFFICIAL_FORM_LOGIN_REQUIRED, officialFormNeedsLogin } from "./officialFormAccess";
import type { CaseRecord } from "../types";
import type { OfficialFormContent } from "./types";

// 画面側から、公式様式（Excel）の生成 API（app/api/documents/official-form）を呼ぶ。

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type FormInput = OfficialFormContent["input"];

function base64ToBlob(b64: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: XLSX_MIME });
}

/** 入力値からエクセルを作る。warnings は、差し込みエンジンと対象範囲の注意 */
export async function requestOfficialXlsx(
  procedureType: CaseRecord["procedureType"],
  input: FormInput,
): Promise<{ blob: Blob; warnings: string[] }> {
  // Supabase 設定済みのデモモードは、サーバーが必ず 401 にするため、送信せずに案内する（Issue #120）
  if (officialFormNeedsLogin(isDemo())) throw new AppError(OFFICIAL_FORM_LOGIN_REQUIRED);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (usesSupabase() && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  } else if (isDemo()) {
    headers["X-Demo-Mode"] = "1";
  }
  let res: Response;
  try {
    res = await fetch("/api/documents/official-form", { method: "POST", headers, body: JSON.stringify({ procedureType, ...input }) });
  } catch {
    throw new AppError("エクセルの生成に接続できませんでした。通信状況をご確認ください。");
  }
  const body = (await res.json().catch(() => null)) as { error?: string; warnings?: string[]; xlsxBase64?: string } | null;
  if (!res.ok || !body?.xlsxBase64) throw new AppError(body?.error ?? "エクセルの生成に失敗しました。");
  return { blob: base64ToBlob(body.xlsxBase64), warnings: body.warnings ?? [] };
}
