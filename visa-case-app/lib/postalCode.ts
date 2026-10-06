// 郵便番号（日本）の入力の扱い。数字の7桁として扱う。ハイフン・空白・全角数字は受け付ける。

export const POSTAL_CODE_LENGTH = 7;

/** 全角数字を半角にし、ハイフン類と空白を取り除く */
export function normalizePostalCode(input: string): string {
  return input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s\-‐‑‒–—―−－ーｰ˗‑]/g, "");
}

export type PostalCodeState = "empty" | "partial" | "complete" | "invalid";

/** 入力の状態。空・入力途中（7桁未満）・7桁・不正（数字以外を含む、または8桁以上）を区別する */
export function postalCodeState(input: string): PostalCodeState {
  const digits = normalizePostalCode(input);
  if (digits === "") return "empty";
  if (!/^\d+$/.test(digits) || digits.length > POSTAL_CODE_LENGTH) return "invalid";
  return digits.length === POSTAL_CODE_LENGTH ? "complete" : "partial";
}

/** 7桁の数字を返す。7桁でなければ null */
export function toPostalDigits(input: string): string | null {
  return postalCodeState(input) === "complete" ? normalizePostalCode(input) : null;
}

export type FillAction = "fill" | "confirm" | "same";

/** 見つかった住所の扱い。未入力は入れる、入力済みは確認を挟む、すでに含まれていれば何もしない */
export function decideFill(existing: string, found: string): FillAction {
  const current = existing.trim();
  if (current === "") return "fill";
  if (current.startsWith(found)) return "same";
  return "confirm";
}
