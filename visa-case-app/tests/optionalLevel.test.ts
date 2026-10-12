import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { progressOf } from "../lib/requirements/progress";
import { buildClientGuide } from "../lib/documents/clientGuide";
import { reasonText, requirementNote } from "../lib/i18n/caseRequirements";
import { translate } from "../lib/i18n/translate";

import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type RequirementState } from "../lib/types";

// 「任意」（level: optional）は、不足にも要確認にも数えない（Issue #312）。認定の旅券の写しで確かめる。
function make(procedureType: CaseRecord["procedureType"], states: Record<string, RequirementState> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType,
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "技術・人文知識・国際業務",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category: "1" },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: states,
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  };
}

describe("任意の書類（旅券の写し）の数え方", () => {
  it("認定：任意として出て、不足・要確認・必要書類の件数に入らない", () => {
    const ev = evaluate(make("coe"));
    const passport = ev.items.find((i) => i.rule.id === "passport_copy");
    expect(passport?.result).toBe("optional");
    expect(passport?.rule.verify).toBeUndefined();
    expect(ev.missing.map((i) => i.rule.id)).not.toContain("passport_copy");
    expect(ev.toCheck.map((i) => i.rule.id)).not.toContain("passport_copy");
    const requiredIds = ev.items.filter((i) => i.effective === "required").map((i) => i.rule.id);
    expect(ev.requiredCount).toBe(requiredIds.length);
    const progress = progressOf(ev, [], "2026-10-12");
    expect(progress.missing.map((m) => m.key)).not.toContain("passport_copy");
    expect(progress.requiredCount).toBe(requiredIds.length);
  });

  it("更新・変更：旅券と在留カードの提示は必須のまま（任意の旅券の写しは出ない）", () => {
    for (const p of ["renewal", "change"] as const) {
      const ev = evaluate(make(p));
      expect(ev.items.find((i) => i.rule.id === "passport_card")?.effective, p).toBe("required");
      expect(ev.items.some((i) => i.rule.id === "passport_copy"), p).toBe(false);
    }
  });

  it("行政書士が「必要とする」に上書きすると、必要書類に数え、未受領なら不足になる", () => {
    const ev = evaluate(make("coe", { passport_copy: { status: "not_received", override: "required" } }));
    expect(ev.missing.map((i) => i.rule.id)).toContain("passport_copy");
  });

  it("依頼人向けの案内には、任意の書類を載せない（必要な書類だけを案内する）", () => {
    expect(buildClientGuide(make("coe")).items.map((i) => i.id)).not.toContain("passport_copy");
  });

  it("判定の理由と注記は、日本語・英語・韓国語で出る", () => {
    const ev = evaluate(make("coe"));
    const passport = ev.items.find((i) => i.rule.id === "passport_copy")!;
    expect(reasonText((k, p) => translate("ja", k, p), passport.reasonCode)).toContain("任意");
    for (const lang of ["en", "ko"] as const) {
      expect(translate(lang, "caseRequirements.resultOptional")).not.toBe("");
      expect(translate(lang, "caseRequirements.resultOptional")).not.toBe(translate("ja", "caseRequirements.resultOptional"));
      expect(requirementNote(lang, passport.rule.note!)).not.toBe(passport.rule.note);
    }
  });
});
