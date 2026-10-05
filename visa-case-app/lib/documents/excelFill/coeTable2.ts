import type { CoeFormCode } from "../../hspForm";
import { digitsOf, jobDescriptionLines, type FillCtx, type FillItem, type PickItem } from "./renewalMapping";

/**
 * 認定申請書 様式 I・L・M・U の、第2表以降（申請人用2以降・所属機関用）の入力欄の座標（Issue #187・#191）。
 * 第1表（申請人用（認定）・同（裏））は全様式で共通のため、coeMapping.ts の対応表を使う。
 * 様式ごとに、セルの位置も項番も異なるため、様式 N（coeMapping.ts）の表は流用しない。
 * 案件情報に項目がない欄は差し込まず、様式ごとの manual に書き、coe.ts の warnings で案内する（推測で埋めない）。
 * 座標は、公式の雛形（docs/official/coe-application-form-{I,L,M,U}_*.xlsx）の「ロック解除セル」から特定した。
 * 様式が改正されたら、座標を再特定し、coeTable2.test.ts も更新する。
 */

type Cell = [sheet: string, cell: string];

interface Table2Spec {
  /** 勤務先・学歴・実務経験・代理人・取次者（申請人用）。項目名 → [シート名, セル] */
  fields: Partial<Record<FieldKey, Cell>>;
  /** 法人番号（13桁・1桁ずつ） */
  corp: { sheet: string; cells: string[] };
  /** 雇用保険適用事業所番号（11桁。4-6-1 の区切りの「-」を除いた11セル） */
  ins: { sheet: string; cells: string[] };
  /** 職歴の欄。左の列を上から下へ、続いて右の列を上から下へ。cols は 入社年・入社月・退社年・退社月・勤務先名称 */
  work: { sheet: string; rows: number[]; left: string[]; right: string[] };
  /** 給与・報酬が月額のとき、「月額」の□を■にするセル */
  monthlyBox?: Cell;
  /** 案件情報に項目がなく、様式上で記入が必要な欄（warnings の文言に使う） */
  manual: string;
  /** 様式の表示名 */
  name: string;
}

const FIELD_DEFS = {
  workplaceName: ["勤務先 名称", (c: FillCtx) => c.e.companyName],
  workplaceBranch: ["勤務先 支店・事業所名", (c: FillCtx) => c.f.branchName],
  workplaceAddress: ["勤務先 所在地", (c: FillCtx) => c.e.companyAddress],
  workplacePhone: ["勤務先 電話番号", (c: FillCtx) => c.f.workPhone],
  school: ["最終学歴 学校名", (c: FillCtx) => c.f.schoolName],
  gradYear: ["卒業（年）", (c: FillCtx) => datePart(c.f.graduationDate, "y")],
  gradMonth: ["卒業（月）", (c: FillCtx) => datePart(c.f.graduationDate, "m")],
  gradDay: ["卒業（日）", (c: FillCtx) => datePart(c.f.graduationDate, "d")],
  experienceYears: ["事業の経営又は管理についての実務経験年数", (c: FillCtx) => c.f.experienceYears],
  repName: ["代理人 氏名", (c: FillCtx) => c.f.legalRepName],
  repRelationship: ["代理人 本人との関係", (c: FillCtx) => c.f.legalRepRelationship],
  repAddress: ["代理人 住所", (c: FillCtx) => c.f.legalRepAddress],
  repPhone: ["代理人 電話番号", (c: FillCtx) => c.f.legalRepPhone],
  agentName: ["取次者 氏名", (c: FillCtx) => c.f.agentName],
  agentAddress: ["取次者 住所", (c: FillCtx) => c.f.agentAddress],
  agentAffiliation: ["取次者 所属機関等", (c: FillCtx) => c.f.agentAffiliation],
  agentPhone: ["取次者 電話番号", (c: FillCtx) => c.f.agentPhone],
  // 所属機関等作成用
  applicantName: ["契約等をする外国人の氏名", (c: FillCtx) => c.a.legalName],
  orgName: ["所属機関 名称", (c: FillCtx) => c.e.companyName],
  orgBranch: ["所属機関 支店・事業所名", (c: FillCtx) => c.f.branchName],
  orgAddress: ["所属機関 所在地", (c: FillCtx) => c.e.companyAddress],
  orgPhone: ["所属機関 電話番号", (c: FillCtx) => c.f.orgPhone],
  industry: ["業種（主たる業種の番号）", (c: FillCtx) => only(/^\d{1,3}$/, c.e.industry)],
  capital: ["資本金", (c: FillCtx) => c.e.capital],
  annualSales: ["年間売上高（直近年度）", (c: FillCtx) => c.f.annualSales],
  employees: ["従業員数", (c: FillCtx) => c.e.employeeCount],
  foreignStaff: ["うち外国人職員数", (c: FillCtx) => c.f.foreignStaffCount],
  occupationCode: ["職種（主たる職種の番号）", (c: FillCtx) => only(/^\d{1,3}$/, c.f.occupationCode)],
  job1: ["活動内容詳細（1行目）", (c: FillCtx) => jobDescriptionLines(c.e.jobDescription)[0]],
  job2: ["活動内容詳細（2行目）", (c: FillCtx) => jobDescriptionLines(c.e.jobDescription)[1]],
  salary: ["給与・報酬（税引き前）", (c: FillCtx) => c.e.monthlySalary],
  position: ["職務上の地位（役職名）", (c: FillCtx) => c.f.positionTitle],
} as const;

