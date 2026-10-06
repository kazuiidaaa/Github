import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { decideNextAction } from "../lib/nextAction";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type CheckRecord } from "../lib/types";

function make(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category: "1" },
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

const card = { id: "d1", documentType: "residence_card", fileName: "a.png", mimeType: "image/png" } as CaseRecord["documents"][number];
const check = (status: CheckRecord["status"]): CheckRecord => ({ key: "k", type: "manual", name: "n", status, note: "" });
const confirmed = { ...EMPTY_APPLICANT, confirmationStatus: "confirmed" as const };
// 必要書類（カテゴリー1の共通書類）をすべて受領済みにした案件
function ready(over: Partial<CaseRecord> = {}): CaseRecord {
  const states: CaseRecord["requirementStates"] = {};
  for (const id of ["application_form", "photo", "passport_card"]) states[id] = { status: "received" };
  return make({ documents: [card], applicant: confirmed, requirementStates: states, ...over });
}

describe("decideNextAction", () => {
  it("1: 書類が未登録なら、書類タブで在留カードの登録を案内する", () => {
    const a = decideNextAction(make());
    expect(a.step).toBe(1);
    expect(a.target).toBe("documents");
  });

  it("2: 申請人情報が下書きなら、申請人情報タブを案内する", () => {
    const a = decideNextAction(make({ documents: [card] }));
    expect(a.step).toBe(2);
    expect(a.target).toBe("applicant");
  });

  it("3: 必要書類に未収集があれば、不足件数つきで案内する", () => {
    const a = decideNextAction(make({ documents: [card], applicant: confirmed }));
    expect(a.step).toBe(3);
    expect(a.target).toBe("requirements");
    expect(a.message).toMatch(/\d+件/);
  });

  it("3: 規則の対象でない手続では、必要書類の段階を飛ばす", () => {
    const a = decideNextAction(make({ documents: [card], procedureType: "other", applicant: confirmed }));
    expect(a.step).toBe(4);
  });

  it("4: 申請前チェックが未実施なら、チェックを案内する", () => {
    const a = decideNextAction(ready());
    expect(a.step).toBe(4);
    expect(a.target).toBe("checks");
  });

  it("4: 申請前チェックに未解決があれば、件数つきで案内する", () => {
    const a = decideNextAction(ready({ checks: [check("passed"), check("pending")] }));
    expect(a.step).toBe(4);
    expect(a.message).toContain("1件");
  });

  it("5: すべて済んでいれば、書類の生成を案内する", () => {
    const a = decideNextAction(ready({ checks: [check("passed"), check("not_applicable")] }));
    expect(a.step).toBe(5);
    expect(a.target).toBe("generate");
    expect(a.total).toBe(5);
  });
});
