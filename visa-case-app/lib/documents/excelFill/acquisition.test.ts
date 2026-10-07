import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type Applicant } from "../../types";
import { ACQUISITION_TEMPLATE_PATH, fillAcquisitionExcel } from "./acquisition";
import { ACQUISITION_FILL_ITEMS, ACQUISITION_PICK_ITEMS, SHEET_ACQUISITION } from "./acquisitionMapping";
import { fillOfficialExcel } from "./index";
import { sheetKey } from "./renewalMapping";

// テストの書き方は docs/phase11-fill-engines.md の更新編、本様式の判断は同取得編を参照。
// 値はすべてダミー。実案件の個人情報は書かない。

const applicant: Applicant = {
  ...EMPTY_APPLICANT,
  legalName: "TARO YAMADA",
  nationality: "テスト国",
  dateOfBirth: "2010-04-01",
  gender: "男",
  address: "東京都テスト区1-2-3",
  confirmationStatus: "confirmed",
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
  acquisitionCause: "other",
  acquisitionCauseOther: "テスト事由",
  stayPurpose: "テスト理由",
  desiredPeriod: "1年",
  criminalRecord: "yes",
  criminalDetail: "テスト処分",
  relativesPresent: "yes",
  relatives: [
    { id: "r1", relationship: "父", name: "ICHIRO YAMADA", dateOfBirth: "1980-02-03", nationality: "テスト国", workplace: "テスト商事", livesTogether: "yes", cardNumber: "ZZ00000000XX" },
    { id: "r2", relationship: "母", name: "HANAKO YAMADA", dateOfBirth: "1982-03-04", nationality: "テスト国", workplace: "", livesTogether: "yes", cardNumber: "" },
  ],
  guarantorName: "保証 太郎",
  guarantorRelationship: "知人",
  guarantorAddress: "東京都保証区1-1",
  guarantorPhone: "03-1111-1111",
  guarantorMobilePhone: "090-1111-1111",
  legalRepName: "代理 花子",
  legalRepRelationship: "母",
  legalRepAddress: "東京都代理区2-2",
  legalRepPhone: "03-2222-2222",
  agentName: "取次 一郎",
  agentAddress: "東京都取次区3-3",
  agentAffiliation: "テスト事務所",
  agentPhone: "03-3333-3333",
};

async function open(buffer: Buffer | string) {
  const wb = new ExcelJS.Workbook();
  if (typeof buffer === "string") await wb.xlsx.readFile(buffer);
  else await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}
const sheet = (wb: ExcelJS.Workbook, name = SHEET_ACQUISITION) => {
  const ws = wb.worksheets.find((s) => sheetKey(s.name) === sheetKey(name));
  if (!ws) throw new Error(`no sheet ${name}`);
  return ws;
};
const plain = (v: ExcelJS.CellValue): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in v) return v.richText.map((r) => r.text).join("");
  return typeof v === "object" ? JSON.stringify(v) : String(v);
};
const text = (wb: ExcelJS.Workbook, cell: string) => plain(sheet(wb).getCell(cell).value);

