import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/m/cases/c1", useRouter: () => ({ replace: () => {}, push: () => {} }) }));

import { MobileCaseDetail, MobileCaseNotFound } from "../components/MobileCaseDetail";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { CATALOG } from "../lib/i18n/messages";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

function makeCase(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1", caseName: "試験案件", procedureType: "renewal", currentStatus: "技術・人文知識・国際業務", targetStatus: "", memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS }, requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "",
    checkMemo: "", checks: [], documents: [], ...over,
  };
}

describe("案件詳細（iPhone 版）", () => {
  it("概要・期限・書類・チェックと PC 版へのリンクを出す。空欄は「未入力」", () => {
    const html = renderToStaticMarkup(<MobileCaseDetail record={makeCase()} />);
    expect(html).toContain("試験案件");
    expect(html).toContain("未入力");
    expect(html).toContain("登録された書類はありません。");
    expect(html).toContain("チェック項目がまだありません。");
    expect(html).toContain('href="/cases/c1"');
    expect(html).toContain("PC 版で開く");
    expect(html).toContain('href="/m/cases"');
  });
  it("登録書類とチェックの状態は文字で示す", () => {
    const record = makeCase({
      applicant: { ...EMPTY_APPLICANT, legalName: "テスト 太郎", confirmationStatus: "confirmed" },
      plannedApplicationDate: "2027-01-31",
      documents: [{ id: "d1", documentType: "photo", fileName: "photo.jpg", status: "uploaded", uploadedAt: "" } as never],
      checks: [{ key: "manual.1", type: "manual", name: "手動項目", status: "passed", note: "" }],
    });
    const html = renderToStaticMarkup(<MobileCaseDetail record={record} />);
    expect(html).toContain("テスト 太郎");
    expect(html).toContain("2027/01/31");
    expect(html).toContain("photo.jpg");
    expect(html).toContain("手動項目");
    expect(html).toContain("確認済み");
  });
  it("見つからない表示", () => {
    expect(renderToStaticMarkup(<MobileCaseNotFound />)).toContain("案件が見つかりません。");
  });
  it("文言は ja/en/ko で同じキーを持ち、区分が登録されている", () => {
    const ja = Object.keys(CATALOG.mobileDetail.ja).sort();
    expect(Object.keys(CATALOG.mobileDetail.en).sort()).toEqual(ja);
    expect(Object.keys(CATALOG.mobileDetail.ko).sort()).toEqual(ja);
    expect(REVIEW_STATUS.mobileDetail).toBeDefined();
  });
});
