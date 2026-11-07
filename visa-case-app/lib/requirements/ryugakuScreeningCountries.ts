// 在留資格「留学」の在留期間更新許可申請の提出書類一覧表にある「別表掲載国・地域」（入管庁が慎重審査対象国として指定する告示
// 「ryugaku-careful-screening-countries.pdf」で、別表に掲げる国・地域以外を対象とする、と定めるもの）の掲載国・地域の一覧。
//
// 【要確認】この一覧は未入手です。入管庁のページ／PDFの原文を、リポジトリ内のどこからも取得できていません（Issue #496）。
// 行政書士が入管庁のページ・PDFの原文を確認し、実際の国・地域名をここに追加してください。
// 推測・捏造した国名を入れてはいけません。一覧が空のままである間は、classifyNationality は常に "unknown" を返し、
// 呼び出し側（lib/requirements/evaluate.ts）は従来どおりの「要確認」表示（列ごとの要否を注記に書く）にフォールバックします。
export const LISTED_COUNTRIES: string[] = [];

/**
 * 国籍の自由入力文字列を、比較用に正規化する。前後の空白、全角/半角、区切り記号（・/中点など）、大小文字の違いを吸収する。
 * 多言語表記の違い（英語表記・現地語表記など）までは吸収しない（別表の一覧が整備されたときに、必要なら表記のゆれを一覧側で持つ）。
 */
function normalizeNationality(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[\s・･,、]/g, "")
    .toLowerCase();
}

/**
 * 国籍の自由入力文字列から、「別表掲載国・地域」か否かを判定する。
 * - listedCountries が空（未整備）、または nationality が未入力のときは、判定できないため "unknown"。
 * - listedCountries に正規化後の文字列が一致すれば "listed"。
 * - listedCountries が整備されていて一致しなければ、別表の定め（別表掲載国・地域以外を対象とする）により "other" と確定できる。
 * listedCountries は、既定では LISTED_COUNTRIES（本番データ）。試験では、ダミーの一覧を渡して検証する。
 */
export function classifyNationality(nationality: string, listedCountries: string[] = LISTED_COUNTRIES): "listed" | "other" | "unknown" {
  if (listedCountries.length === 0) return "unknown";
  const normalized = normalizeNationality(nationality);
  if (normalized === "") return "unknown";
  const normalizedList = listedCountries.map(normalizeNationality);
  return normalizedList.includes(normalized) ? "listed" : "other";
}
