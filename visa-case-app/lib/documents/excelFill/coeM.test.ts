import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type Applicant, type EmploymentInfo } from "../../types";
import { COE_TEMPLATE_PATHS, fillCoeExcel } from "./coe";
import { COE_M_FILL_ITEMS, COE_M_PICK_ITEMS, COE_M_SHEET_APPLICANT_2 as A2, COE_M_SHEET_ORG_1 as O1 } from "./coeMappingM";
import { COE_SHEET_APPLICANT_1 as S1 } from "./coeMapping";
import { sheetKey } from "./renewalMapping";

// 経営・管理（様式 M）の差し込みの試験（Issue #191）。値はすべてダミー。実案件の個人情報は書かない。

const applicant: Applicant = { ...EMPTY_APPLICANT, legalName: "TARO YAMADA", nationality: "テスト国", dateOfBirth: "1990-04-01", gender: "男", confirmationStatus: "confirmed" };
const employment: EmploymentInfo = {
  ...EMPTY_EMPLOYMENT,
  companyName: "テスト株式会社",
  companyAddress: "東京都テスト区9-9-9",
  industry: "5",
  capital: "10000000",
  employeeCount: "50",
  jobDescription: "事業の経営\n事業所の管理",
  monthlySalary: "300000",
};
const details: FormDetails = {
  ...EMPTY_FORM_DETAILS,
  corporateNumber: "1234567890123",
  employmentInsuranceNumber: "12345678901",
  occupationCode: "1",
  positionTitle: "代表取締役",
  experienceYears: "5",
  annualSales: "80000000",
  schoolName: "テスト大学",
  graduationDate: "2012-03-25",
  workHistory: [
    { id: "w1", joinedOn: "2015-04", leftOn: "2019-03", employer: "テスト商事" },
    { id: "w2", joinedOn: "2019-04", leftOn: "", employer: "テスト物産" },
  ],
};

async function open(buffer: Buffer | string) {
  const wb = new ExcelJS.Workbook();
  if (typeof buffer === "string") await wb.xlsx.readFile(buffer);
  else await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}
const sheet = (wb: ExcelJS.Workbook, name: string) => {
  const ws = wb.worksheets.find((s) => sheetKey(s.name) === sheetKey(name));
  if (!ws) throw new Error(`no sheet ${name}`);
  return ws;
};
const plain = (v: ExcelJS.CellValue): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in v) return v.richText.map((r) => r.text).join("");
  return typeof v === "object" ? JSON.stringify(v) : String(v);
};
const text = (wb: ExcelJS.Workbook, name: string, cell: string) => plain(sheet(wb, name).getCell(cell).value).trim();

