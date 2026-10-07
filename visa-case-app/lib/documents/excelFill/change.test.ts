import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, getFormLayout, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type Applicant, type EmploymentInfo } from "../../types";
import { CHANGE_TEMPLATE_PATH, fillChangeExcel } from "./change";
import {
  CHANGE_FILL_ITEMS,
  CHANGE_PICK_ITEMS,
  SHEET_CHANGE_APPLICANT_1 as S1,
  SHEET_CHANGE_APPLICANT_2 as S2,
  SHEET_CHANGE_ORG_1 as O1,
  SHEET_CHANGE_ORG_2 as O2,
  sheetKey,
} from "./changeMapping";

// 方式は renewal.test.ts と同じ（docs/phase11-fill-engines.md の更新編、本様式は同変更編）。
// 値はすべてダミー。実案件の個人情報は書かない。

const applicant: Applicant = {
  ...EMPTY_APPLICANT,
  legalName: "TARO YAMADA",
  nationality: "テスト国",
  dateOfBirth: "1990-04-01",
  gender: "男",
  address: "東京都テスト区1-2-3",
  residenceStatus: "留学",
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
  employmentStartDate: "2027-04-01",
};
const details: FormDetails = {
  ...EMPTY_FORM_DETAILS,
  placeOfBirth: "テスト市",
  maritalStatus: "single",
  occupation: "学生",
  homeAddress: "テスト国テスト市1",
  phone: "03-0000-0000",
  mobilePhone: "090-0000-0000",
  passportNumber: "TE1234567",
  passportExpiry: "2030-05-06",
  periodOfStay: "1年",
  desiredPeriod: "3年",
  changeReason: "ダミーの変更理由",
  renewalReason: "更新の理由（変更様式には書かれない）",
  corporateNumber: "1234567890123",
  employmentInsuranceNumber: "12345678901",
  occupationCode: "3",
  criminalRecord: "yes",
  criminalDetail: "ダミーの処分",
  relativesPresent: "yes",
  relatives: [
    { id: "r1", relationship: "配偶者", name: "HANAKO YAMADA", dateOfBirth: "1992-02-03", nationality: "テスト国", workplace: "", livesTogether: "yes", cardNumber: "ZZ00000000XX" },
  ],
  workHistory: [
    { id: "w1", joinedOn: "2015-04", leftOn: "2019-03", employer: "テスト商事" },
    { id: "w2", joinedOn: "2019-04", leftOn: "", employer: "テスト物産" },
  ],
  legalRepName: "代理人テスト",
  agentName: "取次テスト",
  agentAffiliation: "テスト事務所",
  agentPhone: "03-1111-1111",
};
const TARGET = "技術・人文知識・国際業務";

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
const text = (wb: ExcelJS.Workbook, name: string, cell: string) => plain(sheet(wb, name).getCell(cell).value);

