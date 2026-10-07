import ExcelJS from "exceljs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT } from "../../types";
import { HSP_CHANGE_SPEC_L as SPEC } from "./hspChangeTable2L";
import { HSP_CHANGE_TABLE2 } from "./hspChangeTable2";
import { sheetKey, type FillCtx } from "./renewalMapping";

// 変更・更新 様式 L の第2表以降の座標の試験（Issue #212）。値はすべてダミー。実案件の個人情報は書かない。

const table = HSP_CHANGE_TABLE2.L; // 本番の経路（change.ts・renewal.ts）と同じ対応表を試験する

const DIR = path.join(process.cwd(), "docs", "official");
const TEMPLATES = { 変更: "change-application-form-L.xlsx", 更新: "renewal-application-form-L.xlsx" } as const;

const details: FormDetails = {
  ...EMPTY_FORM_DETAILS,
  corporateNumber: "1234567890123",
  employmentInsuranceNumber: "12345678901",
  occupationCode: "1",
  positionTitle: "部長",
  workHistory: [
    { id: "w1", joinedOn: "2015-04", leftOn: "2019-03", employer: "テスト商事" },
    { id: "w2", joinedOn: "2019-04", leftOn: "", employer: "テスト物産" },
  ],
};
const ctx: FillCtx = {
  a: { ...EMPTY_APPLICANT, legalName: "TARO YAMADA", residenceCardNumber: "AB12345678CD" },
  e: { ...EMPTY_EMPLOYMENT, companyName: "テスト株式会社", monthlySalary: "300000", jobDescription: "1行目\n2行目" },
  f: details,
} as FillCtx;

async function open(file: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(DIR, file));
  return wb;
}
const sheet = (wb: ExcelJS.Workbook, name: string) => {
  const ws = wb.worksheets.find((s) => sheetKey(s.name) === sheetKey(name));
  if (!ws) throw new Error(`no sheet ${name}`);
  return ws;
};
const plain = (v: ExcelJS.CellValue): string => (v === null || v === undefined ? "" : typeof v === "object" && "richText" in v ? v.richText.map((r) => r.text).join("") : String(v));

describe.each(Object.entries(TEMPLATES))("様式 L（%s）の第2表以降の座標", (_proc, file) => {
  it("すべての項目が、様式の「入力欄（ロック解除セル）」の左上を指す", async () => {
    const wb = await open(file);
    for (const it of table.fill) {
      const c = sheet(wb, it.sheet).getCell(it.cell);
      expect(c.protection?.locked, `${it.sheet}!${it.cell} ${it.label}`).toBe(false);
      expect(c.isMerged ? c.master.address : c.address, `${it.sheet}!${it.cell} ${it.label}`).toBe(c.address);
    }
  });

  it("「月額」の□は、ラベル「月額」の左隣のセルである", async () => {
    const wb = await open(file);
    for (const p of table.pick) {
      for (const cell of Object.keys(p.writes["月額"])) {
        const c = sheet(wb, p.sheet).getCell(cell);
        expect(plain(c.value).trim(), `${p.sheet}!${cell}`).toBe("□");
        expect(c.protection?.locked).toBe(false);
        expect(plain(sheet(wb, p.sheet).getCell(c.row, c.col + 1).value).trim()).toBe("月額");
      }
    }
  });
});

describe("様式 L の対応表", () => {
  it("同じセルを2つの項目が指していない", () => {
    const keys = table.fill.map((i) => `${sheetKey(i.sheet)}!${i.cell}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("変更と更新で、対象シートのロック解除セルが一致する（座標を共有できる）", async () => {
    const [ch, re] = [await open(TEMPLATES.変更), await open(TEMPLATES.更新)];
    for (const name of new Set(table.fill.map((i) => i.sheet))) {
      const cells = (wb: ExcelJS.Workbook) => {
        const out: string[] = [];
        sheet(wb, name).eachRow({ includeEmpty: true }, (r) => r.eachCell({ includeEmpty: true }, (c) => c.protection?.locked === false && out.push(c.address)));
        return out.join();
      };
      expect(cells(ch), name).toBe(cells(re));
    }
  });

  it("manual の欄は、案件情報から差し込む項目と重ならない（manual が空でない）", () => {
    expect(table.manual).toContain("派遣元");
    expect(table.fill.some((i) => i.label.includes("派遣元"))).toBe(false);
  });

  it("職歴は6件（3行×左右）で、左の列を先に埋める", () => {
    expect(table.maxWork).toBe(6);
    const at = (label: string) => table.fill.find((i) => i.label === label)!;
    expect(at("職歴（1行目） 入社（年）").cell).toBe("A37");
    expect(at("職歴（4行目） 入社（年）").cell).toBe("R37");
    expect(at("職歴（6行目） 勤務先名称").cell).toBe("Z41");
  });

  it("代表的な値が、意図した項目に入る", () => {
    const get = (label: string) => table.fill.find((i) => i.label === label)!.get(ctx);
    expect(get("勤務先 名称")).toBe("テスト株式会社");
    expect(get("契約等をする外国人の氏名")).toBe("TARO YAMADA");
    expect(get("在留カード番号")).toBe("AB12345678CD");
    expect(get("職種（主たる職種の番号）")).toBe("1");
    expect(get("活動内容詳細（2行目）")).toBe("2行目");
    expect(get("職務上の地位（役職名）")).toBe("部長");
    expect(get("職歴（1行目） 入社（年）")).toBe("2015");
    expect(get("職歴（2行目） 退社（年）")).toBe("");
    const digits = (prefix: string) => table.fill.filter((i) => i.label.startsWith(prefix)).map((i) => i.get(ctx)).join("");
    expect(digits("法人番号")).toBe("1234567890123");
    expect(digits("雇用保険適用事業所番号")).toBe("12345678901");
    expect(table.pick[0].get(ctx)).toBe("月額");
    expect(SPEC.monthlyBox).toEqual(["所属機関用１Ｌ", "O52"]);
  });
});