describe("coeMappingM の座標（テンプレートとの整合）", () => {
  it("すべての項目が、様式Mの「入力欄（ロック解除セル）」の左上を指す", async () => {
    const wb = await open(COE_TEMPLATE_PATHS.M);
    for (const it of COE_M_FILL_ITEMS) {
      const c = sheet(wb, it.sheet).getCell(it.cell);
      expect(c.protection?.locked, `${it.sheet}!${it.cell} ${it.label}`).toBe(false);
      expect(c.isMerged ? c.master.address : c.address, `${it.sheet}!${it.cell} ${it.label}`).toBe(c.address);
    }
  });

  it("同じセルを2つの項目が指していない", () => {
    const keys = COE_M_FILL_ITEMS.map((i) => `${sheetKey(i.sheet)}!${i.cell}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("月額の□は、ラベル「月額」の左隣のセルである", async () => {
    const wb = await open(COE_TEMPLATE_PATHS.M);
    expect(text(wb, O1, "O84")).toBe("□");
    expect(text(wb, O1, "P84")).toBe("月額");
    expect(COE_M_PICK_ITEMS).toHaveLength(1);
  });
});

describe("fillCoeExcel（経営・管理 → 様式 M）", () => {
  it("第1表の入国目的の■と、様式Mの第2表・所属機関用1の代表的な値が入る", async () => {
    const { buffer, warnings } = await fillCoeExcel(applicant, employment, details, "経営・管理");
    const wb = await open(buffer);
    const t = (s: string, c: string) => text(wb, s, c);
    const cells = (s: string, cs: string[]) => cs.map((c) => t(s, c));

    expect(t(S1, "R41")).toBe("■"); // 11 入国目的（経営・管理）
    expect(t(S1, "G20")).toBe("TARO YAMADA");

    expect(t(A2, "E6")).toBe("テスト株式会社");
    expect(t(A2, "F9")).toBe("東京都テスト区9-9-9");
    expect(t(A2, "G20")).toBe("テスト大学");
    expect(cells(A2, ["W20", "AA20", "AE20"])).toEqual(["2012", "3", "25"]);
    expect(t(A2, "S40")).toBe("5");
    expect(cells(A2, ["A47", "C47", "E47", "G47", "I47"])).toEqual(["2015", "4", "2019", "3", "テスト商事"]);
    expect(cells(A2, ["A49", "E49", "I49"])).toEqual(["2019", "", "テスト物産"]);

    expect(t(O1, "S4")).toBe("TARO YAMADA");
    expect(t(O1, "E15")).toBe("テスト株式会社");
    expect("S T U V W X Y Z AA AB AC AD AE".split(" ").map((c) => t(O1, `${c}15`)).join("")).toBe("1234567890123");
    expect(["C", "D", "E", "F", "H", "I", "J", "K", "L", "M", "O"].map((c) => t(O1, `${c}23`)).join("")).toBe("12345678901");
    expect(t(O1, "AF28")).toBe("5");
    expect(t(O1, "G35")).toBe("東京都テスト区9-9-9");
    expect(t(O1, "Q42")).toBe("10000000");
    expect(t(O1, "K48")).toBe("80000000");
    expect(t(O1, "K51")).toBe("50");
    expect(t(O1, "AF69")).toBe("1");
    expect(cells(O1, ["B76", "B77"])).toEqual(["事業の経営", "事業所の管理"]);
    expect(t(O1, "B84")).toBe("300000");
    expect(t(O1, "O84")).toBe("■");
    expect(t(O1, "J87")).toBe("代表取締役");

    // 案件情報にない欄は、警告で案内する。第2表以降が未対応との警告は出ない
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("様式 M（経営・管理）");
    expect(warnings[0]).toContain("契約の形態");
  });

  it("様式Nの座標を、様式Mへ流用していない（様式Mの所属機関用1に、様式Nの位置の値が入らない）", async () => {
    const { buffer } = await fillCoeExcel(applicant, employment, details, "経営・管理");
    const wb = await open(buffer);
    expect(text(wb, O1, "P6")).toBe("");
    expect(text(wb, O1, "B94")).toBe("以上の記載内容は事実と相違ありません。"); // 印字の文字のまま
  });

  it("技術・人文知識・国際業務は、従来どおり様式Nで出力する", async () => {
    const { buffer } = await fillCoeExcel(applicant, employment, details, "技術・人文知識・国際業務");
    const wb = await open(buffer);
    expect(wb.worksheets.some((s) => sheetKey(s.name) === sheetKey("所属機関用１Ｎ"))).toBe(true);
    expect(text(wb, "所属機関用１Ｎ", "P6")).toBe("TARO YAMADA");
  });

  it("職歴が9件以上なら、様式Mの欄（8件分）に入らない分を警告する", async () => {
    const workHistory = Array.from({ length: 9 }, (_, i) => ({ id: `w${i}`, joinedOn: "2010-04", leftOn: "2011-03", employer: `会社${i}` }));
    const { warnings } = await fillCoeExcel(applicant, employment, { ...details, workHistory }, "経営・管理");
    expect(warnings.join("\n")).toContain("8件分");
  });
});
