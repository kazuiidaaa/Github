import { INS_COLS_C, WORK_LEFT, WORK_RIGHT, cols, row, type Table2Spec } from "./table2Common";

/**
 * 変更・更新（高度専門職）の様式 M（経営・管理）の、第2表以降の座標（Issue #212）。変更と更新で座標が同一のため、1組を共有する。
 * 座標は、公式の雛形（旧様式 {change,renewal}-application-form-M.xlsx。#419 で削除）の「ロック解除セル」から特定した。
 * 差し込みには、経営・管理のページの新しい様式（businessmanager-{change,renewal}-application-form_*.xlsx。#397 R-13）を使う。座標は旧様式と同じ。
 * 様式が改正されたら、座標を再特定し、hspChangeTable2M.test.ts も更新する。
 */
export const HSP_CHANGE_SPEC_M: Table2Spec = {
  name: "様式 M（経営・管理）",
  fields: {
    workplaceName: ["申請人用２Ｍ", "E7"], workplaceBranch: ["申請人用２Ｍ", "V7"], workplaceAddress: ["申請人用２Ｍ", "F10"], workplacePhone: ["申請人用２Ｍ", "Y10"],
    school: ["申請人用２Ｍ", "G21"], gradYear: ["申請人用２Ｍ", "W21"], gradMonth: ["申請人用２Ｍ", "AA21"], gradDay: ["申請人用２Ｍ", "AE21"],
    experienceYears: ["申請人用２Ｍ", "S42"],
    repName: ["申請人用２Ｍ", "F60"], repRelationship: ["申請人用２Ｍ", "AA60"], repAddress: ["申請人用２Ｍ", "F63"], repPhone: ["申請人用２Ｍ", "G66"],
    agentName: ["申請人用２Ｍ", "E83"], agentAddress: ["申請人用２Ｍ", "S83"], agentAffiliation: ["申請人用２Ｍ", "C88"], agentPhone: ["申請人用２Ｍ", "Y88"],
    applicantName: ["所属機関用１Ｍ", "E7"], cardNumber: ["所属機関用１Ｍ", "X7"], orgName: ["所属機関用１Ｍ", "E19"], orgBranch: ["所属機関用１Ｍ", "I22"], industry: ["所属機関用１Ｍ", "AF31"],
    orgAddress: ["所属機関用１Ｍ", "G37"], orgPhone: ["所属機関用１Ｍ", "Z37"], capital: ["所属機関用１Ｍ", "Q43"], annualSales: ["所属機関用１Ｍ", "K49"],
    employees: ["所属機関用１Ｍ", "K52"], occupationCode: ["所属機関用１Ｍ", "AF69"], job1: ["所属機関用１Ｍ", "B77"], job2: ["所属機関用１Ｍ", "B78"],
    salary: ["所属機関用１Ｍ", "B89"], position: ["所属機関用１Ｍ", "J92"],
  },
  corp: { sheet: "所属機関用１Ｍ", cells: row(cols("S", "AE"), 19) },
  ins: { sheet: "所属機関用１Ｍ", cells: row(INS_COLS_C, 27) },
  work: { sheet: "申請人用２Ｍ", rows: [50, 52, 54, 56], left: WORK_LEFT, right: WORK_RIGHT },
  monthlyBox: ["所属機関用１Ｍ", "O89"],
  manual:
    "所属機関用1の「契約の形態（2）」「財産の総額・申請人の投資額（7）」「法人税納付額（9）」「常勤従業員のうち日本人等の数（10）」「日本語能力を有する者の有無（11）（『有』の場合は『内容』欄に、誰が・どの方法（試験名・級・点数など）で該当するかを書く）」「就労予定期間（6）」「事業所の面積・保有の形態（9）」",
};
