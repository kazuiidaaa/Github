import type { FormResolution } from "../../hspForm";
import { digitsOf, jobDescriptionLines, type FillCtx, type FillItem, type PickItem } from "./renewalMapping";

/**
 * 第2表以降（申請人用2以降・所属機関用）の対応表を作る共通部品。認定（coeTable2.ts）と、変更・更新（hspChangeTable2.ts）で共有する。
 * 座標（SPECS）は手続・様式ごとに異なるため、各モジュールが持つ。
 */

export type Cell = [sheet: string, cell: string];

export interface Table2Spec {
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

export const FIELD_DEFS = {
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
  cardNumber: ["在留カード番号", (c: FillCtx) => c.a.residenceCardNumber],
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

export type FieldKey = keyof typeof FIELD_DEFS;

export function datePart(v: string, part: "y" | "m" | "d"): string {
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(v.trim());
  const s = m ? (part === "y" ? m[1] : part === "m" ? m[2] : m[3]) : "";
  return s ? String(Number(s)) : "";
}
export function only(re: RegExp, v: string): string {
  return re.test(v.trim()) ? v.trim() : "";
}

export const cols = (from: string, to: string): string[] => {
  const n = (s: string) => [...s].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0);
  const s = (k: number) => {
    let out = "";
    for (let x = k; x > 0; x = Math.floor((x - 1) / 26)) out = String.fromCharCode(65 + ((x - 1) % 26)) + out;
    return out;
  };
  return Array.from({ length: n(to) - n(from) + 1 }, (_, i) => s(n(from) + i));
};
export const row = (cs: string[], r: number) => cs.map((c) => `${c}${r}`);
export const WORK_LEFT = ["A", "C", "E", "G", "I"];
export const WORK_RIGHT = ["R", "T", "V", "X", "Z"];
/** 雇用保険適用事業所番号（4-6-1）の、様式ごとの11セルの列（区切りの「-」の列は除く） */
export const INS_COLS_C = ["C", "D", "E", "F", "H", "I", "J", "K", "L", "M", "O"];
export const INS_COLS_S = ["S", "T", "U", "V", "X", "Y", "Z", "AA", "AB", "AC", "AE"];

export interface Table2Mapping {
  name: string;
  fill: FillItem[];
  pick: PickItem[];
  maxWork: number;
  manual: string;
}

export function build(spec: Table2Spec): Table2Mapping {
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

/**
 * 差し込む範囲を決める（手続に依存しない）。様式を特定できた高度専門職は、その様式の全表。
 * 高度専門職ではない（not_applicable）は、手続ごとに決めた様式の全表。
 * それ以外（号・活動が未確定、表にない、2号の更新）は、他の様式の表を流用せず、第1表のみ。
 */
export function planFill<C>(
  r: FormResolution<C>,
  forms: { notApplicable: C; unresolved: C },
): { form: C; firstOnly: boolean } {
  if (r.kind === "resolved") return { form: r.form, firstOnly: false };
  if (r.kind !== "not_applicable") return { form: forms.unresolved, firstOnly: true };
  return { form: forms.notApplicable, firstOnly: false };
}
