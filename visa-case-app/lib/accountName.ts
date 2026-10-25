/**
 * ログイン中の本人の氏名（Supabase Auth の user_metadata.full_name に保存する）の読み取りと検査。
 * 画面に依存しない純粋な関数だけを置く。データベースの表は使わない。
 */

/** user_metadata のキー */
export const FULL_NAME_KEY = "full_name";

/** 氏名の最大文字数（UTF-16 の長さ） */
export const FULL_NAME_MAX = 100;

/** user_metadata から、登録済みの氏名を取り出す。未登録・文字以外・空白のみなら空文字 */
export function readFullName(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";
  const v = (metadata as Record<string, unknown>)[FULL_NAME_KEY];
  return typeof v === "string" ? v.trim() : "";
}

/** 制御文字（C0・C1、行・段落の区切り）。エスケープで書く */
const CONTROL = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]");

export type FullNameCheck = { ok: true; value: string } | { ok: false; reason: "empty" | "tooLong" | "control" };

/** 入力された氏名を検査する。前後の空白（全角を含む）は取り除く。制御文字（改行など）は受け付けない */
export function checkFullName(input: string): FullNameCheck {
  const value = input.trim();
  if (!value) return { ok: false, reason: "empty" };
  if (CONTROL.test(value)) return { ok: false, reason: "control" };
  if (value.length > FULL_NAME_MAX) return { ok: false, reason: "tooLong" };
  return { ok: true, value };
}

/**
 * ログイン中の本人の表示名の規則（PC 版ヘッダーなど）。氏名が登録済みなら氏名のみ（入力されたまま。姓名の分割はしない）、
 * 未登録のときだけメールアドレス。両方を並べない。表示の規則はここ 1 か所に置く。
 */
export function accountDisplayLabel(metadata: unknown, email: string | null | undefined): string {
  return readFullName(metadata) || (email ?? "");
}
