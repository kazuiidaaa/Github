import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import { fillOfficialExcel } from "../lib/documents/excelFill";
import { SHEET_APPLICANT_1, SHEET_APPLICANT_2, sheetKey } from "../lib/documents/excelFill/renewalMapping";
import { officialFormInputOf } from "../lib/documents/officialForms";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";
import {
  APPLICANT_ZENKAKU,
  commitZenkaku,
  EMPLOYMENT_ZENKAKU,
  FORM_DETAILS_ZENKAKU,
  normalizeAddress,
  RELATIVE_ZENKAKU,
  toZenkaku,
  toZenkakuKana,
  WORK_ENTRY_ZENKAKU,
  zenkakuHandlers,
  zenkakuModeOf,
} from "../lib/zenkaku";

// 値はすべてダミー。実案件の個人情報は書かない。

describe("半角カナ→全角カナ", () => {
  it("清音・長音・句読点・中黒", () => {
    expect(toZenkakuKana("ﾃｽﾄｶﾞｲｼｬ")).toBe("テストガイシャ");
    expect(toZenkakuKana("ｺｰﾋｰ･｡､｢｣")).toBe("コーヒー・。、「」");
  });
  it("濁点・半濁点は、直前の文字と結合する", () => {
    expect(toZenkakuKana("ｶﾞｷﾞｸﾞｹﾞｺﾞ")).toBe("ガギグゲゴ");
    expect(toZenkakuKana("ﾊﾟﾋﾟﾌﾟﾍﾟﾎﾟ")).toBe("パピプペポ");
    expect(toZenkakuKana("ｳﾞ")).toBe("ヴ");
    expect(toZenkakuKana("ﾊﾞﾊﾟ")).toBe("バパ");
  });
  it("濁点だけが単独にあっても壊さない", () => {
    expect(toZenkakuKana("ﾞ")).not.toBe("");
    expect(toZenkakuKana("ｱﾞ")).toContain("ア");
  });
  it("英数字・記号・空白・全角の文字は、そのまま", () => {
    expect(toZenkakuKana("ABC 123-4 ＡＢＣ１２３ ひらがな漢字")).toBe("ABC 123-4 ＡＢＣ１２３ ひらがな漢字");
  });
});

describe("半角→全角（full）", () => {
  it("英数字を全角にする", () => {
    expect(toZenkaku("ABCxyz0129")).toBe("ＡＢＣｘｙｚ０１２９");
  });
  it("記号を全角にする", () => {
    expect(toZenkaku("()[]{}#&@!?:;,./+*=<>_%$\"'`~^|\\")).toBe(
      "（）［］｛｝＃＆＠！？：；，．／＋＊＝＜＞＿％＄＂＇｀～＾｜＼",
    );
  });
  it("半角の空白は全角の空白（U+3000）にする。改行・タブは、そのまま", () => {
    expect(toZenkaku("a b  c")).toBe("ａ　ｂ　　ｃ");
    expect(toZenkaku("行1\n行2\tx")).toBe("行１\n行２\tｘ");
  });
  it("住所の番地のハイフンは、全角のハイフン「－」（U+FF0D）にそろえる（様式の記載例と同じ）", () => {
    expect(toZenkaku("東京都テスト区1-2-3")).toBe("東京都テスト区１－２－３");
    expect(toZenkaku("1‐2−3–4")).toBe("１－２－３－４");
    expect(toZenkaku("1-2")).toContain("－");
    expect(toZenkaku("1-2")).not.toContain("-");
  });
  it("長音「ー」・全角のダッシュ「―」は、ハイフンに変えない", () => {
    expect(toZenkaku("ｾﾝﾀｰ")).toBe("センター");
    expect(toZenkaku("センター―ビル")).toBe("センター―ビル");
  });
  it("すでに全角の文字は、そのまま。二度変換しても同じ（冪等）", () => {
    const s = "東京都テスト区１－２－３　テストビル１０１号室";
    expect(toZenkaku(s)).toBe(s);
    const once = toZenkaku("ﾃｽﾄ Bldg.101 1-2-3");
    expect(toZenkaku(once)).toBe(once);
    expect(once).toBe("テスト　Ｂｌｄｇ．１０１　１－２－３");
  });
  it("空文字は空文字", () => {
    expect(toZenkaku("")).toBe("");
  });
  it("normalizeAddress は toZenkaku と同じ（補った住所にも適用する）", () => {
    expect(normalizeAddress("ﾃｽﾄ1-2")).toBe(toZenkaku("ﾃｽﾄ1-2"));
  });
});

