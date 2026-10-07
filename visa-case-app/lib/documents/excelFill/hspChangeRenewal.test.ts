import ExcelJS from "exceljs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { HSP_CHANGE_FORM_TABLE, type CoeFormCode } from "../../hspForm";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type Applicant, type EmploymentInfo } from "../../types";
import { CHANGE_TEMPLATE_PATHS, fillChangeExcel } from "./change";
import { CHANGE_FILL_ITEMS, SHEET_CHANGE_APPLICANT_1 as CS1, SHEET_CHANGE_APPLICANT_2 as CS2 } from "./changeMapping";
import { fillOfficialExcel } from "./index";
import { RENEWAL_TEMPLATE_PATHS, fillRenewalExcel } from "./renewal";
import { RENEWAL_FILL_ITEMS, SHEET_APPLICANT_1 as RS1, SHEET_APPLICANT_2 as RS2, sheetKey } from "./renewalMapping";

// 高度専門職の変更・更新の様式切替（Issue #212）。第2表以降の座標は hspChangeTable2*.test.ts が検証する。
// ここでは、様式（テンプレート）の選択・第1表の差し込み・警告・第1表のみへの縮退を検証する。値はすべてダミー。

const applicant: Applicant = { ...EMPTY_APPLICANT, legalName: "TARO YAMADA", nationality: "テスト国", residenceStatus: "留学", confirmationStatus: "confirmed" };
const employment: EmploymentInfo = { ...EMPTY_EMPLOYMENT, companyName: "テスト株式会社", jobDescription: "業務" };
const details = (hspActivity = ""): FormDetails => ({
  ...EMPTY_FORM_DETAILS,
  placeOfBirth: "テスト市",
  hspActivity,
  workHistory: [{ id: "w1", joinedOn: "2015-04", leftOn: "2019-03", employer: "テスト商事" }],
});

async function open(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}
const cell = (wb: ExcelJS.Workbook, name: string, addr: string) => {
  const ws = wb.worksheets.find((w) => sheetKey(w.name) === sheetKey(name));
  const v = ws?.getCell(addr).value;
  return typeof v === "string" ? v : v == null ? "" : String((v as { text?: string }).text ?? v);
};
const sheetNames = (wb: ExcelJS.Workbook) => wb.worksheets.map((w) => sheetKey(w.name));
const tail = (p: string) => path.basename(p);

const GRADE1_CASES = Object.entries(HSP_CHANGE_FORM_TABLE).map(([k, form]) => {
  const [grade, activity] = k.split("|");
  return { grade, activity, form };
});

describe("テンプレートの対応", () => {
  it("変更・更新とも、様式 I・L・M・N・U のテンプレートが実在し、第1表のシートを持つ", async () => {
    for (const form of ["I", "L", "M", "N", "U"] as CoeFormCode[]) {
      const c = new ExcelJS.Workbook();
      await c.xlsx.readFile(CHANGE_TEMPLATE_PATHS[form]);
      expect(sheetNames(c)).toContain(sheetKey(CS1));
      const r = new ExcelJS.Workbook();
      await r.xlsx.readFile(RENEWAL_TEMPLATE_PATHS[form]);
      expect(sheetNames(r)).toContain(sheetKey(RS1));
    }
  });

  it("第1表の座標（様式 N と同じ）は、全様式で、ロック解除セルの左上を指す", async () => {
    for (const form of ["I", "L", "M", "U"] as CoeFormCode[]) {
      for (const [path_, items, s1] of [
        [CHANGE_TEMPLATE_PATHS[form], CHANGE_FILL_ITEMS, CS1],
        [RENEWAL_TEMPLATE_PATHS[form], RENEWAL_FILL_ITEMS, RS1],
      ] as const) {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(path_);
        const ws = wb.worksheets.find((w) => sheetKey(w.name) === sheetKey(s1))!;
        for (const it of items.filter((i) => sheetKey(i.sheet) === sheetKey(s1))) {
          const c = ws.getCell(it.cell);
          expect(c.protection?.locked, `${form} ${tail(path_)} ${it.cell} ${it.label}`).toBe(false);
          expect(c.isMerged ? c.master.address : c.address).toBe(c.address);
        }
      }
    }
  });
});

