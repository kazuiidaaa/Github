import { HSP_POINT_SHEETS, type HspPointRow, type HspPointSheetKey } from "./hspPointRows";
import { ADVANCED_PROFESSIONAL_GRADE_2 } from "./types";

export { HSP_POINT_SHEETS };
export type { HspPointRow, HspPointSheetKey };

/** 高度専門職の合格の基準（ポイントの合計） */
export const HSP_PASS_POINTS = 70;

/** 号から、使うシートを決める。2号・号が未選択の場合は、案件で選ぶシート（override）を使う */
const GRADE_SHEET: Record<string, HspPointSheetKey> = {
  "高度専門職（1号イ）": "A",
  "高度専門職（1号ロ）": "B",
  "高度専門職（1号ハ）": "C",
};

export type HspPointSheetResolution =
  | { kind: "not_applicable" }
  | { kind: "resolved"; sheet: HspPointSheetKey; fromGrade: boolean }
  | { kind: "needs_choice" };

export function resolveHspPointSheet(status: string, override: string): HspPointSheetResolution {
  const s = status.trim();
  const byGrade = GRADE_SHEET[s];
  if (byGrade) return { kind: "resolved", sheet: byGrade, fromGrade: true };
  // 「高度専門職」（号が未選択）と2号は、使うシートを案件で選ぶ（2号の変更は、1号イ・ロ・ハのいずれかのシートを使う）
  if (s !== "高度専門職" && s !== ADVANCED_PROFESSIONAL_GRADE_2) return { kind: "not_applicable" };
  return override === "A" || override === "B" || override === "C" ? { kind: "resolved", sheet: override, fromGrade: false } : { kind: "needs_choice" };
}

/** チェックの保存値。シートごとに行が異なるため、「シート:行」で持つ（例：「B:20」） */
export const pointCheckId = (sheet: HspPointSheetKey, row: number) => `${sheet}:${row}`;

export function checkedRows(sheet: HspPointSheetKey, checks: readonly string[]): HspPointRow[] {
  const set = new Set(checks);
  return HSP_POINT_SHEETS[sheet].rows.filter((r) => set.has(pointCheckId(sheet, r.row)));
}

/** 択一の区分（同じ区分で2つ以上選ぶと、通常は誤り） */
const EXCLUSIVE_SECTIONS = ["職歴", "年収", "年齢", "地位"];

export interface HspPointEstimate {
  /** 選んだ項目の、様式に印字された点数の単純合計 */
  total: number;
  /** 印字された点数がなく、合計に含めていない項目 */
  unscored: HspPointRow[];
  reachesPass: boolean;
  notes: string[];
  /** 様式の合計欄へ、合計点を書き込んでよいか。項目を選んでいて、点数の印字がない項目と、択一の区分の重複がないときだけ true */
  totalWritable: boolean;
}

/**
 * 目安の合計点。選んだ項目に印字された点数の単純合計。
 * 様式の合計欄へは、totalWritable のときだけ書き込む（点数の印字がない項目や、択一の区分の重複があるときは、行政書士が確認して記入する）。
 * 研究実績の2つ以上の組み合わせ、特別加算の上限、年齢による年収の範囲などは判定しない（行政書士が、計算表の欄で確認する）。
 */
export function estimateHspPoints(sheet: HspPointSheetKey, checks: readonly string[]): HspPointEstimate {
  const rows = checkedRows(sheet, checks);
  const total = rows.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const unscored = rows.filter((r) => r.points === null);
  const notes: string[] = [];
  let duplicated = false;
  for (const section of EXCLUSIVE_SECTIONS) {
    if (rows.filter((r) => r.section === section).length > 1) {
      duplicated = true;
      notes.push(`「${section}」は、1つだけ選ぶ項目です。複数選んでいます。`);
    }
  }
  if (unscored.length > 0) notes.push(`点数が印字されていない項目（${unscored.map((r) => r.label.slice(0, 12)).join("、")}…）は、合計に含めていません。計算表で点数を確認してください。`);
  if (rows.length > 0 && !rows.some((r) => r.section === "年収")) notes.push("年収が未選択です。年収が300万円に満たないときは、他の項目の合計が70点以上でも、高度専門職外国人としては認められません。");
  return { total, unscored, reachesPass: total >= HSP_PASS_POINTS, notes, totalWritable: rows.length > 0 && unscored.length === 0 && !duplicated };
}

