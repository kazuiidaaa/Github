import type { FormDetails } from "../../formDetails";

// 特定活動（研究活動等。告示36号）の案件に付ける注意（Issue #299）。様式Nの所属機関等作成用1の、この在留資格に固有の項目に関するもの。

/** 様式Nの「職種一覧」の注記による、特定研究等活動（告示36号）・特定情報処理活動（告示37号）で選べる職種の番号 */
const ALLOWED_OCCUPATION_CODES = new Set([12, 42, 43, 44, 999]);

/** 認定・変更・更新の差し込み結果に加える注意。isTokuteiKenkyu は、isFormNTokuteiCase（lib/hspForm.ts）の判定結果 */
export function tokuteiKenkyuWarnings(isTokuteiKenkyu: boolean, f: Pick<FormDetails, "occupationCode">): string[] {
  if (!isTokuteiKenkyu) return [];
  const w = ["特定活動（研究活動等）の「所属機関等作成用1」の「4 研究室」は、案件情報に項目がないため差し込んでいません。研究室に所属する場合は、様式上で記入してください。"];
  const code = f.occupationCode.trim();
  if (/^\d{1,3}$/.test(code) && !ALLOWED_OCCUPATION_CODES.has(Number(code))) {
    w.push("職種の番号は、特定活動（特定研究等活動・告示36号）では、別紙「職種一覧」の12、42〜44、999から選択します。案件の職種の番号を確認してください。");
  }
  return w;
}
