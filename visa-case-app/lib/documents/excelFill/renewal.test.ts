import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type Applicant, type EmploymentInfo } from "../../types";
import { RENEWAL_TEMPLATE_PATH, fillRenewalExcel } from "./renewal";
import {
  RENEWAL_FILL_ITEMS,
  RENEWAL_PICK_ITEMS,
  SHEET_APPLICANT_1,
  SHEET_APPLICANT_2,
  SHEET_ORG_1,
  SHEET_ORG_2,
  sheetKey,
} from "./renewalMapping";

// テストの書き方（#80・#84・#86・#88 も同じ方式）は docs/phase11-renewal-fill-engine.md を参照。
// 値はすべてダミー。実案件の個人情報は書かない。

const applicant: Applicant = {
  ...EMPTY_APPLICANT,
  legalName: "TARO YAMADA",
  nationality: "テスト国",
  dateOfBirth: "1990-04-01",
  gender: "男",
  address: "東京都テスト区1-2-3",
  residenceStatus: "技術・人文知識・国際業務",
  residenceExpiryDate: "2026-12-31",
  residenceCardNumber: "AB12345678CD",
  confirmationStatus: "confirmed",
};
const employment: EmploymentInfo = {
  ...EMPTY_EMPLOYMENT,
  companyName: "テスト株式会社",
  companyAddress: "東京都テスト区9-9-9",
  industry: "5",
  capital: "10000000",
  employeeCount: "50",
  jobDescription: "システム開発業務\nテスト設計",
  monthlySalary: "300000",
  employmentStartDate: "2020-04-01",
};
const details: FormDetails = {
  ...EMPTY_FORM_DETAILS,
  maritalStatus: "single",
  occupation: "会社員",
  passportNumber: "TE1234567",
  passportExpiry: "2030-05-06",
  periodOfStay: "1年",
  corporateNumber: "1234567890123",
  employmentInsuranceNumber: "12345678901",
  occupationCode: "3",
  relativesPresent: "yes",
  relatives: [
    { id: "r1", relationship: "配偶者", name: "HANAKO YAMADA", dateOfBirth: "1992-02-03", nationality: "テスト国", workplace: "", livesTogether: "yes", cardNumber: "ZZ00000000XX" },
  ],
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
/** セルの値を、書式（リッチテキストのフォント等）を除いた文字列にする */
const plain = (v: ExcelJS.CellValue): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in v) return v.richText.map((r) => r.text).join("");
  return typeof v === "object" ? JSON.stringify(v) : String(v);
};
const text = (wb: ExcelJS.Workbook, name: string, cell: string) => {
  return plain(sheet(wb, name).getCell(cell).value);
};

