import { isValidDate } from "./format";

/** 日付欄の入力文字列の状態 */
export type DateTextState =
  | { kind: "empty" }
  | { kind: "incomplete" }
  | { kind: "complete"; iso: string; valid: boolean };

/** 日付が正しくないときの案内（日付欄の下に出す） */
export const DATE_INVALID_MESSAGE = "存在する日付を、年4桁・月・日の順に入力してください（例：2000/01/31）。";

const FULL_WIDTH_DIGITS = /[０-９]/g;
const SEPARATORS = /[/／\-－―ー.．・年月日\s]+/g;

/**
 * 入力された文字を整える。全角数字は半角にし、区切りは「/」に統一する。
 * 区切りなしで数字だけを入力した場合は、年（4桁）・月・日の区切りを自動で入れる。
 */
export function normalizeDateText(raw: string): string {
  const half = raw.replace(FULL_WIDTH_DIGITS, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const hasSeparator = /[^0-9]/.test(half);
  if (!hasSeparator) {
    const d = half.slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return `${d.slice(0, 4)}/${d.slice(4)}`;
    return `${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6)}`;
  }
  const cleaned = half.replace(SEPARATORS, "/").replace(/[^0-9/]/g, "");
  const limits = [4, 2, 2];
  const fields = [""];
  for (const ch of cleaned) {
    const last = fields.length - 1;
    if (ch === "/") {
      if (fields[last] !== "" && fields.length < 3) fields.push("");
      continue;
    }
    // 桁が埋まったら次の項目へ進む（自動で入れた「/」のあとに続けて打った数字を失わない）
    if (fields[last].length >= limits[last] && fields.length < 3) fields.push("");
    const i = fields.length - 1;
    if (fields[i].length < limits[i]) fields[i] += ch;
  }
  return fields.join("/");
}

/** 入力文字列を、保存形式（YYYY-MM-DD）へ。月・日は1桁でもよい */
export function parseDateText(text: string): DateTextState {
  const t = normalizeDateText(text);
  if (t === "") return { kind: "empty" };
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(t);
  if (!m) return { kind: "incomplete" };
  const iso = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return { kind: "complete", iso, valid: isValidDate(iso) };
}

/** 保存形式の値を、入力欄に出す文字列へ。保存形式でない値は、そのまま出す */
export function dateValueToText(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.replaceAll("-", "/") : value;
}
