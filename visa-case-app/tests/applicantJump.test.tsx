import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApplicantForm } from "../components/ApplicantForm";
import { MissingValue } from "../components/MissingValue";
import { applicantFieldId, canJumpToApplicantField, type JumpField } from "../lib/applicantFields";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";

const FIELDS: JumpField[] = [
  "legalName", "nationality", "dateOfBirth", "gender", "address",
  "residenceStatus", "residenceExpiryDate", "residenceCardNumber", "workRestriction",
];

function makeRecord(): CaseRecord {
  return {
    id: "c1", caseName: "案件", procedureType: "renewal", currentStatus: "", targetStatus: "", memo: "",
    workflowStatus: "preparing", createdAt: "", updatedAt: "",
    applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT }, formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {}, customRequirements: [], plannedApplicationDate: "", checkMemo: "", checks: [], documents: [],
  };
}

describe("概要の未入力から入力欄への移動（Issue #219）", () => {
  it("編集権限があり確認済みでないときのみ、リンクにする", () => {
    expect(canJumpToApplicantField(true, "draft")).toBe(true);
    expect(canJumpToApplicantField(false, "draft")).toBe(false);
    expect(canJumpToApplicantField(true, "confirmed")).toBe(false);
    expect(canJumpToApplicantField(false, "confirmed")).toBe(false);
  });

  it("移動できるときはボタン、できないときは文字のみ", () => {
    const link = renderToStaticMarkup(<MissingValue field="gender" label="性別" onJump={() => {}} />);
    expect(link).toContain("<button");
    expect(link).toContain("性別は未入力です");
    const plain = renderToStaticMarkup(<MissingValue field="gender" label="性別" />);
    expect(plain).not.toContain("<button");
    expect(plain).toContain("未入力");
  });

  it("移動先の id は欄ごとに異なり、申請人情報フォームの入力欄に付いている", () => {
    const ids = FIELDS.map(applicantFieldId);
    expect(new Set(ids).size).toBe(FIELDS.length);
    const markup = renderToStaticMarkup(<ApplicantForm record={makeRecord()} onGoDocuments={() => {}} />);
    for (const id of ids) expect(markup).toContain(`id="${id}"`);
  });
});
