import path from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type Applicant, type EmploymentInfo } from "../../types";
import { HSP_CHANGE_SPEC_M } from "./hspChangeTable2M";
import { fillWorkbook } from "./fillWorkbook";
import { sheetKey, type FillCtx } from "./renewalMapping";
import { HSP_CHANGE_TABLE2 } from "./hspChangeTable2";

// 変更・更新の様式 M の第2表以降の座標の試験（Issue #212）。値はすべてダミー。実案件の個人情報は書かない。
// 変更と更新は座標が同一のため、同じ対応表を、両方の雛形に対して検証する。

const official = (file: string) => path.join(process.cwd(), "docs", "official", file);
const TEMPLATES = { 変更: official("change-application-form-M.xlsx"), 更新: official("renewal-application-form-M.xlsx") };
const table = HSP_CHANGE_TABLE2.M; // 本番の経路（change.ts・renewal.ts）と同じ対応表を試験する

const applicant: Applicant = { ...EMPTY_APPLICANT, legalName: "TARO YAMADA", residenceCardNumber: "AB12345678CD", confirmationStatus: "confirmed" };
const employment: EmploymentInfo = {
  ...EMPTY_EMPLOYMENT,
  companyName: "テスト株式会社",
  companyAddress: "東京都テスト区9-9-9",
  industry: "5",
  capital: "10000000",
  employeeCount: "50",
  jobDescription: "活動内容の1行目\n活動内容の2行目",
  monthlySalary: "300000",
};
const details: FormDetails = {
  ...EMPTY_FORM_DETAILS,
  corporateNumber: "1234567890123",
  employmentInsuranceNumber: "12345678901",
  occupationCode: "1",
  positionTitle: "部長",
  experienceYears: "5",
  annualSales: "80000000",
  foreignStaffCount: "3",
  schoolName: "テスト大学",
  graduationDate: "2012-03-25",
  legalRepName: "代理 太郎",
  agentName: "取次 花子",
  workHistory: [
    { id: "w1", joinedOn: "2015-04", leftOn: "2019-03", employer: "テスト商事" },
    { id: "w2", joinedOn: "2019-04", leftOn: "", employer: "テスト物産" },
  ],
};
const ctx: FillCtx = { a: applicant, e: employment, f: details, targetStatus: "" };

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

describe.each(Object.entries(TEMPLATES))("様式 M の第2表以降の座標（%s の雛形との整合）", (_proc, file) => {
  it("すべての項目が、様式の「入力欄（ロック解除セル）」の左上を指す", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    for (const it of table.fill) {
      const c = sheet(wb, it.sheet).getCell(it.cell);
      expect(c.protection?.locked, `${it.sheet}!${it.cell} ${it.label}`).toBe(false);
      expect(c.isMerged ? c.master.address : c.address, `${it.sheet}!${it.cell} ${it.label}`).toBe(c.address);
    }
  });

  it("「月額」の□は、ラベル「月額」の左隣のセルである（□がある様式のみ）", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    for (const p of table.pick) {
      for (const cell of Object.keys(p.writes["月額"])) {
        const c = sheet(wb, p.sheet).getCell(cell);
        expect(plain(c.value).trim(), `${p.sheet}!${cell}`).toBe("□");
        const right = sheet(wb, p.sheet).getCell(c.row, c.col + 1);
        expect(plain(right.value).trim(), `${p.sheet}!${cell}`).toBe("月額");
      }
    }
  });
});

describe("様式 M の対応表", () => {
  it("同じセルを2つの項目が指していない", () => {
    const keys = table.fill.map((i) => `${sheetKey(i.sheet)}!${i.cell}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("案件情報にない欄を manual に書いている", () => {
    expect(table.manual).not.toBe("");
  });

  it("職歴の欄数が、座標から数えた件数と一致する", () => {
    expect(table.maxWork).toBe(HSP_CHANGE_SPEC_M.work.rows.length * 2);
  });

  it.each(Object.entries(TEMPLATES))("代表的な値が、意図したセルに入る（%s の雛形）", async (_proc, file) => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await fillWorkbook(file, ctx, table.fill, table.pick)) as unknown as ArrayBuffer);
    const at = (label: string) => {
      const it = table.fill.find((i) => i.label === label);
      if (!it) throw new Error(`no item ${label}`);
      return text(wb, it.sheet, it.cell);
    };
    expect(at("勤務先 名称") || at("所属機関 名称")).toBe("テスト株式会社");
    expect(at("契約等をする外国人の氏名")).toBe("TARO YAMADA");
    expect(at("在留カード番号")).toBe("AB12345678CD");
    expect(at("勤務先 所在地")).toBe("東京都テスト区9-9-9");
    expect(at("職種（主たる職種の番号）")).toBe("1");
    expect(at("活動内容詳細（1行目）")).toBe("活動内容の1行目");
    expect(at("活動内容詳細（2行目）")).toBe("活動内容の2行目");
    expect(at("職務上の地位（役職名）")).toBe("部長");
    expect(at("給与・報酬（税引き前）")).toBe("300000");
    expect(at("代理人 氏名")).toBe("代理 太郎");
    expect(at("取次者 氏名")).toBe("取次 花子");
    expect(at("職歴（1行目） 入社（年）")).toBe("2015");
    expect(at("職歴（1行目） 勤務先名称")).toBe("テスト商事");
    expect(at("職歴（2行目） 退社（年）")).toBe("");
    const digits = (prefix: string) => table.fill.filter((i) => i.label.startsWith(prefix)).map((i) => text(wb, i.sheet, i.cell)).join("");
    expect(digits("法人番号")).toBe("1234567890123");
    expect(digits("雇用保険適用事業所番号")).toBe("12345678901");
    for (const p of table.pick) expect(text(wb, p.sheet, Object.keys(p.writes["月額"])[0])).toBe("■");
  });
});
