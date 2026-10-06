import { formatDate } from "../../format";
import type { FormDetails } from "../../formDetails";
import type { Applicant, EmploymentInfo } from "../../types";

/**
 * 公式の在留期間更新許可申請書（別記第三十号の二様式・Excel）の「入力欄」のセル座標と、案件DBの対応表。
 *
 * 項目番号・項目名・取得元は lib/documents/formMapping.ts の SHEETS に合わせている。
 * 座標の特定方法・シート名の扱い・対象外の項目は docs/phase11-fill-engines.md（更新編） に記録している。
 * 様式が改正された場合は、docs の手順で座標を再特定し、このファイルを更新する（tests も更新する）。
 */

export interface FillCtx {
  a: Applicant;
  e: EmploymentInfo;
  f: FormDetails;
  /** 案件の「希望する在留資格」。認定（COE）の項目11「入国目的」チェックの判定にのみ使う。更新・変更は設定しない */
  targetStatus?: string;
}

/** 1つのセルへ文字列を書き込む定義。結合セルは、左上のセルを指定する */
export interface FillItem {
  /** 公式様式の項目番号（formMapping.ts と同じ表記） */
  no: string;
  label: string;
  /** テンプレートのシート名（空白・全角半角の差は無視して照合する。sheetKey を参照） */
  sheet: string;
  cell: string;
  /** 空文字なら書き込まない（テンプレートの元の状態のまま） */
  get: (c: FillCtx) => string;
}

/**
 * 「該当する選択肢を残す」方式の項目。公式様式の性別・配偶者の有無は、
 * 入力用のセルがなく、印刷された選択肢（男・女、有・無）から選ぶ書式のため、
 * 選ばれた値に応じて、複数のセルの文字を書き換える。値が空なら何も変更しない。
 */
export interface PickItem {
  no: string;
  label: string;
  sheet: string;
  get: (c: FillCtx) => string;
  /** 値 → { セル: 書き込む文字列 } */
  writes: Record<string, Record<string, string>>;
}

/** 桁数が決まっている番号欄の検証用（桁数が合わない場合に、警告を出す） */
export interface DigitCheck {
  label: string;
  length: number;
  get: (c: FillCtx) => string;
}

export const SHEET_APPLICANT_1 = "申請人用（更新）１";
export const SHEET_APPLICANT_2 = "申請人用２Ｎ";
export const SHEET_ORG_1 = "所属機関用１Ｎ";
export const SHEET_ORG_2 = "所属機関用２N";

/** シート名の照合キー。全角半角・空白（末尾の全角空白を含む）の差を無視する */
export const sheetKey = (name: string) => name.normalize("NFKC").replace(/\s/g, "");

export const digitsOf = (v: string) => v.normalize("NFKC").replace(/\D/g, "");

const date = (v: string) => (v ? formatDate(v) : "");

/** YYYY-MM-DD（または YYYY-MM）の、年・月・日の部分。先頭のゼロは除く */
function datePart(v: string, part: "y" | "m" | "d"): string {
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(v.trim());
  if (!m) return "";
  const s = part === "y" ? m[1] : part === "m" ? m[2] : m[3];
  return s ? String(Number(s)) : "";
}

const only = (re: RegExp, v: string) => (re.test(v.trim()) ? v.trim() : "");

const item = (no: string, label: string, sheet: string, cell: string, get: (c: FillCtx) => string): FillItem => ({
  no,
  label,
  sheet,
  cell,
  get,
});

/** 年・月・日に分かれた日付欄 */
const dateItems = (no: string, label: string, sheet: string, cells: { y: string; m: string; d?: string }, get: (c: FillCtx) => string): FillItem[] => [
  item(no, `${label}（年）`, sheet, cells.y, (c) => datePart(get(c), "y")),
  item(no, `${label}（月）`, sheet, cells.m, (c) => datePart(get(c), "m")),
  ...(cells.d ? [item(no, `${label}（日）`, sheet, cells.d, (c) => datePart(get(c), "d"))] : []),
];

