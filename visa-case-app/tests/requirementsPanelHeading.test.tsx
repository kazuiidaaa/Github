import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RequirementsPanel } from "../components/RequirementsPanel";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { RULE_SETS } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

function make(residenceStatus: string): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "renewal",
    currentStatus: residenceStatus,
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT },
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

const render = (status: string) => renderToStaticMarkup(<RequirementsPanel record={make(status)} onGoEmployment={() => {}} onGoDocuments={() => {}} />);

// Issue #374 項目2 手順3：見出しの日付は、出典の comparedAt（照合日）を優先し、なければ checkedAt
describe("RequirementsPanel の見出しの日付（規則の確認日）", () => {
  it("照合済みの資格は、checkedAt でなく照合日（comparedAt）を出す（企業内転勤は checkedAt が 2026-10-12）", () => {
    const rs = RULE_SETS.find((r) => r.id === "kigyonai_renewal")!;
    expect(rs.checkedAt).toBe("2026-10-12");
    const html = render("企業内転勤");
    expect(html).toContain("規則の確認日：2026-10-18");
    expect(html).not.toContain("2026-10-12");
  });

  it("照合していない資格は、従来どおり checkedAt を出す（教授）", () => {
    const rs = RULE_SETS.find((r) => r.id === "professor_renewal")!;
    expect(rs.sources.some((s) => s.comparedAt)).toBe(false);
    expect(render("教授")).toContain(`規則の確認日：${rs.checkedAt}`);
  });

  it("kind（案内ページ・PDFなどの種類）は画面に出さない", () => {
    const html = render("企業内転勤");
    expect(html).not.toContain("kind");
    expect(html).not.toMatch(/>\s*(page|pdf|form)\s*</);
  });
});