/** ダウンロード前の確認で表示する注意（画面の確認ダイアログ用）。合計欄の書き込み有無と、判定していない事項、行政書士の確認を知らせる */
export function hspPointConfirmLines(est: HspPointEstimate): string[] {
  return [
    est.totalWritable
      ? `合計欄へ、選んだ項目の印字点数の単純合計 ${est.total} 点を書き込みます。`
      : "合計欄は書き込みません。計算表で確認し、様式上で記入してください。",
    "研究実績の2つ以上の組み合わせ・特別加算の上限・年齢による年収の範囲は、判定していません。",
    ...est.notes,
    "作成したファイルは、行政書士が内容を確認してから使用してください。",
  ];
}

/** 保存値から、存在しないチェック（様式の改正や、別シートの値）を除く */
export function sanitizePointChecks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(
    (Object.keys(HSP_POINT_SHEETS) as HspPointSheetKey[]).flatMap((k) => HSP_POINT_SHEETS[k].rows.map((r) => pointCheckId(k, r.row))),
  );
  return [...new Set(raw.filter((v): v is string => typeof v === "string" && valid.has(v)))];
}

/** 疎明資料の番号ごとの、計算表の項目と、疎明資料（基本例）。表は docs/hsp-point-evidence.md と同じ。番号と細目は、計算表の注記が正 */
export const HSP_EVIDENCE: Record<string, { item: string; document: string }> = {
  "①": { item: "学歴", document: "該当する学歴の卒業証明書・学位取得の証明書（⑱を提出する場合は不要）" },
  "②": { item: "職歴", document: "従事しようとする業務の従事期間・内容を明らかにする資料（所属していた機関作成のもの）" },
  "③": { item: "年収", document: "年収（契約機関・外国所属機関から受ける報酬の年額）を証する文書" },
  "④": { item: "研究実績（特許）", document: "特許証の写し等" },
  "⑤": { item: "研究実績（外国政府の補助金等を受けた研究）", document: "交付決定書の写し等" },
  "⑥": { item: "研究実績（論文3本以上）", document: "論文のタイトル・著者名・掲載誌等を記載した文書（様式自由）。責任著者又は筆頭著者のものに限る" },
  "⑦": { item: "研究実績（その他法務大臣が認めるもの）", document: "左記を証する文書" },
  "⑧": { item: "資格", document: "日本の国家資格・IT告示の試験の合格証明書の写し等" },
  "⑨": { item: "特別加算（イノベーション促進支援措置）", document: "補助金交付決定通知書の写し等" },
  "⑩": { item: "特別加算（中小企業者）", document: "主たる事業を確認できる資料、資本金・従業員数を証する文書" },
  "⑪": { item: "特別加算（国際競争力強化等の地方公共団体の支援措置）", document: "補助金交付決定通知書の写し等" },
  "⑫": { item: "特別加算（試験研究費等が3％超の中小企業者）", document: "財務諸表の写し等" },
  "⑬": { item: "特別加算（外国の資格・表彰等）", document: "左記を証する文書" },
  "⑭": { item: "特別加算（日本の大学等の卒業・修了）", document: "卒業証明書・学位取得の証明書" },
  "⑮": { item: "特別加算（日本語能力）", document: "卒業証明書・合格証明書等の写し" },
  "⑯": { item: "特別加算（成長分野の先端プロジェクトに従事）", document: "補助金交付通知書の写し、所属機関の説明資料" },
  "⑰": { item: "特別加算（指定の大学の卒業）", document: "大学が該当することを証する資料、卒業証明書又は学位取得の証明書" },
  "⑱": { item: "特別加算（イノベーティブ・アジア事業の研修修了）", document: "JICAの研修修了証明書" },
  "⑲": { item: "本邦で事業を経営し、1億円以上を投資", document: "資本金又は出資額を証する資料（株主名簿等）" },
  "⑳": { item: "地位（活動機関の代表取締役・取締役等）", document: "左記であることを証する文書" },
  "㉑": { item: "特別加算（投資運用業等に従事）", document: "所属機関の登録等を証する文書" },
};

const EVIDENCE_MARKS = Object.keys(HSP_EVIDENCE);

/**
 * 選んだチェック欄から導く、疎明資料の番号（番号順、重複なし）。
 * 計算表の項目（資格・投資運用業等）のうち、チェック欄を持たないもの（⑧・㉑）は、導かれない。
 */
export function evidenceNumbers(sheet: HspPointSheetKey, checks: readonly string[]): string[] {
  const found = new Set<string>();
  for (const r of checkedRows(sheet, checks)) for (const m of r.evidence.split(" ")) if (m !== "") found.add(m);
  return EVIDENCE_MARKS.filter((m) => found.has(m));
}
