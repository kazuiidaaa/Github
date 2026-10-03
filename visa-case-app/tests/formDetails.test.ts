import { describe, expect, it } from "vitest";
import { buildContent } from "../lib/documents/snapshot";
import { COE_FORM_DETAILS_FIELD_LABELS, EMPTY_FORM_DETAILS, FORM_DETAILS_FIELD_LABELS, normalizeFormDetails, validateFormDetails } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

function make(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "案件",
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT, legalName: "LI MING", confirmationStatus: "confirmed" },
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}

const items = (c: CaseRecord) => buildContent(c, "transcription_aid").transcription!.sheets.flatMap((s) => s.items);
const find = (c: CaseRecord, prefix: string) => items(c).filter((i) => i.label.startsWith(prefix));

describe("公式様式項目", () => {
  it("入力した値は転記補助シートに『要確認』で載り、未入力は『手入力』になる", () => {
    const c = make();
    expect(find(c, "旅券")[0].mode).toBe("missing");
    c.formDetails = { ...c.formDetails, passportNumber: "TK1234567", passportExpiry: "2030-01-31" };
    const passport = find(c, "旅券")[0];
    expect(passport.mode).toBe("confirm");
    expect(passport.value).toContain("TK1234567");
  });

  it("犯罪を理由とする処分は、入力の有無にかかわらず『要確認』になる", () => {
    const c = make();
    expect(find(c, "犯罪")[0].mode).toBe("confirm");
    c.formDetails.criminalRecord = "yes";
    c.formDetails.criminalDetail = "交通違反（罰金）";
    expect(find(c, "犯罪")[0].value).toContain("交通違反");
  });

  it("在日親族と職歴は、1行ずつの項目として出力される", () => {
    const c = make();
    c.formDetails.relativesPresent = "yes";
    c.formDetails.relatives = [
      { id: "r1", relationship: "配偶者", name: "A", dateOfBirth: "1991-01-02", nationality: "中国", workplace: "B社", livesTogether: "yes", cardNumber: "AB1" },
      { id: "r2", relationship: "子", name: "C", dateOfBirth: "", nationality: "", workplace: "", livesTogether: "no", cardNumber: "" },
    ];
    c.formDetails.workHistory = [{ id: "w1", joinedOn: "2020-04", leftOn: "", employer: "D社" }];
    expect(find(c, "在日親族")).toHaveLength(2);
    expect(find(c, "在日親族")[0].value).toContain("カード番号 AB1");
    expect(find(c, "職歴")[0].value).toContain("在職中");
  });

  it("生成後に公式様式項目を変更しても、作成済みの写しは変わらない", () => {
    const c = make();
    c.formDetails.occupation = "会社員";
    const content = buildContent(c, "transcription_aid");
    c.formDetails.occupation = "変更後";
    expect(content.transcription!.sheets[0].items.find((i) => i.label === "職業")?.value).toBe("会社員");
  });

  it("古い保存形式（項目なし）は現行の形式へ補われる", () => {
    const f = normalizeFormDetails(undefined);
    expect(f.relatives).toEqual([]);
    expect(normalizeFormDetails({ occupation: "x", relatives: "壊れた値" }).relatives).toEqual([]);
  });

  it("日付の形式を検証する", () => {
    expect(validateFormDetails({ ...EMPTY_FORM_DETAILS, passportExpiry: "2030-13-40" }).passportExpiry).toBeTruthy();
    expect(validateFormDetails({ ...EMPTY_FORM_DETAILS, passportExpiry: "2030-01-31" })).toEqual({});
  });
});

describe("FORM_DETAILS_FIELD_LABELS", () => {
  it("検証でエラーになりうる項目すべてに、項目名がある", () => {
    const errors = validateFormDetails({ ...EMPTY_FORM_DETAILS, passportExpiry: "x", graduationDate: "x" });
    for (const k of Object.keys(errors) as (keyof typeof errors)[]) {
      expect(FORM_DETAILS_FIELD_LABELS[k]).toBeTruthy();
    }
  });
});

describe("認定証明書交付申請の項目（Issue #85）", () => {
  const coeDates = ["plannedEntryDate", "entryHistoryLastFrom", "entryHistoryLastTo", "deportationLastDate"] as const;

  it("古い保存形式（認定の項目なし）は、認定の項目が空で補われ、既存の値は保たれる", () => {
    const f = normalizeFormDetails({ occupation: "会社員", passportNumber: "TK0000000" });
    expect(f.occupation).toBe("会社員");
    expect(f.placeOfBirth).toBe("");
    expect(f.entryHistory).toBe("");
    expect(f.coeHistoryNonIssuedCount).toBe("");
    expect(f.deportationLastDate).toBe("");
  });

  it("認定の項目は、保存した値がそのまま正規化後も残る（保存・再表示）", () => {
    const saved = {
      ...EMPTY_FORM_DETAILS,
      placeOfBirth: "ダミー市",
      contactInJapan: "東京都（ダミー）",
      plannedEntryDate: "2030-04-01",
      portOfEntry: "成田",
      plannedStay: "1年",
      accompanied: "no" as const,
      visaApplicationPlace: "在ダミー国日本国大使館",
      entryHistory: "yes" as const,
      entryHistoryCount: "2",
      entryHistoryLastFrom: "2025-01-10",
      entryHistoryLastTo: "2025-02-10",
      coeHistory: "yes" as const,
      coeHistoryCount: "1",
      coeHistoryNonIssuedCount: "1",
      deportationHistory: "no" as const,
    };
    expect(normalizeFormDetails(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it("認定の日付項目は、形式を検証する", () => {
    for (const k of coeDates) {
      expect(validateFormDetails({ ...EMPTY_FORM_DETAILS, [k]: "2030-13-40" })[k]).toBeTruthy();
      expect(validateFormDetails({ ...EMPTY_FORM_DETAILS, [k]: "2030-01-31" })).toEqual({});
    }
  });

  it("認定の日付項目すべてに、認定様式の項目名がある", () => {
    for (const k of coeDates) expect(COE_FORM_DETAILS_FIELD_LABELS[k]).toBeTruthy();
    expect(COE_FORM_DETAILS_FIELD_LABELS.graduationDate).toContain("23");
    // 更新様式の項目名は変えない
    expect(FORM_DETAILS_FIELD_LABELS.graduationDate).toContain("18");
  });
});
