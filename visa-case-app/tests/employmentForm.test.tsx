import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EMPLOYMENT_START_DATE_ID, EmploymentForm } from "../components/EmploymentForm";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type EmploymentInfo } from "../lib/types";

function makeRecord(employment: Partial<EmploymentInfo> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "案件",
    procedureType: "renewal",
    currentStatus: "",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, ...employment },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  };
}

describe("就労先フォームの誤りの表示（Issue #392 PR-9）", () => {
  it("雇用開始日に誤りがあると、要約を role=alert で出し、欄に id と aria-invalid を付ける", () => {
    const m = renderToStaticMarkup(<EmploymentForm record={makeRecord({ employmentStartDate: "2024-02-30" })} />);
    expect(m).toMatch(/<div id="employment-error-summary" role="alert"/);
    expect(m).toContain("1 件の誤り");
    expect(m).toMatch(new RegExp(`<input id="${EMPLOYMENT_START_DATE_ID}"[^>]*aria-invalid="true"`));
  });
  it("保存ボタンは誤りがあっても押せる（押したら誤りの欄へ移る）", () => {
    const m = renderToStaticMarkup(<EmploymentForm record={makeRecord({ employmentStartDate: "2024-02-30" })} />);
    const save = [...m.matchAll(/<button[^>]*>/g)].map((x) => x[0]).find((b) => b.includes('aria-describedby="employment-error-summary"'));
    expect(save).toBeDefined();
    expect(save).not.toMatch(/\sdisabled(="")?[\s>]/);
  });
  it("誤りがなければ、要約を出さない", () => {
    const m = renderToStaticMarkup(<EmploymentForm record={makeRecord()} />);
    expect(m).not.toContain("employment-error-summary");
    expect(m).not.toContain('role="alert"');
  });
});
