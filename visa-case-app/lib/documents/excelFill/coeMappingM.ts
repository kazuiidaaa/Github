import { digitsOf, jobDescriptionLines, type FillCtx, type FillItem, type PickItem } from "./renewalMapping";

/**
 * 認定申請書 様式 M（「経営・管理」・高度専門職（1号ハ）。識別番号 930004034）の、第2表以降の入力欄の座標。
 * 第1表（申請人用（認定）・同（裏））は全様式で共通のため、coeMapping.ts の対応表を使う。
 * 様式 N と、セルの位置も項番（申請人用2の 25 は実務経験年数、所属機関用1の項は 1〜9）も異なるため、Nの表は流用しない。
 * 案件情報に項目がないもの（契約の形態、財産の総額・申請人の投資額、法人税納付額、常勤従業員のうち日本人等の数、
 * 日本語能力者の有無、就労予定期間、事業所の面積・保有の形態）は差し込まず、coe.ts の warnings で案内する（Issue #191）。
 */
export const COE_M_SHEET_APPLICANT_2 = "申請人用２";
export const COE_M_SHEET_ORG_1 = "所属機関用１M";

const A2 = COE_M_SHEET_APPLICANT_2;
const O1 = COE_M_SHEET_ORG_1;

const part = (v: string, p: "y" | "m" | "d"): string => {
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(v.trim());
  const s = m ? (p === "y" ? m[1] : p === "m" ? m[2] : m[3]) : "";
  return s ? String(Number(s)) : "";
};
const only = (re: RegExp, v: string) => (re.test(v.trim()) ? v.trim() : "");
const item = (no: string, label: string, sheet: string, cell: string, get: (c: FillCtx) => string): FillItem => ({ no, label, sheet, cell, get });
const digits = (no: string, label: string, sheet: string, cells: string[], get: (c: FillCtx) => string): FillItem[] =>
  cells.map((cell, i) => item(no, `${label}（${i + 1}桁目）`, sheet, cell, (c) => digitsOf(get(c))[i] ?? ""));

/** 職歴の欄は8件。左の列を上から下へ（行 47・49・51・53）、続いて右の列を上から下へ */
const WORK_ROWS = [47, 49, 51, 53];
const WORK_SLOTS = [
  ...WORK_ROWS.map((row) => ({ row, cols: ["A", "C", "E", "G", "I"] })),
  ...WORK_ROWS.map((row) => ({ row, cols: ["R", "T", "V", "X", "Z"] })),
];
export const COE_M_MAX_WORK_HISTORY = WORK_SLOTS.length;

const workItems: FillItem[] = WORK_SLOTS.flatMap((s, i) => {
  const w = (c: FillCtx) => c.f.workHistory[i];
  const label = `職歴（${i + 1}行目）`;
  const [jy, jm, ly, lm, name] = s.cols.map((col) => `${col}${s.row}`);
  return [
    item("26", `${label} 入社（年）`, A2, jy, (c) => part(w(c)?.joinedOn ?? "", "y")),
    item("26", `${label} 入社（月）`, A2, jm, (c) => part(w(c)?.joinedOn ?? "", "m")),
    item("26", `${label} 退社（年）`, A2, ly, (c) => part(w(c)?.leftOn ?? "", "y")),
    item("26", `${label} 退社（月）`, A2, lm, (c) => part(w(c)?.leftOn ?? "", "m")),
    item("26", `${label} 勤務先名称`, A2, name, (c) => w(c)?.employer ?? ""),
  ];
});

const CORP_CELLS = (["S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE"]).map((c) => `${c}15`); // 13桁
const INS_CELLS = ["C", "D", "E", "F", "H", "I", "J", "K", "L", "M", "O"].map((c) => `${c}23`); // 4-6-1（G・N は「-」の印字）

