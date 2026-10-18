import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CaseInfoEditor } from "../components/CaseInfoEditor";
import { MissingValue } from "../components/MissingValue";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";

function makeRecord(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1", caseName: "案件", procedureType: "renewal", currentStatus: "", targetStatus: "", memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "",
    applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT }, formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {}, customRequirements: [], plannedApplicationDate: "", acceptedDate: "", checkMemo: "", checks: [], documents: [],
    ...over,
  };
}

describe("案件詳細の概要（Issue #392 PR-7）", () => {
  it("案件情報: 編集できるときだけ「編集」ボタンを出し、終了後のフォーカスの戻り先として id を持つ", () => {
    const editable = renderToStaticMarkup(<CaseInfoEditor record={makeRecord()} canEdit />);
    expect(editable).toContain('id="case-info-edit"');
    const readOnly = renderToStaticMarkup(<CaseInfoEditor record={makeRecord()} canEdit={false} />);
    expect(readOnly).not.toContain('id="case-info-edit"');
  });

  it("案件情報: 狭い幅では項目名と値を縦に積む（md 以上で2列）", () => {
    const html = renderToStaticMarkup(<CaseInfoEditor record={makeRecord()} canEdit />);
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("md:grid-cols-[10rem_1fr]");
  });

  it("案件情報: 受任日が申請予定日より後の注意は、文字に図形を併記する", () => {
    const html = renderToStaticMarkup(
      <CaseInfoEditor record={makeRecord({ acceptedDate: "2026-05-01", plannedApplicationDate: "2026-04-01" })} canEdit />,
    );
    expect(html).toContain("申請予定日より後です");
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[\s\S]*申請予定日より後です/);
  });

  it("概要の未入力の移動ボタンは、どの幅でも高さ 44px", () => {
    const missing = renderToStaticMarkup(<MissingValue field="gender" label="性別" onJump={() => {}} />);
    expect(missing).toContain("min-h-[44px]");
    expect(missing).not.toContain("md:min-h-0");
  });
});