describe("変更（高度専門職）", () => {
  it.each(GRADE1_CASES)("$grade × $activity は、様式 $form を使う", async ({ grade, activity, form }) => {
    const { buffer, warnings } = await fillChangeExcel(applicant, employment, details(activity), grade);
    const wb = await open(buffer);
    expect(cell(wb, CS1, "G18")).toBe("TARO YAMADA"); // 第1表は全様式で同じ座標
    expect(cell(wb, CS1, "I45")).toBe(grade); // 13 希望する在留資格
    const names = sheetNames(wb);
    const expected = new ExcelJS.Workbook();
    await expected.xlsx.readFile(CHANGE_TEMPLATE_PATHS[form]);
    expect(names).toEqual(sheetNames(expected)); // 選んだ様式のテンプレートで出力されている
    expect(warnings.join("\n")).not.toContain("変更後の在留資格に合う様式");
    if (form === "N") {
      expect(cell(wb, CS2, "E8")).toBe("テスト株式会社"); // 様式 N は全表
    } else {
      expect(warnings.join("\n")).toContain(`様式 ${form}`);
    }
  });

  it("2号は、活動だけで様式を引く。2号の注意を添える", async () => {
    const { buffer, warnings } = await fillChangeExcel(applicant, employment, details("教授"), "高度専門職（2号）");
    const wb = await open(buffer);
    const expected = new ExcelJS.Workbook();
    await expected.xlsx.readFile(CHANGE_TEMPLATE_PATHS.I);
    expect(sheetNames(wb)).toEqual(sheetNames(expected));
    expect(cell(wb, CS1, "I45")).toBe("高度専門職（2号）");
    expect(warnings.join("\n")).toContain("2号で活動が変わる場合は、変更後の在留資格の案内ページの様式を確認してください");
  });

  it("2号で、活動が1号の表で一意に決まるなら、その様式を使う（医療は U）", async () => {
    const { buffer, warnings } = await fillChangeExcel(applicant, employment, details("医療"), "高度専門職（2号）");
    const expected = new ExcelJS.Workbook();
    await expected.xlsx.readFile(CHANGE_TEMPLATE_PATHS.U);
    expect(sheetNames(await open(buffer))).toEqual(sheetNames(expected));
    expect(warnings.join("\n")).toContain("2号で活動が変わる場合");
  });

  it("行う活動が未選択・表にない組み合わせは、様式 N の第1表のみ＋警告（例外を投げない）", async () => {
    for (const [target, activity, msg] of [
      ["高度専門職（1号ロ）", "", "行う活動を選択すると"],
      ["高度専門職（1号イ）", "医療", "様式を特定できません"],
      ["高度専門職", "教授", "号（イ・ロ・ハ）を選択"],
      ["高度専門職（2号）", "", "行う活動を選択すると"],
    ]) {
      const { buffer, warnings } = await fillChangeExcel(applicant, employment, details(activity), target);
      const wb = await open(buffer);
      expect(cell(wb, CS1, "G18"), target).toBe("TARO YAMADA");
      expect(cell(wb, CS2, "E8"), target).toBe(""); // 第2表以降は差し込まない
      const w = warnings.join("\n");
      expect(w, target).toContain(msg);
      expect(w, target).toContain("第1表（申請人用（変更）１）のみ");
    }
  });

  it("号なしの「経営・管理」は、従来どおり第1表のみ。高度専門職（1号ハ）＋経営・管理は様式 M", async () => {
    const plain = await fillChangeExcel(applicant, employment, details(), "経営・管理");
    expect(cell(await open(plain.buffer), CS2, "E8")).toBe("");
    expect(plain.warnings.join("\n")).toContain("第1表（申請人用（変更）１）のみ");
    const hsp = await fillChangeExcel(applicant, employment, details("経営・管理"), "高度専門職（1号ハ）");
    const expected = new ExcelJS.Workbook();
    await expected.xlsx.readFile(CHANGE_TEMPLATE_PATHS.M);
    expect(sheetNames(await open(hsp.buffer))).toEqual(sheetNames(expected));
    expect(hsp.warnings.join("\n")).toContain("様式 M");
    expect(hsp.warnings.join("\n")).not.toContain("のため、第1表（申請人用（変更）１）のみ差し込んでいます。第2表以降");
  });

  it("高度専門職ではない変更は、従来どおり（様式 N・全表）。活動は無視する", async () => {
    const { buffer } = await fillChangeExcel(applicant, employment, details("教授"), "技術・人文知識・国際業務");
    expect(cell(await open(buffer), CS2, "E8")).toBe("テスト株式会社");
  });

  it("様式 I の差し込み（index 経由）は、変更の様式 I のテンプレートを使う", async () => {
    const { buffer } = await fillOfficialExcel({
      procedureType: "change",
      currentStatus: "技術・人文知識・国際業務",
      applicant,
      employment,
      formDetails: details("教授"),
      targetStatus: "高度専門職（1号イ）",
    });
    const expected = new ExcelJS.Workbook();
    await expected.xlsx.readFile(CHANGE_TEMPLATE_PATHS.I);
    expect(sheetNames(await open(buffer))).toEqual(sheetNames(expected));
  });
});

