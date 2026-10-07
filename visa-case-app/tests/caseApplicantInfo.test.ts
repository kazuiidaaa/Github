import { describe, expect, it } from "vitest";
import { validateApplicant, validateDraft } from "@/lib/applicant";
import { decideNextAction } from "@/lib/nextAction";
import { EMPTY_FORM_DETAILS } from "@/lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "@/lib/types";
import { translate } from "@/lib/i18n/translate";

function makeCase(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType: "renewal", currentStatus: "技術・人文知識・国際業務", targetStatus: "", memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS }, requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "",
    checkMemo: "", checks: [], documents: [], ...over,
  };
}
const tr = (lang: "ja" | "en" | "ko") => (k: Parameters<typeof translate>[1], p?: Record<string, string | number>) => translate(lang, k, p);

describe("申請人情報の検証メッセージ", () => {
  it("日本語は、元の文言と一致する", () => {
    const e = validateApplicant({ ...EMPTY_APPLICANT, dateOfBirth: "1998-02-30" });
    expect(e.legalName).toBe("氏名を入力してください。");
    expect(e.nationality).toBe("国籍・地域を入力してください。");
    expect(e.residenceStatus).toBe("在留資格を選択してください。");
    expect(e.dateOfBirth).toBe("存在する日付を、年4桁・月・日の順に入力してください（例：2000/01/31）。");
    expect(e.residenceExpiryDate).toBe("在留期間の満了日を入力してください。");
    expect(validateDraft({ ...EMPTY_APPLICANT, residenceExpiryDate: "2027/06/30" }).residenceExpiryDate).toBe(e.dateOfBirth);
  });

  it("英語・韓国語は、訳され、差し込みが残らない", () => {
    for (const lang of ["en", "ko"] as const) {
      const e = validateApplicant({ ...EMPTY_APPLICANT }, tr(lang));
      for (const v of Object.values(e)) {
        expect(v).not.toMatch(/[ぁ-んァ-ン]/);
        expect(v).not.toMatch(/\{\w+\}/);
      }
      expect(Object.keys(e)).toHaveLength(5);
    }
  });
});

describe("次に行うこと", () => {
  it("日本語は、元の案内文と一致する", () => {
    const a = decideNextAction(makeCase());
    expect(a.step).toBe(1);
    expect(a.message).toBe("「書類」タブから在留カードを登録し、「申請人情報」タブで内容を入力してください。");
    expect(a.buttonLabel).toBe("書類を登録する");
  });

  it("英語・韓国語は、全段階で訳され、差し込みが残らない", () => {
    const cases = [
      makeCase(),
      makeCase({ documents: [{ id: "d", documentType: "residence_card" } as never] }),
      makeCase({
        documents: [{ id: "d", documentType: "residence_card" } as never],
        applicant: { ...EMPTY_APPLICANT, confirmationStatus: "confirmed" },
        employment: { ...EMPTY_EMPLOYMENT, category: "3" },
      }),
    ];
    for (const lang of ["en", "ko"] as const) {
      for (const c of cases) {
        const a = decideNextAction(c, tr(lang));
        expect(a.message).not.toMatch(/[ぁ-んァ-ン]|\{\w+\}/);
        expect(a.buttonLabel).not.toMatch(/[ぁ-んァ-ン]|\{\w+\}/);
      }
    }
  });
});