describe("acquisitionMapping の座標（テンプレートとの整合）", () => {
  it("すべての項目が、実在するシートの「入力欄（ロック解除セル）」の左上を指す", async () => {
    const wb = await open(ACQUISITION_TEMPLATE_PATH);
    for (const it of ACQUISITION_FILL_ITEMS) {
      const c = sheet(wb, it.sheet).getCell(it.cell);
      expect(c.protection?.locked, `${it.sheet}!${it.cell} ${it.label}`).toBe(false);
      expect(c.isMerged ? c.master.address : c.address, `${it.sheet}!${it.cell} ${it.label}`).toBe(c.address);
    }
  });

  it("同じセルを2つの項目が指していない", () => {
    const keys = ACQUISITION_FILL_ITEMS.map((i) => `${sheetKey(i.sheet)}!${i.cell}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("選択式の項目（性別・配偶者）の書き換え先は、ラベルの文字があるセルである", async () => {
    const wb = await open(ACQUISITION_TEMPLATE_PATH);
    expect([text(wb, "E21"), text(wb, "F21"), text(wb, "G21")]).toEqual(["男", "・", "女"]);
    expect([text(wb, "AH21"), text(wb, "AI21"), text(wb, "AJ21")]).toEqual(["有", "・", "無"]);
    expect(ACQUISITION_PICK_ITEMS.map((p) => p.no)).toEqual(["4", "6", "11", "13", "14", "15", "15", "15", "15"]);
    // 「有・無」等、選ばれなかった側を消す方式（4・6・14・15）の書き換え先はラベルの文字があるセル（保護あり）。
    // 11・13の□は、原本自体が入力用に保護を外している（J36等）ため対象外
    for (const p of ACQUISITION_PICK_ITEMS.filter((p) => p.no !== "11" && p.no !== "13")) {
      for (const writes of Object.values(p.writes)) {
        for (const cell of Object.keys(writes)) expect(sheet(wb).getCell(cell).protection?.locked, cell).not.toBe(false);
      }
    }
    // 11・13の□は、逆に保護が外れている（本来、人が直接「X」等を書き込める入力欄であるため）
    for (const p of ACQUISITION_PICK_ITEMS.filter((p) => p.no === "11" || p.no === "13")) {
      for (const writes of Object.values(p.writes)) {
        for (const cell of Object.keys(writes)) expect(sheet(wb).getCell(cell).protection?.locked, cell).toBe(false);
      }
    }
  });
});

describe("fillAcquisitionExcel", () => {
  it("代表的な入力値が、意図したセルに入る（雇用情報なし）", async () => {
    const { buffer, warnings } = await fillAcquisitionExcel(applicant, details, "特定活動");
    const wb = await open(buffer);
    const t = (c: string) => text(wb, c);

    expect(t("G14")).toBe("テスト国"); // 1
    expect([t("R14"), t("X14"), t("AB14")]).toEqual(["2010", "4", "1"]); // 2
    expect(t("E17")).toBe("TARO YAMADA"); // 3
    expect([t("E21"), t("F21"), t("G21")]).toEqual(["男", "", ""]); // 4
    expect(t("O21")).toBe("テスト市"); // 5
    expect([t("AH21"), t("AI21"), t("AJ21")]).toEqual(["", "", "無"]); // 6
    expect(t("E24")).toBe("学生"); // 7
    expect(t("V24")).toBe("テスト国テスト市1"); // 8
    expect([t("G27"), t("F30"), t("X30")]).toEqual(["東京都テスト区1-2-3", "03-0000-0000", "090-0000-0000"]); // 9
    expect(t("H33")).toBe("TE1234567"); // 10
    expect([t("X33"), t("AD33"), t("AH33")]).toEqual(["2030", "5", "6"]);
    expect(t("Z36")).toBe("テスト事由"); // 11
    expect(t("V36")).toBe("■"); // 11 事由チェック（その他）
    expect([t("J36"), t("N36")]).toEqual(["□", "□"]); // 選ばれなかった□はそのまま
    expect(t("F39")).toBe("テスト理由"); // 12
    expect(t("Q44")).toBe("特定活動"); // 13 その他
    expect(t("M44")).toBe("■"); // 13 希望する在留資格チェック（4択にないため、その他）
    expect([t("H42"), t("P42"), t("X42"), t("H44")]).toEqual(["□", "□", "□", "□"]); // 選ばれなかった□はそのまま
    expect(t("AF42")).toBe("1年"); // 13 在留期間
    expect(t("I47")).toBe("テスト処分"); // 14
    expect([t("C47"), t("D47"), t("AG47"), t("AH47"), t("AI47")]).toEqual(["有", "（具体的内容", "）", "", ""]); // 14 有・無
    expect([t("A56"), t("D56"), t("M56"), t("Q56"), t("X56"), t("AE56")]).toEqual(["父", "ICHIRO YAMADA", "1980/02/03", "テスト国", "テスト商事", "ZZ00000000XX"]); // 15
    expect([t("A58"), t("D58")]).toEqual(["母", "HANAKO YAMADA"]);
    expect(t("A60")).toBe(""); // 3人目は空欄
    expect([t("U56"), t("U58")]).toEqual(["はい", "はい"]); // 15 同居（2人とも livesTogether: "yes"）
    expect(t("U60")).toBe("はい・いいえ"); // 3人目は空欄のため未選択のまま（原本の表示のまま）
    expect([t("F65"), t("AC65"), t("F67"), t("G70"), t("Y70")]).toEqual(["保証 太郎", "知人", "東京都保証区1-1", "03-1111-1111", "090-1111-1111"]); // 16
    expect([t("F74"), t("AC74"), t("F76"), t("G79")]).toEqual(["代理 花子", "母", "東京都代理区2-2", "03-2222-2222"]); // 17
    expect(t("Y79")).toBe(""); // 代理人の携帯電話番号は対象外
    expect([t("E96"), t("T96"), t("C101"), t("Z101")]).toEqual(["取次 一郎", "東京都取次区3-3", "テスト事務所", "03-3333-3333"]); // 取次者

    expect(warnings).toEqual([]);
  });

  it("配偶者あり・性別女の場合は、選ばれた側だけを残す", async () => {
    const { buffer } = await fillAcquisitionExcel({ ...applicant, gender: "女" }, { ...details, maritalStatus: "married" });
    const wb = await open(buffer);
    expect([text(wb, "E21"), text(wb, "F21"), text(wb, "G21")]).toEqual(["", "", "女"]);
    expect([text(wb, "AH21"), text(wb, "AI21"), text(wb, "AJ21")]).toEqual(["有", "", ""]);
  });

  it("取得の事由・処分歴・親族の「なし」は、内容を書かない。4つの在留資格は、該当のチェックだけを付ける", async () => {
    const { buffer, warnings } = await fillAcquisitionExcel(
      applicant,
      { ...details, acquisitionCause: "birth", criminalRecord: "none", relativesPresent: "no" },
      "定住者",
    );
    const wb = await open(buffer);
    expect([text(wb, "Z36"), text(wb, "I47"), text(wb, "A56"), text(wb, "Q44")]).toEqual(["", "", "", ""]);
    expect(text(wb, "J36")).toBe("■"); // 11 事由チェック（出生）
    expect(text(wb, "X42")).toBe("■"); // 13 希望する在留資格チェック（定住者）
    expect([text(wb, "C47"), text(wb, "D47"), text(wb, "AG47"), text(wb, "AH47")]).toEqual(["", "", "", ""]); // 14 無
    expect(text(wb, "AI47")).toBe("無");
    expect(warnings).toEqual([]);
  });

  it("号つきの希望在留資格（高度専門職）は、「その他」の□と自由記入欄に入る（Issue #212）", async () => {
    const { buffer } = await fillAcquisitionExcel(applicant, details, "高度専門職（1号ロ）");
    const wb = await open(buffer);
    expect(text(wb, "M44")).toBe("■"); // 13 その他
    expect(text(wb, "Q44")).toBe("高度専門職（1号ロ）");
    expect([text(wb, "H42"), text(wb, "P42"), text(wb, "X42"), text(wb, "H44")]).toEqual(["□", "□", "□", "□"]); // 4つのチェックボックスは付かない
  });

  it("入力がなければ、テンプレートの元の状態のまま", async () => {
    const { buffer, warnings } = await fillAcquisitionExcel(EMPTY_APPLICANT, EMPTY_FORM_DETAILS);
    const out = sheet(await open(buffer));
    const tpl = sheet(await open(ACQUISITION_TEMPLATE_PATH));
    const diffs: string[] = [];
    tpl.eachRow({ includeEmpty: true }, (row) =>
      row.eachCell({ includeEmpty: true }, (c) => {
        if (plain(c.value) !== plain(out.getCell(c.address).value)) diffs.push(c.address);
      }),
    );
    expect(diffs).toEqual([]);
    expect(warnings).toEqual(["申請人情報が確定していません。すべての項目を、原本と照合してから使用してください。"]);
  });

  it("A4・倍率・向き・シート保護・結合セルが、出力後も保たれる", async () => {
    const { buffer } = await fillAcquisitionExcel(applicant, details);
    const b = sheet(await open(buffer));
    const a = sheet(await open(ACQUISITION_TEMPLATE_PATH));
    expect(b.pageSetup.paperSize).toBe(9); // 9 = A4
    expect(b.pageSetup.scale).toBe(a.pageSetup.scale);
    expect(b.pageSetup.orientation).toBe(a.pageSetup.orientation);
    expect((b as unknown as { sheetProtection?: unknown }).sheetProtection).toBeTruthy();
    expect([...b.model.merges].sort()).toEqual([...a.model.merges].sort());
  });

  it("申請人情報が確定していない・親族があふれる場合は、警告する", async () => {
    const relatives = Array.from({ length: 5 }, (_, i) => ({ ...details.relatives[0], id: `r${i}` }));
    const { warnings } = await fillAcquisitionExcel({ ...applicant, confirmationStatus: "draft" }, { ...details, relatives });
    const joined = warnings.join("\n");
    expect(joined).toContain("申請人情報が確定していません");
    expect(joined).toContain("在日親族は、様式の欄（4人分）");
  });
});

describe("fillOfficialExcel（手続種別 acquisition）", () => {
  it("取得様式に差し込まれ、対象外の注意は付かない", async () => {
    const { buffer, warnings } = await fillOfficialExcel({
      procedureType: "acquisition",
      currentStatus: "",
      applicant,
      employment: EMPTY_EMPLOYMENT,
      formDetails: details,
    });
    const wb = await open(buffer);
    expect(sheet(wb).name).toContain("取得");
    expect(text(wb, "E17")).toBe("TARO YAMADA");
    expect(warnings.join("\n")).not.toContain("対象外");
  });
});