describe("欄の種類と IME の変換中", () => {
  it("full / kana / none で、変換の範囲が変わる", () => {
    expect(commitZenkaku("ﾃｽﾄ A-1", "full")).toBe("テスト　Ａ－１");
    expect(commitZenkaku("ﾃｽﾄ A-1", "kana")).toBe("テスト A-1");
    expect(commitZenkaku("ﾃｽﾄ A-1", "none")).toBe("ﾃｽﾄ A-1");
  });
  it("IME の変換中は、入力を書き換えない", () => {
    expect(commitZenkaku("ﾃｽﾄ A-1", "full", true)).toBe("ﾃｽﾄ A-1");
    expect(commitZenkaku("ﾃｽﾄ A-1", "kana", true)).toBe("ﾃｽﾄ A-1");
  });
});

describe("変換する欄・しない欄", () => {
  const modeOf = (table: Partial<Record<string, "full" | "kana" | "none">>, key: string) => zenkakuModeOf(table, key);

  it("住所・会社名・メモに当たる欄は full", () => {
    expect(modeOf(APPLICANT_ZENKAKU, "address")).toBe("full");
    for (const k of ["homeAddress", "legalRepAddress", "agentAddress", "dispatchAddress", "guarantorAddress"]) {
      expect(modeOf(FORM_DETAILS_ZENKAKU, k), k).toBe("full");
    }
    expect(modeOf(EMPLOYMENT_ZENKAKU, "companyAddress")).toBe("full");
    expect(modeOf(EMPLOYMENT_ZENKAKU, "companyName")).toBe("full");
    expect(modeOf(FORM_DETAILS_ZENKAKU, "schoolName")).toBe("full");
    expect(modeOf(FORM_DETAILS_ZENKAKU, "majorField")).toBe("full");
    expect(modeOf(FORM_DETAILS_ZENKAKU, "positionTitle")).toBe("full");
    expect(modeOf(WORK_ENTRY_ZENKAKU, "employer")).toBe("full");
  });
  it("氏名・国籍・出生地は、半角カナのみ全角にする（kana）", () => {
    for (const k of ["legalRepName", "agentName", "guarantorName", "placeOfBirth"]) {
      expect(modeOf(FORM_DETAILS_ZENKAKU, k), k).toBe("kana");
    }
    expect(modeOf(APPLICANT_ZENKAKU, "nationality")).toBe("kana");
    expect(modeOf(RELATIVE_ZENKAKU, "name")).toBe("kana");
  });
  it("番号・電話・日付・ローマ字氏名・数量・期間は、変換しない（none）", () => {
    for (const k of ["legalName", "residenceCardNumber", "dateOfBirth", "residenceExpiryDate", "gender"]) {
      expect(modeOf(APPLICANT_ZENKAKU, k), k).toBe("none");
    }
    for (const k of ["capital", "employeeCount", "monthlySalary", "contractPeriod", "employmentStartDate"]) {
      expect(modeOf(EMPLOYMENT_ZENKAKU, k), k).toBe("none");
    }
    for (const k of [
      "phone", "mobilePhone", "workPhone", "orgPhone", "legalRepPhone", "agentPhone", "guarantorPhone", "guarantorMobilePhone", "dispatchPhone",
      "passportNumber", "passportExpiry", "corporateNumber", "employmentInsuranceNumber", "dispatchCorporateNumber", "dispatchInsuranceNumber",
      "occupationCode", "periodOfStay", "desiredPeriod", "plannedStay", "plannedEntryDate", "graduationDate",
      "annualSales", "foreignStaffCount", "experienceYears", "dispatchCapital", "dispatchAnnualSales", "dispatchPeriod",
      "entryHistoryCount", "coeHistoryCount", "deportationCount",
    ]) {
      expect(modeOf(FORM_DETAILS_ZENKAKU, k), k).toBe("none");
    }
    expect(modeOf(RELATIVE_ZENKAKU, "cardNumber")).toBe("none");
    expect(modeOf(RELATIVE_ZENKAKU, "dateOfBirth")).toBe("none");
  });
  it("表に無い欄は none", () => {
    expect(zenkakuModeOf({}, "anything")).toBe("none");
  });
});

