import { describe, expect, it } from "vitest";
import { validateApplicant, validateDraft } from "../lib/applicant";
import { isValidDate } from "../lib/format";
import { EMPTY_APPLICANT, type Applicant } from "../lib/types";

const valid: Applicant = {
  ...EMPTY_APPLICANT,
  legalName: "LI MING",
  nationality: "中国",
  dateOfBirth: "1998-05-10",
  residenceStatus: "技術・人文知識・国際業務",
  residenceExpiryDate: "2027-06-30",
};

describe("validateApplicant", () => {
  it("必須5項目が揃っていれば、エラーなし", () => {
    expect(validateApplicant(valid)).toEqual({});
  });

  it("未入力・空白のみの必須項目はエラー", () => {
    const errors = validateApplicant({ ...EMPTY_APPLICANT, legalName: "  " });
    expect(Object.keys(errors).sort()).toEqual(
      ["dateOfBirth", "legalName", "nationality", "residenceExpiryDate", "residenceStatus"].sort(),
    );
  });

  it("存在しない日付・形式違いの日付はエラー", () => {
    expect(validateApplicant({ ...valid, dateOfBirth: "1998-02-30" }).dateOfBirth).toBeTruthy();
    expect(validateApplicant({ ...valid, residenceExpiryDate: "2027/06/30" }).residenceExpiryDate).toBeTruthy();
  });

  it("任意項目が空でもエラーにならない", () => {
    expect(validateApplicant({ ...valid, gender: "", address: "", residenceCardNumber: "", workRestriction: "" })).toEqual({});
  });
});

describe("validateDraft", () => {
  it("未入力でも下書き保存できるが、入力済みの日付は形式を確認する", () => {
    expect(validateDraft(EMPTY_APPLICANT)).toEqual({});
    expect(validateDraft({ ...EMPTY_APPLICANT, dateOfBirth: "abc" }).dateOfBirth).toBeTruthy();
  });
});

describe("isValidDate", () => {
  it("うるう年を正しく扱う", () => {
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(isValidDate("2025-02-29")).toBe(false);
  });
});