describe("更新（高度専門職）", () => {
  const status = (g: string) => g;
  it.each(GRADE1_CASES)("$grade × $activity は、様式 $form を使う", async ({ grade, activity, form }) => {
    const { buffer, warnings } = await fillRenewalExcel(applicant, employment, details(activity), status(grade));
    const wb = await open(buffer);
    expect(cell(wb, RS1, "G18")).toBe("TARO YAMADA");
    const expected = new ExcelJS.Workbook();
    await expected.xlsx.readFile(RENEWAL_TEMPLATE_PATHS[form]);
    expect(sheetNames(wb)).toEqual(sheetNames(expected));
    if (form === "N") expect(cell(wb, RS2, "E9")).toBe("テスト株式会社");
    else expect(warnings.join("\n")).toContain(`様式 ${form}`);
  });

  it("号つきの申請人情報の在留資格で、号を補う（現在の在留資格が空・号なしのとき）", async () => {
    const a = { ...applicant, residenceStatus: "高度専門職（1号イ）" };
    for (const current of ["", "高度専門職"]) {
      const { buffer } = await fillRenewalExcel(a, employment, details("教授"), current);
      const expected = new ExcelJS.Workbook();
      await expected.xlsx.readFile(RENEWAL_TEMPLATE_PATHS.I);
      expect(sheetNames(await open(buffer)), current).toEqual(sheetNames(expected));
    }
  });

  it("号なしの既存データ（高度専門職）は、第1表のみ＋警告。例外を投げない", async () => {
    const { buffer, warnings } = await fillRenewalExcel(applicant, employment, details("教授"), "高度専門職");
    const wb = await open(buffer);
    expect(cell(wb, RS1, "G18")).toBe("TARO YAMADA");
    expect(cell(wb, RS2, "E9")).toBe("");
    expect(warnings.join("\n")).toContain("「現在の在留資格」で、号（イ・ロ・ハ）を選択");
    expect(warnings.join("\n")).toContain("第1表（申請人用（更新）１）のみ");
  });

  it("行う活動が未選択・表にない組み合わせは、第1表のみ＋警告", async () => {
    for (const [cur, activity, msg] of [
      ["高度専門職（1号ロ）", "", "行う活動を選択すると"],
      ["高度専門職（1号ハ）", "教授", "様式を特定できません"],
    ]) {
      const { buffer, warnings } = await fillRenewalExcel(applicant, employment, details(activity), cur);
      expect(cell(await open(buffer), RS2, "E9"), cur).toBe("");
      expect(warnings.join("\n"), cur).toContain(msg);
    }
  });

  it("2号の更新（no_renewal）は、例外にせず、第1表のみ＋「2号に更新はありません」", async () => {
    const { buffer, warnings } = await fillRenewalExcel(applicant, employment, details("教授"), "高度専門職（2号）");
    const wb = await open(buffer);
    expect(cell(wb, RS1, "G18")).toBe("TARO YAMADA");
    expect(cell(wb, RS2, "E9")).toBe("");
    expect(warnings.join("\n")).toContain("2号に更新はありません");
  });

  it("号なしの「経営・管理」は、従来どおり第1表のみ。高度専門職（1号ハ）＋経営・管理は様式 M", async () => {
    const plain = await fillRenewalExcel(applicant, employment, details(), "経営・管理");
    expect(cell(await open(plain.buffer), RS2, "E9")).toBe("");
    expect(plain.warnings.join("\n")).toContain("第1表（申請人用（更新）１）のみ");
    const hsp = await fillRenewalExcel(applicant, employment, details("経営・管理"), "高度専門職（1号ハ）");
    const expected = new ExcelJS.Workbook();
    await expected.xlsx.readFile(RENEWAL_TEMPLATE_PATHS.M);
    expect(sheetNames(await open(hsp.buffer))).toEqual(sheetNames(expected));
  });

  it("高度専門職の更新は、対象外の注意が付かない（index 経由）", async () => {
    const { warnings } = await fillOfficialExcel({
      procedureType: "renewal",
      currentStatus: "高度専門職（1号ロ）",
      applicant: { ...applicant, residenceStatus: "高度専門職（1号ロ）" },
      employment,
      formDetails: details("企業内転勤"),
    });
    expect(warnings.join("\n")).not.toContain("対象外の可能性");
  });
});
