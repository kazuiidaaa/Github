import { formatDate } from "../../format";
import type { FormDetails } from "../../formDetails";
import {
  digitsOf,
  jobDescriptionLines,
  type DigitCheck,
  type FillCtx,
  type FillItem,
  type PickItem,
} from "./renewalMapping";

/**
 * 公式の在留資格認定証明書交付申請書（別記第六号の三様式・Excel、識別番号 930004030）の「入力欄」のセル座標と、案件DBの対応表。
 *
 * 項目番号・項目名は lib/formDetails.ts の FORM_LAYOUTS.coe（原本の項番）に合わせている。
 * 更新・変更の様式とは項番が異なる（申請人用1は 5〜21、申請人用2は 22〜27、所属機関用の実務経験年数以降は 8・9・10・12）。
 * 座標の特定方法・シート名の扱い・対象外の項目は docs/phase11-fill-engines.md（更新編が方式、認定編が認定の判断）。
 * 様式が改正された場合は、docs の手順で座標を再特定し、このファイルを更新する（tests も更新する）。
 *
 * 更新（renewalMapping.ts）と共通の型・関数は import し、様式ごとに異なる小さな補助関数だけをここに持つ
 * （並行する #84・#88 と同じ行を触って衝突しないよう、renewalMapping.ts は変更していない）。
 */

