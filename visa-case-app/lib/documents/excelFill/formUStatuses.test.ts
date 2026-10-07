import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type Applicant, type EmploymentInfo } from "../../types";
import { fillChangeExcel } from "./change";
import { fillCoeExcel } from "./coe";
import { COE_SHEET_APPLICANT_1 } from "./coeMapping";
import { COE_TABLE2 } from "./coeTable2";
import { HSP_CHANGE_TABLE2 } from "./hspChangeTable2";
import { fillRenewalExcel } from "./renewal";
import { sheetKey } from "./renewalMapping";

// 高度専門職ではない「法律・会計業務」「医療」は、様式 U（見出し「その他」）で出力する（Issue #301・#302）。値はすべてダミー。

const applicant: Applicant = { ...EMPTY_APPLICANT, legalName: "TARO YAMADA", nationality: "テスト国", confirmationStatus: "confirmed" };
const employment: EmploymentInfo = { ...EMPTY_EMPLOYMENT, companyName: "テスト病院", jobDescription: "業務" };
const details: FormDetails = {
  ...EMPTY_FORM_DETAILS,
  placeOfBirth: "テスト市",
  workHistory: [{ id: "w1", joinedOn: "2015-04", leftOn: "2019-03", employer: "テスト商事" }],
};
const STATUSES = ["法律・会計業務", "医療"] as const;

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

describe.each(STATUSES)("%s（高度専門職ではない）は様式 U で出力する", (status) => {
  it("認定：様式 U の第2表以降に差し込み、入国目的は「その他」にチェックする", async () => {
    const { buffer, warnings } = await fillCoeExcel(applicant, employment, details, status);
    const wb = await open(buffer);
    const company = COE_TABLE2.U.fill.find((i) => i.label === "所属機関 名称")!;
    expect(sheetNames(wb).some((n) => n.includes("Ｕ") || n.endsWith("U"))).toBe(true);
    expect(cell(wb, company.sheet, company.cell)).toBe("テスト病院");
    expect(cell(wb, COE_SHEET_APPLICANT_1, "AK53")).toBe("■");
    expect(warnings.join("\n")).toContain(COE_TABLE2.U.manual);
    expect(warnings.join("\n")).not.toContain("入国目的"); // 様式の選択肢と一致しない警告は出さない
  });

  it("変更：様式 U の第2表以降に差し込み、様式の対象外の警告は出さない", async () => {
    const { buffer, warnings } = await fillChangeExcel(applicant, employment, details, status);
    const wb = await open(buffer);
    const company = HSP_CHANGE_TABLE2.U.fill.find((i) => i.label === "所属機関 名称")!;
    expect(cell(wb, company.sheet, company.cell)).toBe("テスト病院");
    expect(warnings.join("\n")).not.toContain("変更後の在留資格に合う様式");
    expect(warnings.join("\n")).toContain(HSP_CHANGE_TABLE2.U.manual);
  });

  it("更新：様式 U の第2表以降に差し込む", async () => {
    const { buffer, warnings } = await fillRenewalExcel(applicant, employment, details, status);
    const wb = await open(buffer);
    const company = HSP_CHANGE_TABLE2.U.fill.find((i) => i.label === "所属機関 名称")!;
    expect(cell(wb, company.sheet, company.cell)).toBe("テスト病院");
    expect(warnings.join("\n")).toContain(HSP_CHANGE_TABLE2.U.manual);
  });
});

describe("様式 U を使わない在留資格は、従来どおり", () => {
  it("技術・人文知識・国際業務は様式 N（第2表以降に様式 U の表を差し込まない）", async () => {
    const { buffer } = await fillRenewalExcel(applicant, employment, details, "技術・人文知識・国際業務");
    const wb = await open(buffer);
    const company = HSP_CHANGE_TABLE2.U.fill.find((i) => i.label === "所属機関 名称")!;
    expect(cell(wb, company.sheet, company.cell)).toBe("");
  });

  it("医療・法律・会計業務を含む別の在留資格（例：「医療」を含む文字列）は、完全一致でないため様式 U にならない", async () => {
    const { buffer } = await fillChangeExcel(applicant, employment, details, "特定活動（医療滞在）");
    const wb = await open(buffer);
    const company = HSP_CHANGE_TABLE2.U.fill.find((i) => i.label === "所属機関 名称")!;
    expect(cell(wb, company.sheet, company.cell)).toBe("");
  });
});