/** 1桁ずつ分かれた番号欄。cells の並びの順に、数字を1文字ずつ書き込む */
const digitItems = (no: string, label: string, sheet: string, cells: string[], get: (c: FillCtx) => string): FillItem[] =>
  cells.map((cell, i) => item(no, `${label}（${i + 1}桁目）`, sheet, cell, (c) => digitsOf(get(c))[i] ?? ""));

const colRange = (from: string, to: string): string[] => {
  const n = (s: string) => [...s].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0);
  const s = (k: number) => {
    let out = "";
    for (let x = k; x > 0; x = Math.floor((x - 1) / 26)) out = String.fromCharCode(65 + ((x - 1) % 26)) + out;
    return out;
  };
  return Array.from({ length: n(to) - n(from) + 1 }, (_, i) => s(n(from) + i));
};

// ---- 申請人等作成用1 ----------------------------------------------------
const S1 = SHEET_APPLICANT_1;
const RELATIVE_ROWS = [64, 66, 68, 70, 72, 74];
export const MAX_RELATIVES = RELATIVE_ROWS.length;

const relativeItems: FillItem[] = RELATIVE_ROWS.flatMap((row, i) => {
  const r = (c: FillCtx) => (c.f.relativesPresent === "yes" ? c.f.relatives[i] : undefined);
  const label = `在日親族（${i + 1}人目）`;
  return [
    item("16", `${label} 続柄`, S1, `A${row}`, (c) => r(c)?.relationship ?? ""),
    item("16", `${label} 氏名`, S1, `D${row}`, (c) => r(c)?.name ?? ""),
    item("16", `${label} 生年月日`, S1, `M${row}`, (c) => date(r(c)?.dateOfBirth ?? "")),
    item("16", `${label} 国籍・地域`, S1, `Q${row}`, (c) => r(c)?.nationality ?? ""),
    item("16", `${label} 勤務先名称・通学先名称`, S1, `X${row}`, (c) => r(c)?.workplace ?? ""),
    item("16", `${label} 在留カード番号`, S1, `AE${row}`, (c) => r(c)?.cardNumber ?? ""),
  ];
});

// ---- 申請人等作成用2（N） ----------------------------------------------
const S2 = SHEET_APPLICANT_2;
/** 職歴の欄は6件。左の列を上から下へ、続いて右の列を上から下へ並べる（入社年・入社月・退社年・退社月・勤務先名称の列） */
const WORK_SLOTS = [
  { row: 49, cols: ["A", "C", "E", "G", "I"] },
  { row: 51, cols: ["A", "C", "E", "G", "I"] },
  { row: 53, cols: ["A", "C", "E", "G", "I"] },
  { row: 49, cols: ["S", "U", "W", "Y", "AA"] },
  { row: 51, cols: ["S", "U", "W", "Y", "AA"] },
  { row: 53, cols: ["S", "U", "W", "Y", "AA"] },
];
export const MAX_WORK_HISTORY = WORK_SLOTS.length;

const workItems: FillItem[] = WORK_SLOTS.flatMap((s, i) => {
  const w = (c: FillCtx) => c.f.workHistory[i];
  const label = `職歴（${i + 1}行目）`;
  const [jy, jm, ly, lm, name] = s.cols.map((col) => `${col}${s.row}`);
  return [
    item("21", `${label} 入社（年）`, S2, jy, (c) => datePart(w(c)?.joinedOn ?? "", "y")),
    item("21", `${label} 入社（月）`, S2, jm, (c) => datePart(w(c)?.joinedOn ?? "", "m")),
    item("21", `${label} 退社（年）`, S2, ly, (c) => datePart(w(c)?.leftOn ?? "", "y")),
    item("21", `${label} 退社（月）`, S2, lm, (c) => datePart(w(c)?.leftOn ?? "", "m")),
    item("21", `${label} 勤務先名称`, S2, name, (c) => w(c)?.employer ?? ""),
  ];
});