/** テンプレートのシート名（空白・全角半角の差は無視して照合する。sheetKey を参照）。実際の名前は先頭や末尾に空白がある */
export const COE_SHEET_APPLICANT_1 = "申請人用（認定）";
export const COE_SHEET_APPLICANT_2 = "申請人用２Ｎ";
export const COE_SHEET_ORG_1 = "所属機関用１Ｎ";
export const COE_SHEET_ORG_2 = "所属機関用２Ｎ";

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
const dateItems = (no: string, label: string, sheet: string, cells: { y: string; m: string; d: string }, get: (c: FillCtx) => string): FillItem[] => [
  item(no, `${label}（年）`, sheet, cells.y, (c) => datePart(get(c), "y")),
  item(no, `${label}（月）`, sheet, cells.m, (c) => datePart(get(c), "m")),
  item(no, `${label}（日）`, sheet, cells.d, (c) => datePart(get(c), "d")),
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

// ---- 申請人等作成用1（認定） ---------------------------------------------
const S1 = COE_SHEET_APPLICANT_1;
/** 在日親族・同居者の欄は4行（更新は6行） */
const RELATIVE_ROWS = [95, 97, 99, 101];
export const COE_MAX_RELATIVES = RELATIVE_ROWS.length;

const relativeItems: FillItem[] = RELATIVE_ROWS.flatMap((row, i) => {
  const r = (c: FillCtx) => (c.f.relativesPresent === "yes" ? c.f.relatives[i] : undefined);
  const label = `在日親族（${i + 1}人目）`;
  return [
    item("21", `${label} 続柄`, S1, `A${row}`, (c) => r(c)?.relationship ?? ""),
    item("21", `${label} 氏名`, S1, `E${row}`, (c) => r(c)?.name ?? ""),
    item("21", `${label} 生年月日`, S1, `N${row}`, (c) => date(r(c)?.dateOfBirth ?? "")),
    item("21", `${label} 国籍・地域`, S1, `R${row}`, (c) => r(c)?.nationality ?? ""),
    item("21", `${label} 勤務先名称・通学先名称`, S1, `Z${row}`, (c) => r(c)?.workplace ?? ""),
    item("21", `${label} 在留カード番号`, S1, `AI${row}`, (c) => r(c)?.cardNumber ?? ""),
  ];
});

/** 有無の選択で「有」のときだけ、詳細（回数・年月日）を書く。更新の「犯罪処分」「在日親族」と同じ扱い */
const ifYes = (flag: (f: FormDetails) => string, value: (f: FormDetails) => string) => (c: FillCtx) =>
  flag(c.f) === "yes" ? value(c.f) : "";

// ---- 申請人等作成用2（N） ------------------------------------------------
const S2 = COE_SHEET_APPLICANT_2;
/** 職歴の欄は6件。左の列を上から下へ、続いて右の列を上から下へ並べる（入社年・入社月・退社年・退社月・勤務先名称の列） */
const WORK_SLOTS = [
  { row: 53, cols: ["A", "C", "E", "G", "I"] },
  { row: 55, cols: ["A", "C", "E", "G", "I"] },
  { row: 57, cols: ["A", "C", "E", "G", "I"] },
  { row: 53, cols: ["R", "T", "V", "X", "Z"] },
  { row: 55, cols: ["R", "T", "V", "X", "Z"] },
  { row: 57, cols: ["R", "T", "V", "X", "Z"] },
];
export const COE_MAX_WORK_HISTORY = WORK_SLOTS.length;

const workItems: FillItem[] = WORK_SLOTS.flatMap((s, i) => {
  const w = (c: FillCtx) => c.f.workHistory[i];
  const label = `職歴（${i + 1}行目）`;
  const [jy, jm, ly, lm, name] = s.cols.map((col) => `${col}${s.row}`);
  return [
    item("26", `${label} 入社（年）`, S2, jy, (c) => datePart(w(c)?.joinedOn ?? "", "y")),
    item("26", `${label} 入社（月）`, S2, jm, (c) => datePart(w(c)?.joinedOn ?? "", "m")),
    item("26", `${label} 退社（年）`, S2, ly, (c) => datePart(w(c)?.leftOn ?? "", "y")),
    item("26", `${label} 退社（月）`, S2, lm, (c) => datePart(w(c)?.leftOn ?? "", "m")),
    item("26", `${label} 勤務先名称`, S2, name, (c) => w(c)?.employer ?? ""),
  ];
});

// ---- 所属機関等作成用1（N）・2（N） ---------------------------------------
const O1 = COE_SHEET_ORG_1;
const O2 = COE_SHEET_ORG_2;
const CORP_CELLS_O1 = colRange("R", "AD").map((c) => `${c}19`); // 13桁
const INS_CELLS_O1 = ["R", "S", "T", "U", "W", "X", "Y", "Z", "AA", "AB", "AD"].map((c) => `${c}24`); // 4-6-1（V・AC は「-」の印字）
const CORP_CELLS_O2 = colRange("R", "AD").map((c) => `${c}9`); // 13桁
const INS_CELLS_O2 = ["C", "D", "E", "F", "H", "I", "J", "K", "L", "M", "O"].map((c) => `${c}17`); // 4-6-1（G・N は「-」が入力済み）

export const COE_FILL_ITEMS: FillItem[] = [
  // 申請人等作成用1（認定）
  item("1", "国籍・地域", S1, "G17", (c) => c.a.nationality),
  ...dateItems("2", "生年月日", S1, { y: "AC17", m: "AI17", d: "AM17" }, (c) => c.a.dateOfBirth),
  item("3", "氏名", S1, "G20", (c) => c.a.legalName),
  item("5", "出生地", S1, "P23", (c) => c.f.placeOfBirth),
  item("7", "職業", S1, "E26", (c) => c.f.occupation),
  item("8", "本国における居住地", S1, "X26", (c) => c.f.homeAddress),
  item("9", "日本における連絡先", S1, "I29", (c) => c.f.contactInJapan),
  item("9", "電話番号（連絡先の欄）", S1, "I32", (c) => c.f.phone),
  item("9", "携帯電話番号（連絡先の欄）", S1, "AC32", (c) => c.f.mobilePhone),
  item("10", "旅券（1）番号", S1, "I35", (c) => c.f.passportNumber),
  ...dateItems("10", "旅券（2）有効期限", S1, { y: "AC35", m: "AI35", d: "AM35" }, (c) => c.f.passportExpiry),
  ...dateItems("12", "入国予定年月日", S1, { y: "H55", m: "N55", d: "R55" }, (c) => c.f.plannedEntryDate),
  item("13", "上陸予定港", S1, "AC55", (c) => c.f.portOfEntry),
  item("14", "滞在予定期間", S1, "H58", (c) => c.f.plannedStay),
  item("16", "査証申請予定地", S1, "J61", (c) => c.f.visaApplicationPlace),
  item("17", "過去の出入国歴 回数", S1, "E67", ifYes((f) => f.entryHistory, (f) => f.entryHistoryCount)),
  ...dateItems("17", "直近の出入国歴（入国）", S1, { y: "Q67", m: "V67", d: "Z67" }, ifYes((f) => f.entryHistory, (f) => f.entryHistoryLastFrom)),
  ...dateItems("17", "直近の出入国歴（出国）", S1, { y: "AE67", m: "AJ67", d: "AN67" }, ifYes((f) => f.entryHistory, (f) => f.entryHistoryLastTo)),
  item("18", "過去の認定証明書交付申請歴 回数", S1, "S73", ifYes((f) => f.coeHistory, (f) => f.coeHistoryCount)),
  item("18", "うち不交付となった回数", S1, "AK73", ifYes((f) => f.coeHistory, (f) => f.coeHistoryNonIssuedCount)),
  item("19", "犯罪を理由とする処分（具体的内容）", S1, "J78", (c) => (c.f.criminalRecord === "yes" ? c.f.criminalDetail : "")),
  item("20", "退去強制又は出国命令による出国 回数", S1, "Q83", ifYes((f) => f.deportationHistory, (f) => f.deportationCount)),
  ...dateItems("20", "直近の送還歴", S1, { y: "AE83", m: "AJ83", d: "AN83" }, ifYes((f) => f.deportationHistory, (f) => f.deportationLastDate)),
  ...relativeItems,

  // 申請人等作成用2（N）
  item("22", "勤務先（1）名称", S2, "E8", (c) => c.e.companyName),
  item("22", "勤務先 支店・事業所名", S2, "W8", (c) => c.f.branchName),
  item("22", "勤務先（2）所在地", S2, "F11", (c) => c.e.companyAddress),
  item("22", "勤務先（3）電話番号", S2, "Y11", (c) => c.f.workPhone),
  item("23", "最終学歴（3）学校名", S2, "G22", (c) => c.f.schoolName),
  ...dateItems("23", "最終学歴（4）卒業年月日", S2, { y: "W22", m: "AA22", d: "AE22" }, (c) => c.f.graduationDate),
  item("25", "情報処理技術者資格・試験の名称", S2, "N45", (c) => c.f.itQualification),
  ...workItems,
  item("27", "代理人（1）氏名", S2, "F62", (c) => c.f.legalRepName),
  item("27", "代理人（2）本人との関係", S2, "Z62", (c) => c.f.legalRepRelationship),
  item("27", "代理人（3）住所", S2, "F65", (c) => c.f.legalRepAddress),
  item("27", "代理人 電話番号", S2, "G68", (c) => c.f.legalRepPhone),
  item("取次者", "取次者（1）氏名", S2, "E85", (c) => c.f.agentName),
  item("取次者", "取次者（2）住所", S2, "R85", (c) => c.f.agentAddress),
  item("取次者", "取次者（3）所属機関等", S2, "C89", (c) => c.f.agentAffiliation),
  item("取次者", "取次者 電話番号", S2, "W89", (c) => c.f.agentPhone),

  // 所属機関等作成用1（N）
  item("1", "契約又は招へいする外国人の氏名", O1, "P6", (c) => c.a.legalName),
  item("3", "（1）名称", O1, "E19", (c) => c.e.companyName),
  ...digitItems("3", "（2）法人番号", O1, CORP_CELLS_O1, (c) => c.f.corporateNumber),
  item("3", "（3）支店・事業所名", O1, "H23", (c) => c.f.branchName),
  ...digitItems("3", "（4）雇用保険適用事業所番号", O1, INS_CELLS_O1, (c) => c.f.employmentInsuranceNumber),
  item("3", "（5）業種（主たる業種の番号）", O1, "AG27", (c) => only(/^\d{1,3}$/, c.e.industry)),
  item("3", "（6）所在地", O1, "F32", (c) => c.e.companyAddress),
  item("3", "（6）電話番号", O1, "Z32", (c) => c.f.orgPhone),
  item("3", "（7）資本金", O1, "F35", (c) => c.e.capital),
  item("3", "（8）年間売上高", O1, "AA35", (c) => c.f.annualSales),
  item("3", "（9）従業員数", O1, "I38", (c) => c.e.employeeCount),
  item("3", "（9）うち外国人職員数", O1, "N41", (c) => c.f.foreignStaffCount),
  ...dateItems("6", "雇用開始（入社）年月日", O1, { y: "Z52", m: "AC52", d: "AF52" }, (c) => c.e.employmentStartDate),
  item("7", "給与・報酬（税引き前）", O1, "B58", (c) => c.e.monthlySalary),
  item("8", "実務経験年数", O1, "I61", (c) => c.f.experienceYears),
  item("9", "職務上の地位（役職名）", O1, "Z61", (c) => c.f.positionTitle),
  item("10", "職種（主たる職種の番号）", O1, "AF65", (c) => only(/^\d{1,3}$/, c.f.occupationCode)),
  item("11", "活動内容詳細（1行目）", O1, "B94", (c) => jobDescriptionLines(c.e.jobDescription)[0]),
  item("11", "活動内容詳細（2行目）", O1, "B95", (c) => jobDescriptionLines(c.e.jobDescription)[1]),

  // 所属機関等作成用2（N）
  item("12", "派遣先（1）名称", O2, "E9", (c) => c.f.dispatchName),
  ...digitItems("12", "派遣先（2）法人番号", O2, CORP_CELLS_O2, (c) => c.f.dispatchCorporateNumber),
  item("12", "派遣先（3）支店・事業所名", O2, "H12", (c) => c.f.dispatchBranchName),
  ...digitItems("12", "派遣先（4）雇用保険適用事業所番号", O2, INS_CELLS_O2, (c) => c.f.dispatchInsuranceNumber),
  item("12", "派遣先（6）所在地", O2, "G26", (c) => c.f.dispatchAddress),
  item("12", "派遣先（6）電話番号", O2, "G29", (c) => c.f.dispatchPhone),
  item("12", "派遣先（7）資本金", O2, "F32", (c) => c.f.dispatchCapital),
  item("12", "派遣先（8）年間売上高", O2, "K35", (c) => c.f.dispatchAnnualSales),
  item("12", "派遣先（9）派遣予定期間", O2, "H38", (c) => c.f.dispatchPeriod),
];

/** 「有・無」のうち、未選択（空文字）はそのまま。選ばれた側だけを PickItem の writes キーとして使う */
function yesNoLabel(v: "" | "yes" | "no"): "" | "有" | "無" {
  return v === "yes" ? "有" : v === "no" ? "無" : "";
}

/**
 * 11「入国目的」の□（34個）。キーは様式に印字された選択肢の文字そのもの（「」の中身）。
 * 案件の希望する在留資格（targetStatus）が、この文字と一字一句一致したときだけ、該当のセルを■にする。
 * 高度専門職の号（イ・ロ・ハ）は、案件の希望する在留資格で選べる（lib/types.ts の ADVANCED_PROFESSIONAL_GRADES）。
 * 号が未選択の「高度専門職」と、案件側で号・種別まで選べない「特定技能」「技能実習」「特定活動」は、
 * 一致しないため差し込まれず、coe.ts の warnings で案内する。
 */
export const COE_PURPOSE_CHECKBOXES: Record<string, string> = {
  教授: "B39",
  教育: "H39",
  芸術: "N39",
  文化活動: "T39",
  宗教: "AD39",
  報道: "AK39",
  企業内転勤: "B41",
  "研究（転勤）": "J41",
  "経営・管理": "R41",
  研究: "Y41",
  "技術・人文知識・国際業務": "AD41",
  介護: "B43",
  技能: "H43",
  "特定活動（研究活動等）": "M43",
  "特定活動（本邦大学卒業者）": "AD43",
  "特定技能（1号）": "B45",
  "特定技能（2号）": "L45",
  興行: "U45",
  留学: "AC45",
  研修: "AJ45",
  "技能実習（1号）": "B47",
  "技能実習（2号）": "M47",
  "技能実習（3号）": "AA47",
  家族滞在: "AK47",
  "特定活動（研究活動等家族）": "B49",
  "特定活動（EPA家族）": "Q49",
  "特定活動（本邦大卒者家族）": "AB49",
  日本人の配偶者等: "B51",
  永住者の配偶者等: "N51",
  定住者: "AA51",
  "高度専門職（1号イ）": "B53",
  "高度専門職（1号ロ）": "M53",
  "高度専門職（1号ハ）": "Y53",
  その他: "AK53",
};

/** coe.ts の warnings で、targetStatus が様式の選択肢（34個）のどれかと一致するかの判定に使う */
export const COE_PURPOSE_LABELS: string[] = Object.keys(COE_PURPOSE_CHECKBOXES);

/**
 * 案件のプルダウン（lib/types.ts の RESIDENCE_STATUSES）の表記と、COE_PURPOSE_CHECKBOXES の文字が
 * 一致するものだけを、実際に□を■へ置き換える対象にする（「その他」は案件側に対応する値がないため対象外）。
 */
const COE_PURPOSE_WRITES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(COE_PURPOSE_CHECKBOXES)
    .filter(([label]) => label !== "その他")
    .map(([label, cell]) => [label, { [cell]: "■" }]),
);