type FieldKey = keyof typeof FIELD_DEFS;

function datePart(v: string, part: "y" | "m" | "d"): string {
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(v.trim());
  const s = m ? (part === "y" ? m[1] : part === "m" ? m[2] : m[3]) : "";
  return s ? String(Number(s)) : "";
}
function only(re: RegExp, v: string): string {
  return re.test(v.trim()) ? v.trim() : "";
}

const cols = (from: string, to: string): string[] => {
  const n = (s: string) => [...s].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0);
  const s = (k: number) => {
    let out = "";
    for (let x = k; x > 0; x = Math.floor((x - 1) / 26)) out = String.fromCharCode(65 + ((x - 1) % 26)) + out;
    return out;
  };
  return Array.from({ length: n(to) - n(from) + 1 }, (_, i) => s(n(from) + i));
};
const row = (cs: string[], r: number) => cs.map((c) => `${c}${r}`);
const WORK_LEFT = ["A", "C", "E", "G", "I"];
const WORK_RIGHT = ["R", "T", "V", "X", "Z"];
/** 雇用保険適用事業所番号（4-6-1）の、様式ごとの11セルの列（区切りの「-」の列は除く） */
const INS_COLS_C = ["C", "D", "E", "F", "H", "I", "J", "K", "L", "M", "O"];
const INS_COLS_S = ["S", "T", "U", "V", "X", "Y", "Z", "AA", "AB", "AC", "AE"];