export const COE_M_FILL_ITEMS: FillItem[] = [
  // 申請人等作成用2（M）
  item("22", "勤務先（1）名称", A2, "E6", (c) => c.e.companyName),
  item("22", "勤務先 支店・事業所名", A2, "V6", (c) => c.f.branchName),
  item("22", "勤務先（2）所在地", A2, "F9", (c) => c.e.companyAddress),
  item("22", "勤務先（3）電話番号", A2, "Y9", (c) => c.f.workPhone),
  item("23", "最終学歴（3）学校名", A2, "G20", (c) => c.f.schoolName),
  item("23", "最終学歴（4）卒業年", A2, "W20", (c) => part(c.f.graduationDate, "y")),
  item("23", "最終学歴（4）卒業月", A2, "AA20", (c) => part(c.f.graduationDate, "m")),
  item("23", "最終学歴（4）卒業日", A2, "AE20", (c) => part(c.f.graduationDate, "d")),
  item("25", "事業の経営又は管理についての実務経験年数", A2, "S40", (c) => c.f.experienceYears),
  ...workItems,
  item("27", "代理人（1）氏名", A2, "F58", (c) => c.f.legalRepName),
  item("27", "代理人（2）本人との関係", A2, "AA58", (c) => c.f.legalRepRelationship),
  item("27", "代理人（3）住所", A2, "F61", (c) => c.f.legalRepAddress),
  item("27", "代理人 電話番号", A2, "G64", (c) => c.f.legalRepPhone),
  item("取次者", "取次者（1）氏名", A2, "E81", (c) => c.f.agentName),
  item("取次者", "取次者（2）住所", A2, "R81", (c) => c.f.agentAddress),
  item("取次者", "取次者（3）所属機関等", A2, "C85", (c) => c.f.agentAffiliation),
  item("取次者", "取次者 電話番号", A2, "W85", (c) => c.f.agentPhone),

  // 所属機関等作成用1（M）
  item("1", "経営を行い又は管理に従事する外国人の氏名", O1, "S4", (c) => c.a.legalName),
  item("3", "（1）名称", O1, "E15", (c) => c.e.companyName),
  ...digits("3", "（2）法人番号", O1, CORP_CELLS, (c) => c.f.corporateNumber),
  item("3", "（3）支店・事業所名", O1, "I18", (c) => c.f.branchName),
  ...digits("3", "（4）雇用保険適用事業所番号", O1, INS_CELLS, (c) => c.f.employmentInsuranceNumber),
  item("3", "（5）業種（主たる業種の番号）", O1, "AF28", (c) => only(/^\d{1,3}$/, c.e.industry)),
  item("3", "（6）所在地", O1, "G35", (c) => c.e.companyAddress),
  item("3", "（6）電話番号", O1, "Z35", (c) => c.f.orgPhone),
  item("3", "（7）うち資本金の額又は出資の総額", O1, "Q42", (c) => c.e.capital),
  item("3", "（8）年間売上高（直近年度）", O1, "K48", (c) => c.f.annualSales),
  item("3", "（10）常勤従業員数", O1, "K51", (c) => c.e.employeeCount),
  item("4", "職種（主たる職種の番号）", O1, "AF69", (c) => only(/^\d{1,3}$/, c.f.occupationCode)),
  item("5", "活動内容詳細（1行目）", O1, "B76", (c) => jobDescriptionLines(c.e.jobDescription)[0]),
  item("5", "活動内容詳細（2行目）", O1, "B77", (c) => jobDescriptionLines(c.e.jobDescription)[1]),
  item("7", "給与・報酬（税引き前）", O1, "B84", (c) => c.e.monthlySalary),
  item("8", "職務上の地位（役職名）", O1, "J87", (c) => c.f.positionTitle),
];

/** 7 給与・報酬は、案件情報が月額のため、「月額」の□を■にする（金額が入っているときだけ） */
export const COE_M_PICK_ITEMS: PickItem[] = [
  {
    no: "7",
    label: "給与・報酬の区分",
    sheet: O1,
    get: (c) => (c.e.monthlySalary.trim() ? "月額" : ""),
    writes: { 月額: { O84: "■" } },
  },
];

/** 案件情報に項目がなく、様式上で記入が必要な欄（coe.ts の warnings で案内する） */
export const COE_M_MANUAL_ITEMS =
  "所属機関用1の「契約の形態」「財産の総額」「申請人の投資額」「法人税納付額」「常勤従業員のうち日本人等の数」「日本語能力を有する者の有無」「就労予定期間」「事業所の面積・保有の形態」";