// ---- 所属機関等作成用1（N）・2（N） -------------------------------------
const O1 = SHEET_ORG_1;
const O2 = SHEET_ORG_2;
const CORP_CELLS_O1 = colRange("T", "AF").map((c) => `${c}24`); // 13桁
const INS_CELLS_O1 = ["E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "Q"].map((c) => `${c}32`); // 4-6-1
const CORP_CELLS_O2 = colRange("R", "AD").map((c) => `${c}12`); // 13桁
const INS_CELLS_O2 = ["C", "D", "E", "F", "H", "I", "J", "K", "L", "M", "O"].map((c) => `${c}21`); // 4-6-1

/** 活動内容詳細の欄は2行（1行ずつの結合セル）。改行で区切り、3行目以降は2行目に続ける */
export const JOB_DESCRIPTION_LINES = 2;
export const jobDescriptionLines = (v: string): string[] => {
  const lines = v.split(/\r?\n/).filter((l) => l.trim() !== "");
  return [lines[0] ?? "", lines.slice(1).join(" ")];
};

export const RENEWAL_FILL_ITEMS: FillItem[] = [
  // 申請人等作成用1
  item("1", "国籍・地域", S1, "G15", (c) => c.a.nationality),
  ...dateItems("2", "生年月日", S1, { y: "W15", m: "AC15", d: "AG15" }, (c) => c.a.dateOfBirth),
  item("3", "氏名", S1, "G18", (c) => c.a.legalName),
  item("6", "職業", S1, "E24", (c) => c.f.occupation),
  item("7", "本国における居住地", S1, "U24", (c) => c.f.homeAddress),
  item("8", "住居地", S1, "G27", (c) => c.a.address),
  item("9", "電話番号", S1, "G30", (c) => c.f.phone),
  item("9", "携帯電話番号", S1, "Y30", (c) => c.f.mobilePhone),
  item("10", "旅券（1）番号", S1, "I33", (c) => c.f.passportNumber),
  ...dateItems("10", "旅券（2）有効期限", S1, { y: "X33", m: "AD33", d: "AH33" }, (c) => c.f.passportExpiry),
  item("11", "現に有する在留資格", S1, "I36", (c) => c.a.residenceStatus),
  item("11", "在留期間", S1, "Z36", (c) => c.f.periodOfStay),
  ...dateItems("11", "在留期間の満了日", S1, { y: "I39", m: "O39", d: "S39" }, (c) => c.a.residenceExpiryDate),
  item("12", "在留カード番号", S1, "I42", (c) => c.a.residenceCardNumber),
  item("13", "希望する在留期間", S1, "I45", (c) => c.f.desiredPeriod),
  item("14", "更新の理由", S1, "I48", (c) => c.f.renewalReason),
  item("15", "犯罪を理由とする処分（具体的内容）", S1, "I53", (c) => (c.f.criminalRecord === "yes" ? c.f.criminalDetail : "")),
  ...relativeItems,

  // 申請人等作成用2（N）
  item("17", "勤務先（1）名称", S2, "E9", (c) => c.e.companyName),
  item("17", "勤務先 支店・事業所名", S2, "W9", (c) => c.f.branchName),
  item("17", "勤務先（2）所在地", S2, "F11", (c) => c.e.companyAddress),
  item("17", "勤務先（3）電話番号", S2, "Z11", (c) => c.f.workPhone),
  item("18", "最終学歴（3）学校名", S2, "G20", (c) => c.f.schoolName),
  ...dateItems("18", "最終学歴（4）卒業年月日", S2, { y: "W20", m: "AA20", d: "AE20" }, (c) => c.f.graduationDate),
  item("20", "情報処理技術者資格・試験の名称", S2, "O42", (c) => c.f.itQualification),
  ...workItems,
  item("22", "代理人（1）氏名", S2, "E56", (c) => c.f.legalRepName),
  item("22", "代理人（2）本人との関係", S2, "AB56", (c) => c.f.legalRepRelationship),
  item("22", "代理人（3）住所", S2, "F58", (c) => c.f.legalRepAddress),
  item("22", "代理人 電話番号", S2, "G60", (c) => c.f.legalRepPhone),
  item("取次者", "取次者（1）氏名", S2, "E74", (c) => c.f.agentName),
  item("取次者", "取次者（2）住所", S2, "S74", (c) => c.f.agentAddress),
  item("取次者", "取次者（3）所属機関等", S2, "C79", (c) => c.f.agentAffiliation),
  item("取次者", "取次者 電話番号", S2, "AA79", (c) => c.f.agentPhone),

  // 所属機関等作成用1（N）
  item("1", "契約又は招へいしている外国人の氏名", O1, "G9", (c) => c.a.legalName),
  item("3", "（1）名称", O1, "G24", (c) => c.e.companyName),
  ...digitItems("3", "（2）法人番号", O1, CORP_CELLS_O1, (c) => c.f.corporateNumber),
  item("3", "（3）支店・事業所名", O1, "J27", (c) => c.f.branchName),
  ...digitItems("3", "（4）雇用保険適用事業所番号", O1, INS_CELLS_O1, (c) => c.f.employmentInsuranceNumber),
  item("3", "（5）業種（番号）", O1, "AD36", (c) => only(/^\d{1,3}$/, c.e.industry)),
  item("3", "（6）所在地", O1, "H43", (c) => c.e.companyAddress),
  item("3", "（6）電話番号", O1, "AB43", (c) => c.f.orgPhone),
  item("3", "（7）資本金", O1, "H46", (c) => c.e.capital),
  item("3", "（8）年間売上高", O1, "AC46", (c) => c.f.annualSales),
  item("3", "（9）従業員数", O1, "K49", (c) => c.e.employeeCount),
  item("3", "（9）外国人職員数", O1, "N51", (c) => c.f.foreignStaffCount),
  ...dateItems("5", "雇用開始（入社）年月日", O1, { y: "E59", m: "H59", d: "K59" }, (c) => c.e.employmentStartDate),
  item("6", "給与・報酬（税引き前）", O1, "D66", (c) => c.e.monthlySalary),
  item("7", "実務経験年数", O1, "K69", (c) => c.f.experienceYears),
  item("8", "職務上の地位（役職名）", O1, "AB69", (c) => c.f.positionTitle),
  item("9", "職種（番号）", O1, "AG72", (c) => only(/^\d{1,3}$/, c.f.occupationCode)),
  item("10", "活動内容詳細（1行目）", O1, "D100", (c) => jobDescriptionLines(c.e.jobDescription)[0]),
  item("10", "活動内容詳細（2行目）", O1, "D101", (c) => jobDescriptionLines(c.e.jobDescription)[1]),

  // 所属機関等作成用2（N）
  item("11", "派遣先（1）名称", O2, "E12", (c) => c.f.dispatchName),
  ...digitItems("11", "派遣先（2）法人番号", O2, CORP_CELLS_O2, (c) => c.f.dispatchCorporateNumber),
  item("11", "派遣先（3）支店・事業所名", O2, "H15", (c) => c.f.dispatchBranchName),
  ...digitItems("11", "派遣先（4）雇用保険適用事業所番号", O2, INS_CELLS_O2, (c) => c.f.dispatchInsuranceNumber),
  item("11", "派遣先（6）所在地", O2, "G31", (c) => c.f.dispatchAddress),
  item("11", "派遣先（6）電話番号", O2, "G33", (c) => c.f.dispatchPhone),
  item("11", "派遣先（7）資本金", O2, "F36", (c) => c.f.dispatchCapital),
  item("11", "派遣先（8）年間売上高", O2, "K39", (c) => c.f.dispatchAnnualSales),
  item("11", "派遣先（9）派遣予定期間", O2, "H42", (c) => c.f.dispatchPeriod),
];

/** 「有・無」のうち、未選択（空文字）はそのまま。選ばれた側だけを PickItem の writes キーとして使う */
function yesNoLabel(v: "" | "yes" | "no"): "" | "有" | "無" {
  return v === "yes" ? "有" : v === "no" ? "無" : "";
}

/** 16「在日親族及び同居者」の注記文（「有」のときに残す部分。原本は末尾に「・　無」が続く） */
const RELATIVES_NOTE_WHEN_YES = "（「有」の場合は，以下の欄に在日親族及び同居者を記入してください。）";

/**
 * 在日親族の各行にある「同居の有無」（結合セル1つに「有・無」。Y21と同じ方式）。
 * relativesPresent が「有」で、かつ該当行の相手が入力されているときだけ判定する（relativeItems と同じ条件）。
 */
function relativeLivesTogetherPickItems(sheet: string, rows: number[], no: string): PickItem[] {
  return rows.map((row, i) => ({
    no,
    label: `在日親族（${i + 1}人目） 同居の有無`,
    sheet,
    get: (c: FillCtx) => {
      const r = c.f.relativesPresent === "yes" ? c.f.relatives[i] : undefined;
      return yesNoLabel(r?.livesTogether ?? "");
    },
    writes: { 有: { [`T${row}`]: "有" }, 無: { [`T${row}`]: "無" } },
  }));
}

export const RENEWAL_PICK_ITEMS: PickItem[] = [
  {
    no: "4",
    label: "性別",
    sheet: S1,
    get: (c) => c.a.gender,
    // E21「男」・F21「・」・G21「女」。選ばれなかった側と「・」を空にする
    writes: {
      男: { E21: "男", F21: "", G21: "" },
      女: { E21: "", F21: "", G21: "女" },
    },
  },
  {
    no: "5",
    label: "配偶者の有無",
    sheet: S1,
    get: (c) => maritalLabel(c.f.maritalStatus),
    // Y21（Y21:AB21の結合セル）は「有・無」。選ばれた方だけにする
    writes: { 有: { Y21: "有" }, 無: { Y21: "無" } },
  },
  {
    no: "15",
    label: "犯罪を理由とする処分の有無",
    sheet: S1,
    get: (c) => yesNoLabel(c.f.criminalRecord === "yes" ? "yes" : c.f.criminalRecord === "none" ? "no" : ""),
    // C53「有」・D53「（具体的内容」・AG53「）」・AH53「・」・AI53「無」（別々のセル。具体的内容の文字はIssue #79の仕組みでI53へ書く）
    writes: {
      有: { AH53: "", AI53: "" },
      無: { C53: "", D53: "", AG53: "", AH53: "" },
    },
  },
  {
    no: "16",
    label: "在日親族及び同居者の有無",
    sheet: S1,
    get: (c) => yesNoLabel(c.f.relativesPresent),
    // C58「有」・D58は、注記文の末尾に「・　無」を含む1セル。無のときは注記文ごと「無」に置き換える
    writes: {
      有: { D58: RELATIVES_NOTE_WHEN_YES },
      無: { C58: "", D58: "無" },
    },
  },
  ...relativeLivesTogetherPickItems(S1, RELATIVE_ROWS, "16"),
];

function maritalLabel(v: string): string {
  return v === "married" ? "有" : v === "single" ? "無" : "";
}

export const RENEWAL_DIGIT_CHECKS: DigitCheck[] = [
  { label: "所属機関等作成用1 3(2)法人番号", length: 13, get: (c) => c.f.corporateNumber },
  { label: "所属機関等作成用1 3(4)雇用保険適用事業所番号", length: 11, get: (c) => c.f.employmentInsuranceNumber },
  { label: "所属機関等作成用2 11(2)法人番号", length: 13, get: (c) => c.f.dispatchCorporateNumber },
  { label: "所属機関等作成用2 11(4)雇用保険適用事業所番号", length: 11, get: (c) => c.f.dispatchInsuranceNumber },
];
