import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, RESIDENCE_STATUSES, type Applicant, type EmploymentInfo } from "../../types";
import { FORM_L_STATUSES, isFormLStatus } from "../../hspForm";
import { fillChangeExcel } from "./change";
import { fillCoeExcel } from "./coe";
import { COE_PURPOSE_CHECKBOXES, COE_SHEET_APPLICANT_1 } from "./coeMapping";
import { COE_TABLE2 } from "./coeTable2";
import { HSP_CHANGE_TABLE2 } from "./hspChangeTable2";
import { fillRenewalExcel } from "./renewal";
import { sheetKey } from "./renewalMapping";

// 高度専門職ではない「報道」は、様式 L（見出し「高度専門職（1号ロ）・（2号）、報道、研究（転勤）、企業内転勤」）で出力する（Issue #294）。「企業内転勤」も同じ様式 L で出力する（Issue #295）。値はすべてダミー。

const applicant: Applicant = { ...EMPTY_APPLICANT, legalName: "TARO YAMADA", nationality: "テスト国", confirmationStatus: "confirmed" };
const employment: EmploymentInfo = { ...EMPTY_EMPLOYMENT, companyName: "テスト通信社", jobDescription: "取材" };
const details: FormDetails = {
  ...EMPTY_FORM_DETAILS,
  placeOfBirth: "テスト市",
  workHistory: [{ id: "w1", joinedOn: "2015-04", leftOn: "2019-03", employer: "テスト商事" }],
};

async function open(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}
const cell = (wb: ExcelJS.Workbook, name: string, addr: string) => {
  const v = wb.worksheets.find((w) => sheetKey(w.name) === sheetKey(name))?.getCell(addr).value;
  return typeof v === "string" ? v : v == null ? "" : String((v as { text?: string }).text ?? v);
};
const sheetNames = (wb: ExcelJS.Workbook) => wb.worksheets.map((w) => sheetKey(w.name));

describe.each(["報道", "企業内転勤"])("「%s」（高度専門職ではない）は様式 L で出力する", (status) => {
  it("在留資格として選べ、様式 L の対象として照合できる", () => {
    expect(RESIDENCE_STATUSES).toContain(status);
    expect(FORM_L_STATUSES).toContain(status);
    expect(isFormLStatus(status)).toBe(true);
    expect(COE_PURPOSE_CHECKBOXES[status]).toBeTruthy();
  });

  it("認定：様式 L の第2表以降に差し込み、入国目的の該当欄にチェックする", async () => {
    const { buffer, warnings } = await fillCoeExcel(applicant, employment, details, status);
    const wb = await open(buffer);
    const company = COE_TABLE2.L.fill.find((i) => i.label === "所属機関 名称")!;
    expect(sheetNames(wb).some((n) => n.includes("Ｌ") || n.endsWith("L"))).toBe(true);
    expect(cell(wb, company.sheet, company.cell)).toBe("テスト通信社");
    expect(cell(wb, COE_SHEET_APPLICANT_1, COE_PURPOSE_CHECKBOXES[status])).toBe("■");
    expect(warnings.join("\n")).toContain(COE_TABLE2.L.manual);
    expect(warnings.join("\n")).not.toContain("入国目的");
  });

  it("変更：様式 L の第2表以降に差し込み、様式の対象外の警告は出さない", async () => {
    const { buffer, warnings } = await fillChangeExcel(applicant, employment, details, status);
    const wb = await open(buffer);
    const company = HSP_CHANGE_TABLE2.L.fill.find((i) => i.label === "所属機関 名称")!;
    expect(cell(wb, company.sheet, company.cell)).toBe("テスト通信社");
    expect(warnings.join("\n")).not.toContain("変更後の在留資格に合う様式");
    expect(warnings.join("\n")).toContain(HSP_CHANGE_TABLE2.L.manual);
  });

  it("更新：様式 L の第2表以降に差し込む", async () => {
    const { buffer, warnings } = await fillRenewalExcel(applicant, employment, details, status);
    const wb = await open(buffer);
    const company = HSP_CHANGE_TABLE2.L.fill.find((i) => i.label === "所属機関 名称")!;
    expect(cell(wb, company.sheet, company.cell)).toBe("テスト通信社");
    expect(warnings.join("\n")).toContain(HSP_CHANGE_TABLE2.L.manual);
  });
});

describe("様式 L を使わない在留資格は、従来どおり", () => {
  it("技術・人文知識・国際業務は様式 N（第2表以降に様式 L の表を差し込まない）", async () => {
    const { buffer } = await fillRenewalExcel(applicant, employment, details, "技術・人文知識・国際業務");
    const wb = await open(buffer);
    const company = HSP_CHANGE_TABLE2.L.fill.find((i) => i.label === "所属機関 名称")!;
    expect(cell(wb, company.sheet, company.cell)).toBe("");
  });

  it("「報道」「企業内転勤」を含む別の表記や「研究（転勤）」は、完全一致でないため様式 L にならない", () => {
    expect(isFormLStatus("報道関係")).toBe(false);
    expect(isFormLStatus("企業内転勤２号")).toBe(false);
    expect(isFormLStatus("研究（転勤）")).toBe(false);
    expect(isFormLStatus("")).toBe(false);
  });
});