export const COE_PICK_ITEMS: PickItem[] = [
  {
    no: "4",
    label: "性別",
    sheet: S1,
    get: (c) => c.a.gender,
    // E23「男」・G23「・」・H23「女」。選ばれなかった側と「・」を空にする
    writes: {
      男: { E23: "男", G23: "", H23: "" },
      女: { E23: "", G23: "", H23: "女" },
    },
  },
  {
    no: "6",
    label: "配偶者の有無",
    sheet: S1,
    get: (c) => (c.f.maritalStatus === "married" ? "有" : c.f.maritalStatus === "single" ? "無" : ""),
    // AK23「有」・AM23「・」・AN23「無」。選ばれなかった側と「・」を空にする
    writes: {
      有: { AK23: "有", AM23: "", AN23: "" },
      無: { AK23: "", AM23: "", AN23: "無" },
    },
  },
  {
    no: "11",
    label: "入国目的",
    sheet: S1,
    get: (c) => (c.targetStatus ?? "").trim(),
    writes: COE_PURPOSE_WRITES,
  },
  {
    no: "15",
    label: "同伴者の有無",
    sheet: S1,
    get: (c) => yesNoLabel(c.f.accompanied),
    // AG58「有」・AH58「・」・AI58「無」（別々のセル）
    writes: {
      有: { AH58: "", AI58: "" },
      無: { AG58: "", AH58: "" },
    },
  },
  {
    no: "17",
    label: "過去の出入国歴の有無",
    sheet: S1,
    get: (c) => yesNoLabel(c.f.entryHistory),
    // M64「有」・N64「・」・O64「無」（別々のセル）
    writes: {
      有: { N64: "", O64: "" },
      無: { M64: "", N64: "" },
    },
  },
  {
    no: "18",
    label: "過去の認定証明書交付申請歴の有無",
    sheet: S1,
    get: (c) => yesNoLabel(c.f.coeHistory),
    // Q70「有」・R70「・」・S70「無」（別々のセル）
    writes: {
      有: { R70: "", S70: "" },
      無: { Q70: "", R70: "" },
    },
  },
  {
    no: "19",
    label: "犯罪を理由とする処分の有無",
    sheet: S1,
    get: (c) => yesNoLabel(c.f.criminalRecord === "yes" ? "yes" : c.f.criminalRecord === "none" ? "no" : ""),
    // C78「有」・D78「（具体的内容」・AL78「）」・AM78「・」・AN78「無」（別々のセル。具体的内容はJ78へ別途書く）
    writes: {
      有: { AM78: "", AN78: "" },
      無: { C78: "", D78: "", AL78: "", AM78: "" },
    },
  },
  {
    no: "20",
    label: "退去強制又は出国命令による出国の有無",
    sheet: S1,
    get: (c) => yesNoLabel(c.f.deportationHistory),
    // R81「有」・S81「・」・T81「無」（別々のセル）
    writes: {
      有: { S81: "", T81: "" },
      無: { R81: "", S81: "" },
    },
  },
  {
    no: "21",
    label: "在日親族及び同居者の有無",
    sheet: S1,
    get: (c) => yesNoLabel(c.f.relativesPresent),
    // C89「有」・D89は、注記文の末尾に「・　無」を含む1セル
    writes: {
      有: { D89: "（「有」の場合は，以下の欄に在日親族及び同居者を記入してください。）" },
      無: { C89: "", D89: "無" },
    },
  },
  ...RELATIVE_ROWS.map(
    (row, i): PickItem => ({
      no: "21",
      label: `在日親族（${i + 1}人目） 同居予定の有無`,
      sheet: S1,
      get: (c) => {
        const r = c.f.relativesPresent === "yes" ? c.f.relatives[i] : undefined;
        return yesNoLabel(r?.livesTogether ?? "");
      },
      // V{row}（結合セル1つ）は「有・無」。選ばれた方だけにする
      writes: { 有: { [`V${row}`]: "有" }, 無: { [`V${row}`]: "無" } },
    }),
  ),
];

export const COE_DIGIT_CHECKS: DigitCheck[] = [
  { label: "所属機関等作成用1 3(2)法人番号", length: 13, get: (c) => c.f.corporateNumber },
  { label: "所属機関等作成用1 3(4)雇用保険適用事業所番号", length: 11, get: (c) => c.f.employmentInsuranceNumber },
  { label: "所属機関等作成用2 12(2)法人番号", length: 13, get: (c) => c.f.dispatchCorporateNumber },
  { label: "所属機関等作成用2 12(4)雇用保険適用事業所番号", length: 11, get: (c) => c.f.dispatchInsuranceNumber },
];