const SPECS: Record<Exclude<CoeFormCode, "N">, Table2Spec> = {
  M: {
    name: "様式 M（経営・管理）",
    fields: {
      workplaceName: ["申請人用２", "E6"], workplaceBranch: ["申請人用２", "V6"], workplaceAddress: ["申請人用２", "F9"], workplacePhone: ["申請人用２", "Y9"],
      school: ["申請人用２", "G20"], gradYear: ["申請人用２", "W20"], gradMonth: ["申請人用２", "AA20"], gradDay: ["申請人用２", "AE20"],
      experienceYears: ["申請人用２", "S40"],
      repName: ["申請人用２", "F58"], repRelationship: ["申請人用２", "AA58"], repAddress: ["申請人用２", "F61"], repPhone: ["申請人用２", "G64"],
      agentName: ["申請人用２", "E81"], agentAddress: ["申請人用２", "R81"], agentAffiliation: ["申請人用２", "C85"], agentPhone: ["申請人用２", "W85"],
      applicantName: ["所属機関用１M", "S4"], orgName: ["所属機関用１M", "E15"], orgBranch: ["所属機関用１M", "I18"], industry: ["所属機関用１M", "AF28"],
      orgAddress: ["所属機関用１M", "G35"], orgPhone: ["所属機関用１M", "Z35"], capital: ["所属機関用１M", "Q42"], annualSales: ["所属機関用１M", "K48"],
      employees: ["所属機関用１M", "K51"], occupationCode: ["所属機関用１M", "AF69"], job1: ["所属機関用１M", "B76"], job2: ["所属機関用１M", "B77"],
      salary: ["所属機関用１M", "B84"], position: ["所属機関用１M", "J87"],
    },
    corp: { sheet: "所属機関用１M", cells: row(cols("S", "AE"), 15) },
    ins: { sheet: "所属機関用１M", cells: row(INS_COLS_C, 23) },
    work: { sheet: "申請人用２", rows: [47, 49, 51, 53], left: WORK_LEFT, right: WORK_RIGHT },
    monthlyBox: ["所属機関用１M", "O84"],
    manual: "所属機関用1の「契約の形態」「財産の総額」「申請人の投資額」「法人税納付額」「常勤従業員のうち日本人等の数」「日本語能力を有する者の有無」「就労予定期間」「事業所の面積・保有の形態」",
  },
  L: {
    name: "様式 L（企業内転勤）",
    fields: {
      workplaceName: ["申請人用２L", "E6"], workplaceBranch: ["申請人用２L", "V6"], workplaceAddress: ["申請人用２L", "F9"], workplacePhone: ["申請人用２L", "Y9"],
      repName: ["申請人用２L", "F41"], repRelationship: ["申請人用２L", "AA41"], repAddress: ["申請人用２L", "F44"], repPhone: ["申請人用２L", "G47"],
      agentName: ["申請人用２L", "E63"], agentAddress: ["申請人用２L", "R63"], agentAffiliation: ["申請人用２L", "C67"], agentPhone: ["申請人用２L", "W67"],
      applicantName: ["所属機関用１L", "R4"], orgName: ["所属機関用１L", "F14"], orgBranch: ["所属機関用１L", "H18"], industry: ["所属機関用１L", "AF26"],
      orgAddress: ["所属機関用１L", "F32"], orgPhone: ["所属機関用１L", "Z32"], capital: ["所属機関用１L", "F35"], annualSales: ["所属機関用１L", "Y35"],
      employees: ["所属機関用１L", "I38"], foreignStaff: ["所属機関用１L", "Y38"], occupationCode: ["所属機関用１L", "AF51"],
      job1: ["所属機関用１L", "B73"], job2: ["所属機関用１L", "B74"], salary: ["所属機関用１L", "B44"], position: ["所属機関用１L", "J47"],
    },
    corp: { sheet: "所属機関用１L", cells: row(cols("S", "AE"), 15) },
    ins: { sheet: "所属機関用１L", cells: row(INS_COLS_S, 20) },
    work: { sheet: "申請人用２L", rows: [32, 34, 36], left: WORK_LEFT, right: WORK_RIGHT },
    monthlyBox: ["所属機関用１L", "O44"],
    manual: "申請人用2の「派遣元（転勤元）の会社・関係（23・24）」、所属機関用1の「契約の形態」「派遣・就労予定期間」「派遣元（転勤元）の会社・関係（9・10）」",
  },
  I: {
    name: "様式 I（教授）",
    fields: {
      workplaceName: ["申請人用２I", "G6"], workplaceAddress: ["申請人用２I", "G9"], workplacePhone: ["申請人用２I", "Z9"],
      school: ["申請人用２I", "H20"], gradYear: ["申請人用２I", "X20"], gradMonth: ["申請人用２I", "AB20"], gradDay: ["申請人用２I", "AF20"],
      repName: ["申請人用２I", "G62"], repRelationship: ["申請人用２I", "AB62"], repAddress: ["申請人用２I", "G65"], repPhone: ["申請人用２I", "H68"],
      agentName: ["申請人用２I", "F84"], agentAddress: ["申請人用２I", "S84"], agentAffiliation: ["申請人用２I", "D88"], agentPhone: ["申請人用２I", "X88"],
      applicantName: ["所属機関用１I", "R4"], orgName: ["所属機関用１I", "G14"], orgAddress: ["所属機関用１I", "G22"], orgPhone: ["所属機関用１I", "G25"],
      foreignStaff: ["所属機関用１I", "AB25"], industry: ["所属機関用１I", "AF30"], occupationCode: ["所属機関用１I", "AF68"],
      job1: ["所属機関用１I", "B84"], job2: ["所属機関用１I", "B85"], position: ["所属機関用１I", "AE87"], salary: ["所属機関用１I", "O94"],
    },
    corp: { sheet: "所属機関用１I", cells: row(cols("T", "AF"), 14) },
    ins: { sheet: "所属機関用１I", cells: row(INS_COLS_C, 19) },
    work: { sheet: "申請人用２I", rows: [46, 48, 50], left: ["B", "D", "F", "H", "J"], right: ["S", "U", "W", "Y", "AA"] },
    monthlyBox: ["所属機関用１I", "AA94"],
    manual: "申請人用2の「専攻・専門分野（24）」「教育に係る欄（26〜28）」、所属機関用1の「契約の形態」「稼働先（4）」「研究室（5）」「就労予定期間」「雇用形態」",
  },
  U: {
    name: "様式 U（法律・会計、医療）",
    fields: {
      workplaceName: ["申請人用（認定）３Ｕ", "F5"], workplaceBranch: ["申請人用（認定）３Ｕ", "V5"], workplaceAddress: ["申請人用（認定）３Ｕ", "F8"], workplacePhone: ["申請人用（認定）３Ｕ", "H11"],
      school: ["申請人用（認定）３Ｕ", "G22"], gradYear: ["申請人用（認定）３Ｕ", "G28"], gradMonth: ["申請人用（認定）３Ｕ", "M28"],
      repName: ["申請人用（認定）４Ｕ", "E27"], repRelationship: ["申請人用（認定）４Ｕ", "Z27"], repAddress: ["申請人用（認定）４Ｕ", "F30"], repPhone: ["申請人用（認定）４Ｕ", "G33"],
      agentName: ["申請人用（認定）４Ｕ", "E52"], agentAddress: ["申請人用（認定）４Ｕ", "R52"], agentAffiliation: ["申請人用（認定）４Ｕ", "C56"], agentPhone: ["申請人用（認定）４Ｕ", "Z56"],
      applicantName: ["所属機関用（認定）１Ｕ", "R4"], occupationCode: ["所属機関用（認定）１Ｕ", "AG28"], job1: ["所属機関用（認定）１Ｕ", "B43"], job2: ["所属機関用（認定）１Ｕ", "B44"],
      orgName: ["所属機関用（認定）１Ｕ", "F50"], orgBranch: ["所属機関用（認定）１Ｕ", "X50"], industry: ["所属機関用（認定）１Ｕ", "AG61"],
      orgAddress: ["所属機関用（認定）１Ｕ", "G67"], orgPhone: ["所属機関用（認定）１Ｕ", "Z67"], capital: ["所属機関用（認定）１Ｕ", "G70"], annualSales: ["所属機関用（認定）１Ｕ", "Z70"],
      employees: ["所属機関用（認定）１Ｕ", "H73"], foreignStaff: ["所属機関用（認定）１Ｕ", "X73"],
      position: ["所属機関用（認定）２Ｕ", "H13"], salary: ["所属機関用（認定）２Ｕ", "B21"],
    },
    corp: { sheet: "所属機関用（認定）１Ｕ", cells: row(cols("O", "AA"), 53) },
    ins: { sheet: "所属機関用（認定）１Ｕ", cells: row(INS_COLS_C, 57) },
    work: { sheet: "申請人用（認定）４Ｕ", rows: [16, 18, 20, 22], left: WORK_LEFT, right: WORK_RIGHT },
    manual: "申請人用2の「活動内容の区分（22）」、申請人用3の「経歴・在学中の大学名・具体的な在留目的・専攻（24〜28）」、申請人用4の「起業関連の経験（29・30）」、所属機関用の「契約の形態」「申請人の活動内容の区分」「就労又は就学予定期間」「雇用主・扶養者・日系四世受入れサポーター（9〜12）」",
  },
};

