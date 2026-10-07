import { INS_COLS_C, WORK_LEFT, WORK_RIGHT, cols, row, type Table2Spec } from "./table2Common";

/**
 * 変更・更新（高度専門職）の様式 I（教授）の、第2表以降の座標（Issue #212）。変更と更新で座標が同一のため、1組を共有する。
 * 座標は、公式の雛形（docs/official/{change,renewal}-application-form-I.xlsx）の「ロック解除セル」から特定した。
 * 様式が改正されたら、座標を再特定し、hspChangeTable2I.test.ts も更新する。
 */
export const HSP_CHANGE_SPEC_I: Table2Spec = {
  name: "様式 I（教授）",
  fields: {
    workplaceName: ["申請人用２Ｉ", "F7"], workplaceAddress: ["申請人用２Ｉ", "F10"], workplacePhone: ["申請人用２Ｉ", "Y10"],
    school: ["申請人用２Ｉ", "G35"], gradYear: ["申請人用２Ｉ", "W35"], gradMonth: ["申請人用２Ｉ", "AA35"], gradDay: ["申請人用２Ｉ", "AE35"],
    repName: ["申請人用３Ｉ", "F7"], repRelationship: ["申請人用３Ｉ", "AA7"], repAddress: ["申請人用３Ｉ", "F10"], repPhone: ["申請人用３Ｉ", "G13"],
    agentName: ["申請人用３Ｉ", "E32"], agentAddress: ["申請人用３Ｉ", "S32"], agentAffiliation: ["申請人用３Ｉ", "C37"], agentPhone: ["申請人用３Ｉ", "Y37"],
    applicantName: ["所属機関用１I", "F7"], cardNumber: ["所属機関用１I", "J9"], orgName: ["所属機関用１I", "G20"], orgAddress: ["所属機関用１I", "G28"], orgPhone: ["所属機関用１I", "G31"],
    foreignStaff: ["所属機関用１I", "AB31"], industry: ["所属機関用１I", "AF35"], occupationCode: ["所属機関用１I", "AF68"],
    job1: ["所属機関用１I", "B83"], job2: ["所属機関用１I", "B84"], position: ["所属機関用１I", "AB86"], salary: ["所属機関用１I", "B95"],
  },
  corp: { sheet: "所属機関用１I", cells: row(cols("T", "AF"), 20) },
  ins: { sheet: "所属機関用１I", cells: row(INS_COLS_C, 25) },
  work: { sheet: "申請人用２Ｉ", rows: [67, 69, 71], left: WORK_LEFT, right: WORK_RIGHT },
  monthlyBox: ["所属機関用１I", "N95"],
  manual:
    "申請人用2の「稼働先が複数ある場合（17(2)(3)）」「専攻・専門分野（19）」「教育に係る欄（21〜23）」、所属機関用1の「契約の形態（2）」「稼働先（4）」「就労予定期間（7）」「雇用形態（9）」",
};
