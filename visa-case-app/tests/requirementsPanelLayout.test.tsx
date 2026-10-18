import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RequirementsPanel } from "../components/RequirementsPanel";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

function make(): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "renewal",
    currentStatus: "教授",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [{ id: "x1", name: "追加の書類", party: "applicant", isRequired: true, status: "not_received" }],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  };
}

const html = () => renderToStaticMarkup(<RequirementsPanel record={make()} onGoEmployment={() => {}} onGoDocuments={() => {}} />);

// Issue #392 PR-8：狭い画面幅では表の行をカード（2列の格子）にし、md 以上は表のまま
describe("RequirementsPanel の狭い画面幅での表示", () => {
  it("行は md 未満で格子（カード）、md 以上で表の行", () => {
    const rows = html().match(/<tr class="[^"]*"/g) ?? [];
    const bodyRows = rows.filter((r) => r.includes("grid"));
    expect(bodyRows.length).toBeGreaterThan(1);
    for (const r of bodyRows) expect(r).toContain("md:table-row");
  });

  it("期限の入力欄は共通の入力欄の大きさ（16px・高さ 44px）", () => {
    const inputs = html().match(/<input[^>]*inputmode="numeric"[^>]*>/gi) ?? [];
    expect(inputs.length).toBeGreaterThan(0);
    for (const i of inputs) {
      expect(i).toContain("min-h-[44px]");
      expect(i).toContain("text-base");
    }
  });

  it("追加した書類の「編集」「削除」は高さ 44px", () => {
    const buttons = html().match(/<button[^>]*>(編集|削除)<\/button>/g) ?? [];
    expect(buttons).toHaveLength(2);
    for (const b of buttons) expect(b).toContain("min-h-[44px]");
  });
});
