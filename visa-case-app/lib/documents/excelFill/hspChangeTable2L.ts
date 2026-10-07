import { INS_COLS_C, WORK_LEFT, WORK_RIGHT, cols, row, type Table2Spec } from "./table2Common";

/**
 * 変更・更新（高度専門職）様式 L の、第2表以降（申請人用２Ｌ・所属機関用１Ｌ）の入力欄の座標（Issue #212）。
 * 変更と更新で、ロック解除セルが完全に一致するため、1組を共有する。第1表は様式 N と同じ座標のため、ここには含めない。
 * 座標は docs/official/{change,renewal}-application-form-L.xlsx の「ロック解除セル」から特定した。認定（coeTable2.ts）の座標は流用できない。
 * 案件情報に項目がない欄は差し込まず、manual に書き、警告で案内する（推測で埋めない）。
 */
export const HSP_CHANGE_SPEC_L: Table2Spec = {
  name: "様式 L（企業内転勤）",
  fields: {
    workplaceName: ["申請人用２Ｌ", "E8"], workplaceBranch: ["申請人用２Ｌ", "V8"], workplaceAddress: ["申請人用２Ｌ", "F11"], workplacePhone: ["申請人用２Ｌ", "Z11"],
    repName: ["申請人用２Ｌ", "E45"], repRelationship: ["申請人用２Ｌ", "AA45"], repAddress: ["申請人用２Ｌ", "F48"], repPhone: ["申請人用２Ｌ", "G51"],
    agentName: ["申請人用２Ｌ", "E70"], agentAddress: ["申請人用２Ｌ", "S70"], agentAffiliation: ["申請人用２Ｌ", "C75"], agentPhone: ["申請人用２Ｌ", "Y75"],
    applicantName: ["所属機関用１Ｌ", "E8"], cardNumber: ["所属機関用１Ｌ", "W8"], orgName: ["所属機関用１Ｌ", "F19"], orgBranch: ["所属機関用１Ｌ", "H22"], industry: ["所属機関用１Ｌ", "AE32"],
    orgAddress: ["所属機関用１Ｌ", "G39"], orgPhone: ["所属機関用１Ｌ", "G41"], capital: ["所属機関用１Ｌ", "F44"], annualSales: ["所属機関用１Ｌ", "Y44"],
    employees: ["所属機関用１Ｌ", "I47"], foreignStaff: ["所属機関用１Ｌ", "Y47"], salary: ["所属機関用１Ｌ", "B52"], position: ["所属機関用１Ｌ", "J55"],
    occupationCode: ["所属機関用１Ｌ", "AF59"], job1: ["所属機関用１Ｌ", "B78"], job2: ["所属機関用１Ｌ", "B79"],
  },
  corp: { sheet: "所属機関用１Ｌ", cells: row(cols("S", "AE"), 19) },
  ins: { sheet: "所属機関用１Ｌ", cells: row(INS_COLS_C, 28) },
  work: { sheet: "申請人用２Ｌ", rows: [37, 39, 41], left: WORK_LEFT, right: WORK_RIGHT },
  monthlyBox: ["所属機関用１Ｌ", "O52"],
  manual:
    "申請人用2の「派遣元（転勤元）の会社・関係（18・19）」、所属機関用1の「契約の形態（2）」「他の業種」「職務上の地位の『あり』□」「派遣・就労予定期間（6）」「他の職種（7）」「派遣元（転勤元）の会社・関係（9・10）」「記名・申請書作成年月日」",
};
