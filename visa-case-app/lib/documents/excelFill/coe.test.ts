import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type Applicant, type EmploymentInfo } from "../../types";
import { COE_TEMPLATE_PATH, fillCoeExcel } from "./coe";
import {
  COE_FILL_ITEMS,
  COE_PICK_ITEMS,
  COE_PURPOSE_CHECKBOXES,
  COE_SHEET_APPLICANT_1 as S1,
  COE_SHEET_APPLICANT_2 as S2,
  COE_SHEET_ORG_1 as O1,
  COE_SHEET_ORG_2 as O2,
} from "./coeMapping";
import { sheetKey } from "./renewalMapping";

// テストの書き方は docs/phase11-renewal-fill-engine.md、認定の判断は docs/phase11-coe-fill-engine.md を参照。
// 値はすべてダミー。実案件の個人情報は書かない。

const applicant: Applicant = {
  ...EMPTY_APPLICANT,
  legalName: "TARO YAMADA",
  nationality: "テスト国",
  dateOfBirth: "1990-04-01",
  gender: "男",
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
  maritalStatus: "married",
  occupation: "会社員",
  homeAddress: "テスト国テスト州1-1",
  contactInJapan: "東京都テスト区4-5-6",
  phone: "03-0000-0000",
  mobilePhone: "090-0000-0000",
  passportNumber: "TE1234567",
  passportExpiry: "2030-05-06",
  plannedEntryDate: "2027-03-20",
  portOfEntry: "テスト空港",
  plannedStay: "1年",
  visaApplicationPlace: "テスト国 日本大使館",
  entryHistory: "yes",
  entryHistoryCount: "2",
  entryHistoryLastFrom: "2019-01-10",
  entryHistoryLastTo: "2019-02-20",
  coeHistory: "yes",
  coeHistoryCount: "3",
  coeHistoryNonIssuedCount: "1",
  criminalRecord: "yes",
  criminalDetail: "ダミーの内容",
  deportationHistory: "yes",
  deportationCount: "1",
  deportationLastDate: "2018-07-08",
  corporateNumber: "1234567890123",
  employmentInsuranceNumber: "12345678901",
  occupationCode: "3",
  relativesPresent: "yes",
  relatives: [
    { id: "r1", relationship: "配偶者", name: "HANAKO YAMADA", dateOfBirth: "1992-02-03", nationality: "テスト国", workplace: "", livesTogether: "yes", cardNumber: "ZZ00000000XX" },
    { id: "r2", relationship: "子", name: "JIRO YAMADA", dateOfBirth: "2018-05-06", nationality: "テスト国", workplace: "テスト小学校", livesTogether: "no", cardNumber: "" },
  ],
  workHistory: [
    { id: "w1", joinedOn: "2015-04", leftOn: "2019-03", employer: "テスト商事" },
    { id: "w2", joinedOn: "2019-04", leftOn: "", employer: "テスト物産" },
  ],
  dispatchName: "テスト派遣先",
  dispatchCorporateNumber: "9876543210987",
  dispatchInsuranceNumber: "10987654321",
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
// テンプレートの空欄には、空白1文字が入っているセルがある（Z95・J78 など）ため、前後の空白は無視して比べる
const text = (wb: ExcelJS.Workbook, name: string, cell: string) => plain(sheet(wb, name).getCell(cell).value).trim();

const SHEETS = [S1, S2, O1, O2];

describe("coeMapping の座標（テンプレートとの整合）", () => {
  it("すべての項目が、実在するシートの「入力欄（ロック解除セル）」の左上を指す", async () => {
    const wb = await open(COE_TEMPLATE_PATH);
    for (const it of COE_FILL_ITEMS) {
      const c = sheet(wb, it.sheet).getCell(it.cell);
      expect(c.protection?.locked, `${it.sheet}!${it.cell} ${it.label}`).toBe(false);
      expect(c.isMerged ? c.master.address : c.address, `${it.sheet}!${it.cell} ${it.label}`).toBe(c.address);
    }
  });

  it("同じセルを2つの項目が指していない", () => {
    const keys = COE_FILL_ITEMS.map((i) => `${sheetKey(i.sheet)}!${i.cell}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("選択式の項目（性別・配偶者）の書き換え先は、ラベルの文字があるセルである", async () => {
    const wb = await open(COE_TEMPLATE_PATH);
    expect([text(wb, S1, "E23"), text(wb, S1, "G23"), text(wb, S1, "H23")]).toEqual(["男", "・", "女"]);
    expect([text(wb, S1, "AK23"), text(wb, S1, "AM23"), text(wb, S1, "AN23")]).toEqual(["有", "・", "無"]);
    expect(COE_PICK_ITEMS.map((p) => p.no)).toEqual(["4", "6", "11", "15", "17", "18", "19", "20", "21", "21", "21", "21", "21"]);
  });
});

describe("fillCoeExcel", () => {
  it("代表的な入力値が、意図したセルに入る", async () => {
    const { buffer, warnings } = await fillCoeExcel(applicant, employment, details);
    const wb = await open(buffer);
    const t = (s: string, c: string) => text(wb, s, c);
    const cells = (s: string, cs: string[]) => cs.map((c) => t(s, c));

    // 申請人等作成用1（認定）
    expect(t(S1, "G17")).toBe("テスト国"); // 1 国籍
    expect(cells(S1, ["AC17", "AI17", "AM17"])).toEqual(["1990", "4", "1"]); // 2 生年月日
    expect(t(S1, "G20")).toBe("TARO YAMADA"); // 3 氏名
    expect(cells(S1, ["E23", "G23", "H23"])).toEqual(["男", "", ""]); // 4 性別
    expect(t(S1, "P23")).toBe("テスト市"); // 5 出生地
    expect(cells(S1, ["AK23", "AM23", "AN23"])).toEqual(["有", "", ""]); // 6 配偶者の有無
    expect(t(S1, "E26")).toBe("会社員"); // 7 職業
    expect(t(S1, "X26")).toBe("テスト国テスト州1-1"); // 8 本国における居住地
    expect(t(S1, "I29")).toBe("東京都テスト区4-5-6"); // 9 日本における連絡先
    expect(cells(S1, ["I32", "AC32"])).toEqual(["03-0000-0000", "090-0000-0000"]);
    expect(t(S1, "I35")).toBe("TE1234567"); // 10 旅券番号
    expect(cells(S1, ["AC35", "AI35", "AM35"])).toEqual(["2030", "5", "6"]);
    expect(cells(S1, ["H55", "N55", "R55"])).toEqual(["2027", "3", "20"]); // 12 入国予定年月日
    expect(t(S1, "AC55")).toBe("テスト空港"); // 13 上陸予定港
    expect(t(S1, "H58")).toBe("1年"); // 14 滞在予定期間
    expect(t(S1, "J61")).toBe("テスト国 日本大使館"); // 16 査証申請予定地
    expect(t(S1, "E67")).toBe("2"); // 17 回数
    expect(cells(S1, ["Q67", "V67", "Z67"])).toEqual(["2019", "1", "10"]); // 17 直近の入国
    expect(cells(S1, ["AE67", "AJ67", "AN67"])).toEqual(["2019", "2", "20"]); // 17 直近の出国
    expect(cells(S1, ["S73", "AK73"])).toEqual(["3", "1"]); // 18
    expect(t(S1, "J78")).toBe("ダミーの内容"); // 19
    expect(t(S1, "Q83")).toBe("1"); // 20 回数
    expect(cells(S1, ["AE83", "AJ83", "AN83"])).toEqual(["2018", "7", "8"]); // 20 直近の送還歴
    expect(cells(S1, ["A95", "E95", "N95", "R95", "Z95", "AI95"])).toEqual(["配偶者", "HANAKO YAMADA", "1992/02/03", "テスト国", "", "ZZ00000000XX"]); // 21 1人目
    expect(cells(S1, ["A97", "Z97"])).toEqual(["子", "テスト小学校"]); // 2人目
    expect(t(S1, "A99")).toBe(""); // 3人目は空欄のまま
    expect(cells(S1, ["AG58", "AH58", "AI58"])).toEqual(["有", "・", "無"]); // 15 同伴者は未入力のため原本のまま
    expect(cells(S1, ["M64", "N64", "O64"])).toEqual(["有", "", ""]); // 17 出入国歴の有無（有）
    expect(cells(S1, ["Q70", "R70", "S70"])).toEqual(["有", "", ""]); // 18 認定申請歴の有無（有）
    expect(cells(S1, ["C78", "D78", "AL78", "AM78", "AN78"])).toEqual(["有", "（具体的内容", "）", "", ""]); // 19 犯罪歴の有無（有）
    expect(cells(S1, ["R81", "S81", "T81"])).toEqual(["有", "", ""]); // 20 送還歴の有無（有）
    expect(t(S1, "C89")).toBe("有"); // 21 在日親族の有無（有）
    expect(t(S1, "D89")).toBe("（「有」の場合は，以下の欄に在日親族及び同居者を記入してください。）");
    expect(cells(S1, ["V95", "V97"])).toEqual(["有", "無"]); // 21 同居予定の有無（1・2人目）
    expect(t(S1, "V99")).toBe("有・無"); // 3人目は空欄のため未選択のまま

    // 申請人等作成用2（N）
    expect(t(S2, "E8")).toBe("テスト株式会社"); // 22 勤務先名称
    expect(t(S2, "F11")).toBe("東京都テスト区9-9-9");
    expect(cells(S2, ["A53", "C53", "E53", "G53", "I53"])).toEqual(["2015", "4", "2019", "3", "テスト商事"]); // 26 職歴
    expect(cells(S2, ["A55", "E55", "I55"])).toEqual(["2019", "", "テスト物産"]); // 在職中は退社欄が空

    // 所属機関等作成用1（N）
    expect(t(O1, "P6")).toBe("TARO YAMADA");
    expect(t(O1, "E19")).toBe("テスト株式会社"); // 3(1) 名称
    const corp = "R S T U V W X Y Z AA AB AC AD".split(" ").map((c) => t(O1, `${c}19`)).join("");
    expect(corp).toBe("1234567890123"); // 3(2) 法人番号（1桁ずつ）
    const ins = ["R", "S", "T", "U", "W", "X", "Y", "Z", "AA", "AB", "AD"].map((c) => t(O1, `${c}24`)).join("");
    expect(ins).toBe("12345678901"); // 3(4) 雇用保険適用事業所番号
    expect(t(O1, "AG27")).toBe("5"); // 3(5) 業種（番号）
    expect(t(O1, "F35")).toBe("10000000"); // 3(7) 資本金
    expect(cells(O1, ["Z52", "AC52", "AF52"])).toEqual(["2027", "4", "1"]); // 6 雇用開始
    expect(t(O1, "B58")).toBe("300000"); // 7 給与
    expect(t(O1, "AF65")).toBe("3"); // 10 職種（番号）
    expect(cells(O1, ["B94", "B95"])).toEqual(["システム開発業務", "テスト設計"]); // 11 活動内容

    // 所属機関等作成用2（N）
    expect(t(O2, "E9")).toBe("テスト派遣先");
    expect("R S T U V W X Y Z AA AB AC AD".split(" ").map((c) => t(O2, `${c}9`)).join("")).toBe("9876543210987");
    expect(["C", "D", "E", "F", "H", "I", "J", "K", "L", "M", "O"].map((c) => t(O2, `${c}17`)).join("")).toBe("10987654321");

    expect(warnings).toEqual([]);
  });

  it("性別が女、配偶者が無の場合は、それぞれ該当する側だけを残す", async () => {
    const { buffer } = await fillCoeExcel({ ...applicant, gender: "女" }, employment, { ...details, maritalStatus: "single" });
    const wb = await open(buffer);
    expect([text(wb, S1, "E23"), text(wb, S1, "G23"), text(wb, S1, "H23")]).toEqual(["", "", "女"]);
    expect([text(wb, S1, "AK23"), text(wb, S1, "AM23"), text(wb, S1, "AN23")]).toEqual(["", "", "無"]);
  });

  it("入国目的（11）は、希望する在留資格が様式の選択肢と一致する場合だけ、該当の□にチェックを付ける", async () => {
    const { buffer, warnings } = await fillCoeExcel(applicant, employment, details, "技術・人文知識・国際業務");
    const wb = await open(buffer);
    expect(text(wb, S1, COE_PURPOSE_CHECKBOXES["技術・人文知識・国際業務"])).toBe("■");
    expect(text(wb, S1, COE_PURPOSE_CHECKBOXES["教授"])).toBe("□"); // 選ばれなかった□はそのまま
    expect(warnings).toEqual([]);
  });

  it.each(["高度専門職（1号イ）", "高度専門職（1号ロ）", "高度専門職（1号ハ）"])(
    "入国目的（11）は、高度専門職の号が一致する場合、その号の□だけを■にする: %s",
    async (grade) => {
      const { buffer, warnings } = await fillCoeExcel(applicant, employment, details, grade);
      const wb = await open(buffer);
      for (const [label, cell] of Object.entries(COE_PURPOSE_CHECKBOXES)) {
        expect(text(wb, S1, cell), label).toBe(label === grade ? "■" : "□");
      }
      expect(warnings).toEqual([]);
    },
  );

  it("高度専門職の号が未選択の場合は、チェックを付けず、号の選択を案内する", async () => {
    const { buffer, warnings } = await fillCoeExcel(applicant, employment, details, "高度専門職");
    const wb = await open(buffer);
    for (const cell of Object.values(COE_PURPOSE_CHECKBOXES)) expect(text(wb, S1, cell), cell).toBe("□");
    expect(warnings.join("\n")).toContain("入国目的（高度専門職）は、号（イ・ロ・ハ）が未選択");
  });

  it("入国目的（11）が様式の選択肢と一致しない（号・種別まで様式側で選ぶ必要がある等）場合は、チェックを付けず警告する", async () => {
    const { buffer, warnings } = await fillCoeExcel(applicant, employment, details, "特定技能");
    const wb = await open(buffer);
    for (const cell of Object.values(COE_PURPOSE_CHECKBOXES)) expect(text(wb, S1, cell), cell).toBe("□");
    expect(warnings.join("\n")).toContain("入国目的（特定技能）は、様式の選択肢と一致しないため");
  });

  it("有無が「有」でなければ、出入国歴・認定申請歴・送還歴の詳細は書かない", async () => {
    const { buffer, warnings } = await fillCoeExcel(applicant, employment, {
      ...details,
      accompanied: "no",
      entryHistory: "no",
      coeHistory: "",
      deportationHistory: "no",
      criminalRecord: "none",
      relativesPresent: "no",
    });
    const wb = await open(buffer);
    for (const c of ["E67", "Q67", "AE67", "S73", "AK73", "J78", "Q83", "AE83"]) expect(text(wb, S1, c), c).toBe("");
    expect([text(wb, S1, "AG58"), text(wb, S1, "AH58")]).toEqual(["", ""]); // 15 同伴者の有無（無）
    expect(text(wb, S1, "AI58")).toBe("無");
    expect([text(wb, S1, "M64"), text(wb, S1, "N64")]).toEqual(["", ""]); // 17 無
    expect(text(wb, S1, "O64")).toBe("無");
    // coeHistory が未入力（""）のため、18は未選択のまま（原本の表記）
    expect([text(wb, S1, "Q70"), text(wb, S1, "R70"), text(wb, S1, "S70")]).toEqual(["有", "・", "無"]);
    expect([text(wb, S1, "C78"), text(wb, S1, "D78"), text(wb, S1, "AL78"), text(wb, S1, "AM78")]).toEqual(["", "", "", ""]); // 19 無
    expect(text(wb, S1, "AN78")).toBe("無");
    expect([text(wb, S1, "R81"), text(wb, S1, "S81")]).toEqual(["", ""]); // 20 無
    expect(text(wb, S1, "T81")).toBe("無");
    expect([text(wb, S1, "C89"), text(wb, S1, "D89")]).toEqual(["", "無"]); // 21 無
    expect(text(wb, S1, "A95")).toBe(""); // 親族なしのため1人目も空欄
    expect(text(wb, S1, "V95")).toBe("有・無"); // 相手が入力されないため未選択のまま
    expect(warnings).toEqual([]);
  });

  it("入力がなければ、すべてのシートがテンプレートの元の状態のまま", async () => {
    const { buffer } = await fillCoeExcel(EMPTY_APPLICANT, EMPTY_EMPLOYMENT, EMPTY_FORM_DETAILS);
    const out = await open(buffer);
    const tpl = await open(COE_TEMPLATE_PATH);
    for (const name of SHEETS) {
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
    const { buffer } = await fillCoeExcel(applicant, employment, details);
    const out = await open(buffer);
    const tpl = await open(COE_TEMPLATE_PATH);
    for (const name of SHEETS) {
      const a = sheet(tpl, name);
      const b = sheet(out, name);
      expect(b.pageSetup.paperSize, name).toBe(9); // 9 = A4
      expect(a.pageSetup.paperSize, name).toBe(9);
      expect(b.pageSetup.scale, name).toBe(a.pageSetup.scale);
      expect(b.pageSetup.orientation, name).toBe(a.pageSetup.orientation);
      expect((b as unknown as { sheetProtection?: unknown }).sheetProtection, name).toBeTruthy();
      expect([...b.model.merges].sort(), name).toEqual([...a.model.merges].sort());
    }
  });

  it("申請人情報が確定していない場合は、注意文言を返す", async () => {
    const { warnings } = await fillCoeExcel({ ...applicant, confirmationStatus: "draft" }, employment, details);
    expect(warnings).toContain("申請人情報が確定していません。すべての項目を、原本と照合してから使用してください。");
  });

  it("様式の欄に収まらない・形式が合わない入力は、警告する", async () => {
    const relatives = Array.from({ length: 5 }, (_, i) => ({ ...details.relatives[0], id: `r${i}` }));
    const workHistory = Array.from({ length: 7 }, (_, i) => ({ ...details.workHistory[0], id: `w${i}` }));
    const { warnings } = await fillCoeExcel(
      applicant,
      { ...employment, industry: "情報通信業", jobDescription: "a\nb\nc" },
      { ...details, relatives, workHistory, corporateNumber: "123", dispatchInsuranceNumber: "1", occupationCode: "技術" },
    );
    const joined = warnings.join("\n");
    expect(joined).toContain("在日親族");
    expect(joined).toContain("職歴");
    expect(joined).toContain("活動内容詳細");
    expect(joined).toContain("業種が番号ではない");
    expect(joined).toContain("職種が番号ではない");
    expect(joined).toContain("所属機関等作成用1 3(2)法人番号が13桁ではありません");
    expect(joined).toContain("所属機関等作成用2 12(4)雇用保険適用事業所番号が11桁ではありません");
  });
});
