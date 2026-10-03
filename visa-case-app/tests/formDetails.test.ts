import { describe, expect, it } from "vitest";
import { buildContent } from "../lib/documents/snapshot";
import {
  EMPTY_FORM_DETAILS,
  FORM_DETAILS_FIELD_LABELS,
  FORM_LAYOUTS,
  getFormLayout,
  normalizeFormDetails,
  validateFormDetails,
  type FormFieldKey,
} from "../lib/formDetails";
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

describe("手続種別ごとの項目番号表", () => {
  it("更新様式の表記は従来どおり（変更前後で差がない）", () => {
    const l = getFormLayout("renewal").labels;
    expect(l.maritalStatus).toBe("5 配偶者の有無");
    expect(l.homeAddress).toBe("7 本国における居住地");
    expect(l.desiredPeriod).toBe("13 希望する在留期間");
    expect(l.renewalReason).toBe("14 更新の理由");
    expect(l.placeOfBirth).toBeUndefined();
    expect(l.changeReason).toBeUndefined();
    expect(getFormLayout("renewal").desiredStatusLabel).toBeUndefined();
    expect(getFormLayout("renewal").sectionTitles.applicant1).toBe("申請人等作成用1（項番5〜15）");
  });

  it("変更様式は、出生地が項目5で、以降が1つ繰り下がる", () => {
    const layout = getFormLayout("change");
    const l = layout.labels;
    expect(layout.formName).toBe("在留資格変更許可申請書");
    expect(l.placeOfBirth).toBe("5 出生地");
    expect(l.maritalStatus).toBe("6 配偶者の有無");
    expect(l.occupation).toBe("7 職業");
    expect(l.homeAddress).toBe("8 本国における居住地");
    expect(l.passportNumber).toBe("10 (1) 旅券番号");
    expect(l.changeReason).toBe("14 変更の理由");
    expect(l.renewalReason).toBeUndefined();
    expect(layout.desiredStatusLabel).toBe("13 希望する在留資格");
  });

  it("未対応の手続種別は、更新様式の表記で表示する", () => {
    expect(getFormLayout("coe")).toBe(FORM_LAYOUTS.renewal);
    expect(getFormLayout("other")).toBe(FORM_LAYOUTS.renewal);
  });

  it("検証対象の項目名は、すべての様式の表と一致する", () => {
    for (const layout of Object.values(FORM_LAYOUTS)) {
      for (const k of Object.keys(FORM_DETAILS_FIELD_LABELS) as FormFieldKey[]) {
        expect(layout.labels[k]).toBe(FORM_DETAILS_FIELD_LABELS[k]);
      }
    }
  });

  it("追加した項目は、保存値から復元でき、古い保存値には空で補われる", () => {
    const restored = normalizeFormDetails({ placeOfBirth: "ダミー市", changeReason: "転職のため" });
    expect(restored.placeOfBirth).toBe("ダミー市");
    expect(restored.changeReason).toBe("転職のため");
    expect(restored.renewalReason).toBe("");
    const old = normalizeFormDetails({ renewalReason: "継続勤務" });
    expect(old.placeOfBirth).toBe("");
    expect(old.changeReason).toBe("");
  });
});
