import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { CoeFormCode } from "../../hspForm";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type Applicant, type EmploymentInfo } from "../../types";
import { COE_TEMPLATE_PATHS, fillCoeExcel } from "./coe";
import { COE_TABLE2 } from "./coeTable2";
import { sheetKey } from "./renewalMapping";

// 様式 I・L・M・U の第2表以降の差し込みの試験（Issue #187・#191）。値はすべてダミー。実案件の個人情報は書かない。

const FORMS = ["I", "L", "M", "U"] as const;

const applicant: Applicant = { ...EMPTY_APPLICANT, legalName: "TARO YAMADA", nationality: "テスト国", dateOfBirth: "1990-04-01", gender: "男", confirmationStatus: "confirmed" };
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

describe.each(FORMS)("様式 %s の第2表以降の座標（テンプレートとの整合）", (form: Exclude<CoeFormCode, "N">) => {
  const table = COE_TABLE2[form];

  it("すべての項目が、様式の「入力欄（ロック解除セル）」の左上を指す", async () => {
    const wb = await open(COE_TEMPLATE_PATHS[form]);
    for (const it of table.fill) {
      const c = sheet(wb, it.sheet).getCell(it.cell);
      expect(c.protection?.locked, `${it.sheet}!${it.cell} ${it.label}`).toBe(false);
      expect(c.isMerged ? c.master.address : c.address, `${it.sheet}!${it.cell} ${it.label}`).toBe(c.address);
    }
  });

  it("同じセルを2つの項目が指していない", () => {
    const keys = table.fill.map((i) => `${sheetKey(i.sheet)}!${i.cell}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("「月額」の□は、ラベル「月額」の左隣のセルである", async () => {
    const wb = await open(COE_TEMPLATE_PATHS[form]);
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

const CASES: [CoeFormCode, string, string][] = [
  ["I", "高度専門職（1号イ）", "教授"],
  ["L", "高度専門職（1号ロ）", "企業内転勤"],
  ["M", "高度専門職（1号ハ）", "経営・管理"],
  ["U", "高度専門職（1号ロ）", "法律・会計業務"],
];

describe("fillCoeExcel（様式 I・L・M・U）", () => {
  it.each(CASES)("様式 %s：代表的な値が、第2表以降の意図したセルに入る", async (form, grade, activity) => {
    const { buffer, warnings } = await fillCoeExcel(applicant, employment, { ...details, hspActivity: activity }, grade);
    const wb = await open(buffer);
    const table = COE_TABLE2[form as Exclude<CoeFormCode, "N">];
    const at = (label: string) => {
      const it = table.fill.find((i) => i.label === label);
      if (!it) throw new Error(`no item ${label}`);
      return text(wb, it.sheet, it.cell);
    };
    expect(at("勤務先 名称") || at("所属機関 名称")).toBe("テスト株式会社");
    expect(at("契約等をする外国人の氏名")).toBe("TARO YAMADA");
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
    expect(warnings.join("\n")).toContain(table.manual);
  });

  it("様式U：卒業年月・学校名が申請人用３に入る", async () => {
    const { buffer } = await fillCoeExcel(applicant, employment, { ...details, hspActivity: "法律・会計業務" }, "高度専門職（1号ロ）");
    const wb = await open(buffer);
    expect(text(wb, "申請人用（認定）３Ｕ", "G22")).toBe("テスト大学");
    expect(text(wb, "申請人用（認定）３Ｕ", "G28")).toBe("2012");
    expect(text(wb, "申請人用（認定）３Ｕ", "M28")).toBe("3");
  });

  it("職歴が様式の欄に入らない場合は、様式ごとの件数で警告する（様式L=6件、様式U=8件）", async () => {
    const workHistory = Array.from({ length: 9 }, (_, i) => ({ id: `w${i}`, joinedOn: "2010-04", leftOn: "2011-03", employer: `会社${i}` }));
    const l = await fillCoeExcel(applicant, employment, { ...details, workHistory, hspActivity: "企業内転勤" }, "高度専門職（1号ロ）");
    expect(l.warnings.join("\n")).toContain("6件分");
    const u = await fillCoeExcel(applicant, employment, { ...details, workHistory, hspActivity: "法律・会計業務" }, "高度専門職（1号ロ）");
    expect(u.warnings.join("\n")).toContain("8件分");
  });

  it("行う活動が未選択の高度専門職は、様式Nの第1表だけを差し込み、様式Nの第2表以降を差し込まない", async () => {
    const { buffer } = await fillCoeExcel(applicant, employment, details, "高度専門職（1号ロ）");
    const wb = await open(buffer);
    expect(text(wb, "申請人用２Ｎ", "E8")).toBe("");
  });

  it("経営・管理（高度専門職ではない）は、様式Mで出力し、様式Nの座標を流用しない", async () => {
    const { buffer } = await fillCoeExcel(applicant, employment, details, "経営・管理");
    const wb = await open(buffer);
    expect(text(wb, "所属機関用１M", "E15")).toBe("テスト株式会社");
    expect(text(wb, "所属機関用１M", "P6")).toBe("");
  });

  it("技術・人文知識・国際業務は、従来どおり様式Nで出力する", async () => {
    const { buffer } = await fillCoeExcel(applicant, employment, details, "技術・人文知識・国際業務");
    const wb = await open(buffer);
    expect(text(wb, "所属機関用１Ｎ", "P6")).toBe("TARO YAMADA");
  });
});
