import { describe, expect, it } from "vitest";
import { fillCurrentStatus, initialResidenceStatus, validateApplicant, validateDraft } from "../lib/applicant";
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

describe("fillCurrentStatus", () => {
  it("案件側が未入力（空・空白のみ）なら、申請人情報の在留資格で補う", () => {
    expect(fillCurrentStatus("", "留学")).toBe("留学");
    expect(fillCurrentStatus("  ", "留学")).toBe("留学");
  });

  it("案件側に入力済みなら、上書きしない", () => {
    expect(fillCurrentStatus("技術・人文知識・国際業務", "留学")).toBe("技術・人文知識・国際業務");
  });
});

describe("initialResidenceStatus", () => {
  it("申請人情報側が未入力（空・空白のみ）なら、案件側の現在の在留資格を初期値にする", () => {
    expect(initialResidenceStatus("", "留学")).toBe("留学");
    expect(initialResidenceStatus("  ", "留学")).toBe("留学");
  });

  it("申請人情報側に入力済みなら、上書きしない", () => {
    expect(initialResidenceStatus("技術・人文知識・国際業務", "留学")).toBe("技術・人文知識・国際業務");
  });

  it("双方が未入力なら、空のまま", () => {
    expect(initialResidenceStatus("", "")).toBe("");
  });
});
