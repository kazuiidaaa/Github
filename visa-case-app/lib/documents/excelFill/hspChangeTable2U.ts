import { INS_COLS_C, WORK_LEFT, WORK_RIGHT, cols, row, type Table2Spec } from "./table2Common";

/**
 * 変更・更新（高度専門職）様式 U の、第2表以降（申請人用２Ｕ〜４Ｕ・所属機関用１Ｕ・２Ｕ）の入力欄の座標（Issue #212）。
 * 変更と更新で、ロック解除セルが完全に一致するため、1組を共有する。第1表は様式 N と同じ座標のため、ここには含めない。
 * 座標は docs/official/{change,renewal}-application-form-U.xlsx の「ロック解除セル」から特定した。認定（coeTable2.ts）の座標は流用できない。
 * 申請人用２Ｕ・所属機関用２Ｕは、チェック欄と、案件情報にない欄だけのため、差し込む項目はない（manual で案内する）。
 * 案件情報に項目がない欄は差し込まず、manual に書き、警告で案内する（推測で埋めない）。
 */
const A3 = "申請人用３Ｕ";
const A4 = "申請人用４Ｕ";
const O1 = "所属機関用１Ｕ";

export const HSP_CHANGE_SPEC_U: Table2Spec = {
  name: "様式 U（法律・会計、医療）",
  fields: {
    workplaceName: [A3, "F5"], workplaceBranch: [A3, "V5"], workplaceAddress: [A3, "F8"], workplacePhone: [A3, "H11"],
    school: [A3, "G22"], gradYear: [A3, "G28"], gradMonth: [A3, "M28"],
    repName: [A4, "E26"], repRelationship: [A4, "Z26"], repAddress: [A4, "F29"], repPhone: [A4, "G32"],
    agentName: [A4, "E50"], agentAddress: [A4, "R50"], agentAffiliation: [A4, "C54"], agentPhone: [A4, "Z54"],
    applicantName: [O1, "F7"], cardNumber: [O1, "J10"], occupationCode: [O1, "AE37"], job1: [O1, "B52"], job2: [O1, "B53"],
    orgName: [O1, "F59"], orgBranch: [O1, "X59"], industry: [O1, "AF71"], orgAddress: [O1, "G77"], orgPhone: [O1, "Z77"],
    capital: [O1, "G80"], annualSales: [O1, "Z80"], employees: [O1, "H83"], foreignStaff: [O1, "X83"],
    position: [O1, "H86"], salary: [O1, "B91"],
  },
  corp: { sheet: O1, cells: row(cols("O", "AA"), 62) },
  ins: { sheet: O1, cells: row(INS_COLS_C, 67) },
  work: { sheet: A4, rows: [16, 18, 20, 22], left: WORK_LEFT, right: WORK_RIGHT },
  manual:
    "申請人用2の「活動内容の区分（17）」、申請人用3の「最終学歴の区分・学部（19）」「経歴（20）」「在学中の大学名（21）」「具体的な在留目的（22）」「専攻・専門分野（23）」、申請人用4の「実務経験年数（24・25）」、所属機関用1の「契約の形態」「申請人の活動内容（2）」「他の職種・他の業種」「就労又は就学予定期間（7）」「雇用主（9）」、所属機関用2の「同居家族・扶養者・日系四世受入れサポーター（10〜12）」「記名・申請書作成年月日」",
};