describe("renewalMapping の座標（テンプレートとの整合）", () => {
  it("すべての項目が、実在するシートの「入力欄（ロック解除セル）」の左上を指す", async () => {
    const wb = await open(RENEWAL_TEMPLATE_PATH);
    for (const it of RENEWAL_FILL_ITEMS) {
      const c = sheet(wb, it.sheet).getCell(it.cell);
      expect(c.protection?.locked, `${it.sheet}!${it.cell} ${it.label}`).toBe(false);
      // 結合セルは左上のセルを指定していること（それ以外に書くと、値が消える）
      expect(c.isMerged ? c.master.address : c.address, `${it.sheet}!${it.cell} ${it.label}`).toBe(c.address);
    }
  });

  it("同じセルを2つの項目が指していない", () => {
    const keys = RENEWAL_FILL_ITEMS.map((i) => `${sheetKey(i.sheet)}!${i.cell}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("選択式の項目（性別・配偶者）の書き換え先は、ラベルの文字があるセルである", async () => {
    const wb = await open(RENEWAL_TEMPLATE_PATH);
    expect(text(wb, SHEET_APPLICANT_1, "E21")).toBe("男");
    expect(text(wb, SHEET_APPLICANT_1, "F21")).toBe("・");
    expect(text(wb, SHEET_APPLICANT_1, "G21")).toBe("女");
    expect(text(wb, SHEET_APPLICANT_1, "Y21")).toBe("有・無");
    expect(RENEWAL_PICK_ITEMS.map((p) => p.no)).toEqual(["4", "5", "15", "16", "16", "16", "16", "16", "16", "16"]);
  });
});

describe("fillRenewalExcel", () => {
  it("経営・管理の更新は、第1表だけ差し込み、第2表以降は空欄のまま警告する（Issue #191）", async () => {
    const { buffer, warnings } = await fillRenewalExcel(applicant, employment, details, "経営・管理");
    const wb = await open(buffer);
    expect(text(wb, SHEET_APPLICANT_1, "G18")).toBe("TARO YAMADA");
    expect(text(wb, SHEET_APPLICANT_2, "E9")).toBe(""); // 申請人用２N（様式Nの表）は差し込まない
    expect(warnings.join("\n")).toContain("第1表（申請人用（更新）１）のみ");
  });

  it("代表的な入力値が、意図したセルに入る", async () => {
    const { buffer, warnings } = await fillRenewalExcel(applicant, employment, details);
    const wb = await open(buffer);
    const t = (s: string, c: string) => text(wb, s, c);

    // 申請人等作成用1
    expect(t(SHEET_APPLICANT_1, "G15")).toBe("テスト国"); // 1 国籍
    expect([t(SHEET_APPLICANT_1, "W15"), t(SHEET_APPLICANT_1, "AC15"), t(SHEET_APPLICANT_1, "AG15")]).toEqual(["1990", "4", "1"]); // 2 生年月日
    expect(t(SHEET_APPLICANT_1, "G18")).toBe("TARO YAMADA"); // 3 氏名
    expect([t(SHEET_APPLICANT_1, "E21"), t(SHEET_APPLICANT_1, "F21"), t(SHEET_APPLICANT_1, "G21")]).toEqual(["男", "", ""]); // 4 性別
    expect(t(SHEET_APPLICANT_1, "Y21")).toBe("無"); // 5 配偶者の有無
    expect(t(SHEET_APPLICANT_1, "G27")).toBe("東京都テスト区1-2-3"); // 8 住居地
    expect(t(SHEET_APPLICANT_1, "I33")).toBe("TE1234567"); // 10 旅券番号
    expect([t(SHEET_APPLICANT_1, "X33"), t(SHEET_APPLICANT_1, "AD33"), t(SHEET_APPLICANT_1, "AH33")]).toEqual(["2030", "5", "6"]);
    expect(t(SHEET_APPLICANT_1, "I36")).toBe("技術・人文知識・国際業務"); // 11 在留資格
    expect([t(SHEET_APPLICANT_1, "I39"), t(SHEET_APPLICANT_1, "O39"), t(SHEET_APPLICANT_1, "S39")]).toEqual(["2026", "12", "31"]);
    expect(t(SHEET_APPLICANT_1, "I42")).toBe("AB12345678CD"); // 12 在留カード番号
    expect(t(SHEET_APPLICANT_1, "A64")).toBe("配偶者"); // 16 在日親族 1人目
    expect(t(SHEET_APPLICANT_1, "M64")).toBe("1992/02/03");
    expect(t(SHEET_APPLICANT_1, "AE64")).toBe("ZZ00000000XX");
    expect(t(SHEET_APPLICANT_1, "A66")).toBe(""); // 2人目は空欄のまま
    expect([t(SHEET_APPLICANT_1, "C53"), t(SHEET_APPLICANT_1, "D53"), t(SHEET_APPLICANT_1, "AG53"), t(SHEET_APPLICANT_1, "AH53"), t(SHEET_APPLICANT_1, "AI53")]).toEqual(["有", "（具体的内容", "）", "・", "無"]); // 15 犯罪歴は未入力のため原本のまま
    expect(t(SHEET_APPLICANT_1, "C58")).toBe("有"); // 16 在日親族の有無（有）
    expect(t(SHEET_APPLICANT_1, "D58")).toBe("（「有」の場合は，以下の欄に在日親族及び同居者を記入してください。）");
    expect(t(SHEET_APPLICANT_1, "T64")).toBe("有"); // 16 同居の有無（1人目）
    expect(t(SHEET_APPLICANT_1, "T66")).toBe("有・無"); // 2人目は空欄のため未選択のまま

    // 申請人等作成用2（N）
    expect(t(SHEET_APPLICANT_2, "E9")).toBe("テスト株式会社"); // 17 勤務先名称
    expect(t(SHEET_APPLICANT_2, "F11")).toBe("東京都テスト区9-9-9");
    expect([t(SHEET_APPLICANT_2, "A49"), t(SHEET_APPLICANT_2, "C49"), t(SHEET_APPLICANT_2, "E49"), t(SHEET_APPLICANT_2, "G49"), t(SHEET_APPLICANT_2, "I49")]).toEqual(["2015", "4", "2019", "3", "テスト商事"]); // 21 職歴
    expect([t(SHEET_APPLICANT_2, "A51"), t(SHEET_APPLICANT_2, "E51"), t(SHEET_APPLICANT_2, "I51")]).toEqual(["2019", "", "テスト物産"]); // 在職中は退社欄が空

    // 所属機関等作成用1（N）
    expect(t(SHEET_ORG_1, "G9")).toBe("TARO YAMADA");
    expect(t(SHEET_ORG_1, "G24")).toBe("テスト株式会社"); // 3(1) 名称
    const corp = "T U V W X Y Z AA AB AC AD AE AF".split(" ").map((c) => t(SHEET_ORG_1, `${c}24`)).join("");
    expect(corp).toBe("1234567890123"); // 3(2) 法人番号（1桁ずつ）
    const ins = ["E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "Q"].map((c) => t(SHEET_ORG_1, `${c}32`)).join("");
    expect(ins).toBe("12345678901"); // 3(4) 雇用保険適用事業所番号
    expect(t(SHEET_ORG_1, "AD36")).toBe("5"); // 3(5) 業種（番号）
    expect(t(SHEET_ORG_1, "H46")).toBe("10000000"); // 3(7) 資本金
    expect([t(SHEET_ORG_1, "E59"), t(SHEET_ORG_1, "H59"), t(SHEET_ORG_1, "K59")]).toEqual(["2020", "4", "1"]); // 5 雇用開始
    expect(t(SHEET_ORG_1, "D66")).toBe("300000"); // 6 給与
    expect(t(SHEET_ORG_1, "AG72")).toBe("3"); // 9 職種（番号）
    expect([t(SHEET_ORG_1, "D100"), t(SHEET_ORG_1, "D101")]).toEqual(["システム開発業務", "テスト設計"]); // 10 活動内容

    expect(warnings).toEqual([]);
  });

  it("性別が女の場合は、「女」だけを残す", async () => {
    const { buffer } = await fillRenewalExcel({ ...applicant, gender: "女" }, employment, details);
    const wb = await open(buffer);
    expect([text(wb, SHEET_APPLICANT_1, "E21"), text(wb, SHEET_APPLICANT_1, "F21"), text(wb, SHEET_APPLICANT_1, "G21")]).toEqual(["", "", "女"]);
  });

  it("犯罪歴「有」・在日親族「無」の場合は、その側だけを残す", async () => {
    const { buffer, warnings } = await fillRenewalExcel(applicant, employment, {
      ...details,
      criminalRecord: "yes",
      criminalDetail: "テスト処分",
      relativesPresent: "no",
    });
    const wb = await open(buffer);
    const t = (s: string, c: string) => text(wb, s, c);
    expect(t(SHEET_APPLICANT_1, "I53")).toBe("テスト処分"); // 15 具体的内容
    expect([t(SHEET_APPLICANT_1, "AH53"), t(SHEET_APPLICANT_1, "AI53")]).toEqual(["", ""]); // 15 有
    expect([t(SHEET_APPLICANT_1, "C53"), t(SHEET_APPLICANT_1, "D53"), t(SHEET_APPLICANT_1, "AG53")]).toEqual(["有", "（具体的内容", "）"]);
    expect([t(SHEET_APPLICANT_1, "C58"), t(SHEET_APPLICANT_1, "D58")]).toEqual(["", "無"]); // 16 無
    expect(t(SHEET_APPLICANT_1, "A64")).toBe(""); // 親族なしのため1人目も空欄
    expect(t(SHEET_APPLICANT_1, "T64")).toBe("有・無"); // 相手が入力されないため未選択のまま
    expect(warnings).toEqual([]);
  });

  it("入力がなければ、すべてのシートがテンプレートの元の状態のまま", async () => {
    const { buffer } = await fillRenewalExcel(EMPTY_APPLICANT, EMPTY_EMPLOYMENT, EMPTY_FORM_DETAILS);
    const out = await open(buffer);
    const tpl = await open(RENEWAL_TEMPLATE_PATH);
    for (const name of [SHEET_APPLICANT_1, SHEET_APPLICANT_2, SHEET_ORG_1, SHEET_ORG_2]) {
      const a = sheet(tpl, name);
      const b = sheet(out, name);
      const diffs: string[] = [];
      a.eachRow({ includeEmpty: true }, (row) =>
        row.eachCell({ includeEmpty: true }, (c) => {
          const after = b.getCell(c.address).value;
          if (plain(c.value) !== plain(after)) diffs.push(c.address);
        }),
      );
      expect(diffs, name).toEqual([]);
    }
  });

  it("A4・シート保護・結合セルが、出力後も保たれる", async () => {
    const { buffer } = await fillRenewalExcel(applicant, employment, details);
    const out = await open(buffer);
    const tpl = await open(RENEWAL_TEMPLATE_PATH);
    for (const name of [SHEET_APPLICANT_1, SHEET_APPLICANT_2, SHEET_ORG_1, SHEET_ORG_2]) {
      const a = sheet(tpl, name);
      const b = sheet(out, name);
      expect(b.pageSetup.paperSize, name).toBe(9); // 9 = A4
      expect(b.pageSetup.scale, name).toBe(a.pageSetup.scale);
      expect(b.pageSetup.orientation, name).toBe("portrait");
      expect((b as unknown as { sheetProtection?: unknown }).sheetProtection, name).toBeTruthy();
      expect([...b.model.merges].sort(), name).toEqual([...a.model.merges].sort());
    }
  });

  it("申請人情報が確定していない場合は、注意文言を返す", async () => {
    const { warnings } = await fillRenewalExcel({ ...applicant, confirmationStatus: "draft" }, employment, details);
    expect(warnings).toContain("申請人情報が確定していません。すべての項目を、原本と照合してから使用してください。");
  });

  it("様式の欄に収まらない・形式が合わない入力は、警告する", async () => {
    const relatives = Array.from({ length: 7 }, (_, i) => ({ ...details.relatives[0], id: `r${i}` }));
    const { warnings } = await fillRenewalExcel(
      applicant,
      { ...employment, industry: "情報通信業", jobDescription: "a\nb\nc" },
      { ...details, relatives, corporateNumber: "123", occupationCode: "技術" },
    );
    const joined = warnings.join("\n");
    expect(joined).toContain("在日親族");
    expect(joined).toContain("活動内容詳細");
    expect(joined).toContain("業種が番号ではない");
    expect(joined).toContain("職種が番号ではない");
    expect(joined).toContain("法人番号が13桁ではありません");
  });
});