describe("changeMapping の座標（テンプレートとの整合）", () => {
  it("すべての項目が、実在するシートの「入力欄（ロック解除セル）」の左上を指す", async () => {
    const wb = await open(CHANGE_TEMPLATE_PATH);
    for (const it of CHANGE_FILL_ITEMS) {
      const c = sheet(wb, it.sheet).getCell(it.cell);
      expect(c.protection?.locked, `${it.sheet}!${it.cell} ${it.label}`).toBe(false);
      expect(c.isMerged ? c.master.address : c.address, `${it.sheet}!${it.cell} ${it.label}`).toBe(c.address);
    }
  });

  it("同じセルを2つの項目が指していない", () => {
    const keys = CHANGE_FILL_ITEMS.map((i) => `${sheetKey(i.sheet)}!${i.cell}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("選択式の項目（性別・配偶者）の書き換え先は、ラベルの文字があるセルである", async () => {
    const wb = await open(CHANGE_TEMPLATE_PATH);
    expect(text(wb, S1, "E21")).toBe("男");
    expect(text(wb, S1, "F21")).toBe("・");
    expect(text(wb, S1, "G21")).toBe("女");
    expect(text(wb, S1, "AG21")).toBe("有・無");
    // 変更様式の項番（原本）。性別は4、配偶者の有無は6（5は出生地）
    expect(CHANGE_PICK_ITEMS.map((p) => p.no)).toEqual(["4", "6", "15", "16", "16", "16", "16", "16", "16", "16"]);
  });

  it("項目番号は、画面の項目番号表（FORM_LAYOUTS.change）と一致する", () => {
    const labels = getFormLayout("change").labels;
    const noOf = (label: string | undefined) => /^(\d+)/.exec(label ?? "")?.[1];
    const expected: Record<string, string> = {
      出生地: "5",
      職業: "7",
      本国における居住地: "8",
      旅券: "10",
      希望する在留期間: "13",
      変更の理由: "14",
    };
    expect(noOf(labels.placeOfBirth)).toBe(expected["出生地"]);
    expect(noOf(labels.occupation)).toBe(expected["職業"]);
    expect(noOf(labels.homeAddress)).toBe(expected["本国における居住地"]);
    expect(noOf(labels.passportNumber)).toBe(expected["旅券"]);
    expect(noOf(labels.desiredPeriod)).toBe(expected["希望する在留期間"]);
    expect(noOf(labels.changeReason)).toBe(expected["変更の理由"]);
    const no = (label: string) => CHANGE_FILL_ITEMS.find((i) => i.label === label)?.no;
    expect(no("出生地")).toBe(expected["出生地"]);
    expect(no("職業")).toBe(expected["職業"]);
    expect(no("本国における居住地")).toBe(expected["本国における居住地"]);
    expect(no("旅券（1）番号")).toBe(expected["旅券"]);
    expect(no("希望する在留期間")).toBe(expected["希望する在留期間"]);
    expect(no("変更の理由")).toBe(expected["変更の理由"]);
    expect(no("住居地")).toBe("9");
    expect(no("電話番号")).toBe("9"); // 項目9の欄内（独立した番号なし）
  });
});

describe("fillChangeExcel", () => {
  it("代表的な入力値が、意図したセルに入る", async () => {
    const { buffer, warnings } = await fillChangeExcel(applicant, employment, details, TARGET);
    const wb = await open(buffer);
    const t = (s: string, c: string) => text(wb, s, c);

    // 申請人等作成用1（変更）
    expect(t(S1, "G15")).toBe("テスト国"); // 1 国籍
    expect([t(S1, "W15"), t(S1, "AC15"), t(S1, "AG15")]).toEqual(["1990", "4", "1"]); // 2 生年月日
    expect(t(S1, "G18")).toBe("TARO YAMADA"); // 3 氏名
    expect([t(S1, "E21"), t(S1, "F21"), t(S1, "G21")]).toEqual(["男", "", ""]); // 4 性別
    expect(t(S1, "O21")).toBe("テスト市"); // 5 出生地
    expect(t(S1, "AG21")).toBe("無"); // 6 配偶者の有無
    expect(t(S1, "E24")).toBe("学生"); // 7 職業
    expect(t(S1, "U24")).toBe("テスト国テスト市1"); // 8 本国における居住地
    expect(t(S1, "G27")).toBe("東京都テスト区1-2-3"); // 9 住居地
    expect([t(S1, "G30"), t(S1, "Y30")]).toEqual(["03-0000-0000", "090-0000-0000"]); // 9 電話・携帯
    expect(t(S1, "I33")).toBe("TE1234567"); // 10 旅券番号
    expect([t(S1, "X33"), t(S1, "AD33"), t(S1, "AH33")]).toEqual(["2030", "5", "6"]);
    expect(t(S1, "I36")).toBe("留学"); // 11 現に有する在留資格
    expect(t(S1, "Z36")).toBe("1年");
    expect([t(S1, "I39"), t(S1, "O39"), t(S1, "S39")]).toEqual(["2026", "12", "31"]);
    expect(t(S1, "I42")).toBe("AB12345678CD"); // 12 在留カード番号
    expect(t(S1, "I45")).toBe(TARGET); // 13 希望する在留資格（案件情報の変更後の在留資格）
    expect(t(S1, "I48")).toBe("3年"); // 13 在留期間
    expect(t(S1, "L51")).toBe("ダミーの変更理由"); // 14 変更の理由
    expect(t(S1, "I56")).toBe("ダミーの処分"); // 15 具体的内容
    expect(t(S1, "A68")).toBe("配偶者"); // 16 在日親族 1人目
    expect(t(S1, "M68")).toBe("1992/02/03");
    expect(t(S1, "AE68")).toBe("ZZ00000000XX");
    expect(t(S1, "A70")).toBe(""); // 2人目は空欄のまま
    expect([t(S1, "AH56"), t(S1, "AI56")]).toEqual(["", ""]); // 15 犯罪歴「有」
    expect([t(S1, "C56"), t(S1, "D56"), t(S1, "AG56")]).toEqual(["有", "（具体的内容", "）"]);
    expect(t(S1, "C62")).toBe("有"); // 16 在日親族の有無（有）
    expect(t(S1, "D62")).toBe("（「有」の場合は，以下の欄に在日親族及び同居者を記入してください。）");
    expect(t(S1, "T68")).toBe("有"); // 16 同居の有無（1人目）
    expect(t(S1, "T70")).toBe("有・無"); // 2人目は空欄のため未選択のまま
    const all = CHANGE_FILL_ITEMS.map((i) => t(i.sheet, i.cell)).join("");
    expect(all).not.toContain("更新の理由"); // 更新用の項目は書かれない

    // 申請人等作成用2（N）
    expect(t(S2, "E8")).toBe("テスト株式会社"); // 17 勤務先名称
    expect(t(S2, "F10")).toBe("東京都テスト区9-9-9");
    expect([t(S2, "A48"), t(S2, "C48"), t(S2, "E48"), t(S2, "G48"), t(S2, "I48")]).toEqual(["2015", "4", "2019", "3", "テスト商事"]); // 21 職歴
    expect([t(S2, "A50"), t(S2, "E50"), t(S2, "I50")]).toEqual(["2019", "", "テスト物産"]); // 在職中は退社欄が空
    expect(t(S2, "E55")).toBe("代理人テスト"); // 22 代理人
    expect(t(S2, "E73")).toBe("取次テスト"); // 取次者
    expect([t(S2, "C77"), t(S2, "AA77")]).toEqual(["テスト事務所", "03-1111-1111"]);

    // 所属機関等作成用1（N）：更新様式より列が2つ左
    expect(t(O1, "E9")).toBe("TARO YAMADA");
    expect(t(O1, "E24")).toBe("テスト株式会社"); // 3(1) 名称
    const corp = colsOf("R", "AD").map((c) => t(O1, `${c}24`)).join("");
    expect(corp).toBe("1234567890123"); // 3(2) 法人番号（1桁ずつ）
    const ins = ["C", "D", "E", "F", "H", "I", "J", "K", "L", "M", "O"].map((c) => t(O1, `${c}32`)).join("");
    expect(ins).toBe("12345678901"); // 3(4) 雇用保険適用事業所番号
    expect(t(O1, "AB36")).toBe("5"); // 3(5) 業種（番号）
    expect(t(O1, "F46")).toBe("10000000"); // 3(7) 資本金
    expect([t(O1, "C59"), t(O1, "F59"), t(O1, "I59")]).toEqual(["2027", "4", "1"]); // 5 雇用開始
    expect(t(O1, "B66")).toBe("300000"); // 6 給与
    expect(t(O1, "AE72")).toBe("3"); // 9 職種（番号）
    expect([t(O1, "B100"), t(O1, "B101")]).toEqual(["システム開発業務", "テスト設計"]); // 10 活動内容

    expect(warnings).toEqual([]);
  });

  it("所属機関等作成用2（N）の派遣先欄にも差し込める", async () => {
    const { buffer } = await fillChangeExcel(applicant, employment, { ...details, dispatchName: "派遣先テスト", dispatchCorporateNumber: "9876543210987" }, TARGET);
    const wb = await open(buffer);
    expect(text(wb, O2, "E12")).toBe("派遣先テスト");
    expect(colsOf("R", "AD").map((c) => text(wb, O2, `${c}12`)).join("")).toBe("9876543210987");
  });

  it("性別が女の場合は、「女」だけを残す。配偶者が有の場合は「有」", async () => {
    const { buffer } = await fillChangeExcel({ ...applicant, gender: "女" }, employment, { ...details, maritalStatus: "married" }, TARGET);
    const wb = await open(buffer);
    expect([text(wb, S1, "E21"), text(wb, S1, "F21"), text(wb, S1, "G21")]).toEqual(["", "", "女"]);
    expect(text(wb, S1, "AG21")).toBe("有");
  });

  it("犯罪歴「無」・在日親族「無」の場合は、その側だけを残す", async () => {
    const { buffer, warnings } = await fillChangeExcel(applicant, employment, { ...details, criminalRecord: "none", relativesPresent: "no" }, TARGET);
    const wb = await open(buffer);
    const t = (s: string, c: string) => text(wb, s, c);
    expect(t(S1, "I56")).toBe(""); // 15 具体的内容は書かない
    expect([t(S1, "C56"), t(S1, "D56"), t(S1, "AG56"), t(S1, "AH56")]).toEqual(["", "", "", ""]); // 15 無
    expect(t(S1, "AI56")).toBe("無");
    expect([t(S1, "C62"), t(S1, "D62")]).toEqual(["", "無"]); // 16 無
    expect(t(S1, "A68")).toBe(""); // 親族なしのため1人目も空欄
    expect(t(S1, "T68")).toBe("有・無"); // 相手が入力されないため未選択のまま
    expect(warnings).toEqual([]);
  });

  it("入力がなければ、すべてのシートがテンプレートの元の状態のまま", async () => {
    const { buffer } = await fillChangeExcel(EMPTY_APPLICANT, EMPTY_EMPLOYMENT, EMPTY_FORM_DETAILS, "");
    const out = await open(buffer);
    const tpl = await open(CHANGE_TEMPLATE_PATH);
    for (const name of [S1, S2, O1, O2]) {
      const a = sheet(tpl, name);
      const b = sheet(out, name);
      const diffs: string[] = [];
      a.eachRow({ includeEmpty: true }, (row) =>
        row.eachCell({ includeEmpty: true }, (c) => {
          if (plain(c.value) !== plain(b.getCell(c.address).value)) diffs.push(c.address);
        }),
      );
      expect(diffs, name).toEqual([]);
    }
  });

  it("A4・倍率・向き・シート保護・結合セルが、出力後も保たれる", async () => {
    const { buffer } = await fillChangeExcel(applicant, employment, details, TARGET);
    const out = await open(buffer);
    const tpl = await open(CHANGE_TEMPLATE_PATH);
    for (const name of [S1, S2, O1, O2]) {
      const a = sheet(tpl, name);
      const b = sheet(out, name);
      expect(b.pageSetup.paperSize, name).toBe(9); // 9 = A4
      expect(b.pageSetup.scale, name).toBe(a.pageSetup.scale);
      expect(b.pageSetup.orientation, name).toBe("portrait");
      expect((b as unknown as { sheetProtection?: unknown }).sheetProtection, name).toBeTruthy();
      expect([...b.model.merges].sort(), name).toEqual([...a.model.merges].sort());
    }
  });

  it("申請人情報が確定していない場合・変更後の在留資格が未入力の場合は、注意文言を返す", async () => {
    const { warnings } = await fillChangeExcel({ ...applicant, confirmationStatus: "draft" }, employment, details, "");
    expect(warnings).toContain("申請人情報が確定していません。すべての項目を、原本と照合してから使用してください。");
    expect(warnings.join("\n")).toContain("変更後の在留資格」が未入力");
  });

  it("変更後の在留資格が技術・人文知識・国際業務以外なら、様式の対象外を警告する", async () => {
    const { warnings } = await fillChangeExcel(applicant, employment, details, "留学");
    expect(warnings.join("\n")).toContain("変更後の在留資格に合う様式");
  });

  it("号つきの高度専門職は、項目13にそのまま入る。行う活動が未選択なら、第1表のみ＋警告（Issue #181・#212）", async () => {
    const hsp = "高度専門職（1号ロ）";
    const { buffer, warnings } = await fillChangeExcel(applicant, employment, details, hsp);
    const wb = await open(buffer);
    expect(text(wb, S1, "I45")).toBe(hsp);
    expect(text(wb, S2, "E8")).toBe(""); // 様式を特定できないため、第2表以降は差し込まない
    expect(warnings.join("\n")).toContain("第1表（申請人用（変更）１）のみ");
    expect(warnings.join("\n")).not.toContain("変更後の在留資格に合う様式"); // 技人国以外の警告は、高度専門職では出さない
  });

  it("様式の欄に収まらない・形式が合わない入力は、警告する", async () => {
    const relatives = Array.from({ length: 7 }, (_, i) => ({ ...details.relatives[0], id: `r${i}` }));
    const { warnings } = await fillChangeExcel(
      applicant,
      { ...employment, industry: "情報通信業", jobDescription: "a\nb\nc" },
      { ...details, relatives, corporateNumber: "123", occupationCode: "技術" },
      TARGET,
    );
    const joined = warnings.join("\n");
    expect(joined).toContain("在日親族");
    expect(joined).toContain("活動内容詳細");
    expect(joined).toContain("業種が番号ではない");
    expect(joined).toContain("職種が番号ではない");
    expect(joined).toContain("法人番号が13桁ではありません");
  });
});

function colsOf(from: string, to: string): string[] {
  const n = (s: string) => [...s].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0);
  const s = (k: number) => {
    let out = "";
    for (let x = k; x > 0; x = Math.floor((x - 1) / 26)) out = String.fromCharCode(65 + ((x - 1) % 26)) + out;
    return out;
  };
  return Array.from({ length: n(to) - n(from) + 1 }, (_, i) => s(n(from) + i));
}