describe("入力欄の確定時の変換（zenkakuHandlers）", () => {
  const el = (value: string) => ({ value, selectionStart: null }) as unknown as HTMLInputElement;
  const ev = (e: HTMLInputElement) => ({ currentTarget: e });

  it("none の欄には、何も付けない", () => {
    expect(zenkakuHandlers("none", () => {})).toEqual({});
  });
  it("blur で、変換後の値を渡す。変わらないときは渡さない", () => {
    const commit = vi.fn();
    const h = zenkakuHandlers("full", commit);
    h.onBlur!(ev(el("ﾃｽﾄ1-2")));
    expect(commit).toHaveBeenCalledWith("テスト１－２");
    commit.mockClear();
    h.onBlur!(ev(el("テスト１－２")));
    expect(commit).not.toHaveBeenCalled();
  });
  it("kana の欄は、blur でも半角カナのみ全角にする", () => {
    const commit = vi.fn();
    zenkakuHandlers("kana", commit).onBlur!(ev(el("ﾔﾏﾀﾞ Taro-1")));
    expect(commit).toHaveBeenCalledWith("ヤマダ Taro-1");
  });
  it("IME の変換中は、blur でも書き換えない。確定（compositionend）の後に変換する", () => {
    vi.useFakeTimers();
    try {
      const commit = vi.fn();
      const h = zenkakuHandlers("full", commit);
      const input = el("ﾃｽﾄ");
      h.onCompositionStart!(ev(input));
      h.onBlur!(ev(input)); // 変換中に欄を離れた
      vi.runAllTimers();
      expect(commit).not.toHaveBeenCalled();
      h.onCompositionEnd!(ev(input)); // 確定
      expect(commit).not.toHaveBeenCalled(); // 確定直後は、1 回待つ（ブラウザーによる順序の違い）
      vi.runAllTimers();
      expect(commit).toHaveBeenCalledWith("テスト");
    } finally {
      vi.useRealTimers();
    }
  });
  it("確定の待ち時間のあいだに値が変わっても、最新の値を読む", () => {
    vi.useFakeTimers();
    try {
      const commit = vi.fn();
      const h = zenkakuHandlers("full", commit);
      const input = el("ｱ");
      h.onCompositionStart!(ev(input));
      h.onCompositionEnd!(ev(input));
      (input as { value: string }).value = "ｱｲ";
      vi.runAllTimers();
      expect(commit).toHaveBeenCalledWith("アイ");
    } finally {
      vi.useRealTimers();
    }
  });
});

function make(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "テスト案件",
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "2026-10-01T00:00:00.000Z",
    applicant: {
      ...EMPTY_APPLICANT,
      legalName: "TARO YAMADA",
      nationality: "テスト国",
      residenceStatus: "技術・人文知識・国際業務",
      confirmationStatus: "confirmed",
    },
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}

describe("変換後の値が公式様式へ差し込まれる（代表1件。更新様式）", () => {
  it("変換した住所・会社名が、様式のセルへそのまま入り、ローマ字氏名は変換されない", async () => {
    const base = make();
    const c = make({
      applicant: { ...base.applicant, address: toZenkaku("東京都ﾃｽﾄ区1-2-3 ﾃｽﾄﾋﾞﾙ101") },
      employment: { ...base.employment, companyName: toZenkaku("ﾃｽﾄ(ｶ)"), companyAddress: normalizeAddress("東京都ﾃｽﾄ区9-9-9") },
    });
    const r = await fillOfficialExcel({ ...officialFormInputOf(c), procedureType: c.procedureType });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(r.buffer as unknown as ArrayBuffer);
    // シート名の全角・半角の揺れは、sheetKey でそろえて探す（差し込みの試験と同じ）
    const find = (name: string) => wb.worksheets.find((w) => sheetKey(w.name) === sheetKey(name))!;
    const s1 = find(SHEET_APPLICANT_1);
    const s2 = find(SHEET_APPLICANT_2);
    expect(s1.getCell("G27").value).toBe("東京都テスト区１－２－３　テストビル１０１");
    expect(s2.getCell("E9").value).toBe("テスト（カ）");
    expect(s2.getCell("F11").value).toBe("東京都テスト区９－９－９");
    // ローマ字氏名（変換しない欄）は、入力のまま
    expect(s1.getCell("G18").value).toBe("TARO YAMADA");
  });
});
