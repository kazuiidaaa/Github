import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/m/cases/c1/documents", useRouter: () => ({ replace: () => {}, push: () => {} }) }));

import { MobileDocuments } from "../components/MobileDocuments";
import { MobileCaseDetail } from "../components/MobileCaseDetail";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { CATALOG } from "../lib/i18n/messages";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

function makeCase(): CaseRecord {
  return {
    id: "c1", caseName: "試験案件", procedureType: "renewal", currentStatus: "留学", targetStatus: "", memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS }, requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "",
    checkMemo: "", checks: [], documents: [],
  };
}

describe("書類（iPhone 版）", () => {
  it("データ状態・出力内容・履歴・PC 版へのリンクを出す。公式様式は選択肢に出さない", () => {
    const html = renderToStaticMarkup(<MobileDocuments record={makeCase()} />);
    expect(html).toContain("データ状態");
    expect(html).toContain("案件確認シート");
    expect(html).not.toContain("公式申請様式</");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('href="/m/cases/c1"');
    expect(html).toContain('aria-label="案件詳細へ戻る"');
    expect(html).toContain('href="/cases/c1/documents"');
    expect(html).toContain("生成して保存");
  });
  it("案件詳細から書類へ導線がある", () => {
    const html = renderToStaticMarkup(<MobileCaseDetail record={makeCase()} />);
    expect(html).toContain('href="/m/cases/c1/documents"');
  });
  it("文言は ja/en/ko で同じキーを持ち、区分が登録されている", () => {
    const ja = Object.keys(CATALOG.mobileDocuments.ja).sort();
    expect(Object.keys(CATALOG.mobileDocuments.en).sort()).toEqual(ja);
    expect(Object.keys(CATALOG.mobileDocuments.ko).sort()).toEqual(ja);
    expect(REVIEW_STATUS.mobileDocuments).toBeDefined();
  });
});