export interface Table2Mapping {
  name: string;
  fill: FillItem[];
  pick: PickItem[];
  maxWork: number;
  manual: string;
}

function build(spec: Table2Spec): Table2Mapping {
  const item = (label: string, [sheet, cell]: Cell, get: (c: FillCtx) => string): FillItem => ({ no: "", label, sheet, cell, get });
  const fill: FillItem[] = [];
  for (const [key, cellRef] of Object.entries(spec.fields) as [FieldKey, Cell][]) {
    const [label, get] = FIELD_DEFS[key];
    fill.push(item(label, cellRef, get));
  }
  spec.corp.cells.forEach((cell, i) => fill.push(item(`法人番号（${i + 1}桁目）`, [spec.corp.sheet, cell], (c) => digitsOf(c.f.corporateNumber)[i] ?? "")));
  spec.ins.cells.forEach((cell, i) => fill.push(item(`雇用保険適用事業所番号（${i + 1}桁目）`, [spec.ins.sheet, cell], (c) => digitsOf(c.f.employmentInsuranceNumber)[i] ?? "")));
  const slots = [...spec.work.rows.map((r) => spec.work.left.map((c) => `${c}${r}`)), ...spec.work.rows.map((r) => spec.work.right.map((c) => `${c}${r}`))];
  slots.forEach(([jy, jm, ly, lm, name], i) => {
    const w = (c: FillCtx) => c.f.workHistory[i];
    const label = `職歴（${i + 1}行目）`;
    fill.push(
      item(`${label} 入社（年）`, [spec.work.sheet, jy], (c) => datePart(w(c)?.joinedOn ?? "", "y")),
      item(`${label} 入社（月）`, [spec.work.sheet, jm], (c) => datePart(w(c)?.joinedOn ?? "", "m")),
      item(`${label} 退社（年）`, [spec.work.sheet, ly], (c) => datePart(w(c)?.leftOn ?? "", "y")),
      item(`${label} 退社（月）`, [spec.work.sheet, lm], (c) => datePart(w(c)?.leftOn ?? "", "m")),
      item(`${label} 勤務先名称`, [spec.work.sheet, name], (c) => w(c)?.employer ?? ""),
    );
  });
  const pick: PickItem[] = spec.monthlyBox
    ? [{ no: "", label: "給与・報酬の区分", sheet: spec.monthlyBox[0], get: (c) => (c.e.monthlySalary.trim() ? "月額" : ""), writes: { 月額: { [spec.monthlyBox[1]]: "■" } } }]
    : [];
  return { name: spec.name, fill, pick, maxWork: slots.length, manual: spec.manual };
}

/** 様式 N 以外（I・L・M・U）の、第2表以降の対応表 */
export const COE_TABLE2: Record<Exclude<CoeFormCode, "N">, Table2Mapping> = {
  I: build(SPECS.I),
  L: build(SPECS.L),
  M: build(SPECS.M),
  U: build(SPECS.U),
};
