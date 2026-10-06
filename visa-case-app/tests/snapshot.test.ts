import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { describe, expect, it } from "vitest";
import { buildContent } from "../lib/documents/snapshot";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

function make(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "李明さん 在留期間更新",
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "メモ",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "2026-10-01T00:00:00.000Z",
    applicant: { ...EMPTY_APPLICANT, legalName: "LI MING" },
    employment: { ...EMPTY_EMPLOYMENT, category: "3", companyName: "株式会社A" },
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

describe("buildContent", () => {
  it("生成後に案件を変更しても、作成済みの内容は変わらない", () => {
    const c = make();
    const content = buildContent(c, "case_summary");
    c.applicant.legalName = "変更後";
    c.employment.companyName = "株式会社B";
    expect(content.applicant?.legalName).toBe("LI MING");
    expect(content.employment?.companyName).toBe("株式会社A");
  });

  it("申請前チェックが未実施の場合は available が false になる", () => {
    expect(buildContent(make(), "case_summary").preApplicationChecks?.available).toBe(false);
  });

  it("文書の種類ごとに含める項目が異なる", () => {
    const c = make();
    expect(buildContent(c, "applicant_summary").requirements).toBeUndefined();
    expect(buildContent(c, "application_checklist").employment).toBeUndefined();
  });

  it("注意書きと生成元の案件を含む", () => {
    const content = buildContent(make(), "case_summary", new Date("2026-10-02T00:00:00Z"));
    expect(content.notices.length).toBeGreaterThan(0);
    expect(content.source).toEqual({ caseId: "c1", caseUpdatedAt: "2026-10-01T00:00:00.000Z" });
  });
});
