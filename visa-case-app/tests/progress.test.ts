import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { describe, expect, it } from "vitest";
import { evaluate } from "../lib/requirements/evaluate";
import { isCollected, isOverdue, progressOf } from "../lib/requirements/progress";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type CustomRequirement } from "../lib/types";

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
    employment: { ...EMPTY_EMPLOYMENT, category: "3" },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}

const custom = (over: Partial<CustomRequirement>): CustomRequirement => ({
  id: "x1",
  name: "卒業証明書",
  party: "applicant",
  isRequired: true,
  status: "not_received",
  ...over,
});

describe("収集状況", () => {
  it("受領済みと確認済みを収集済みとする", () => {
    expect(isCollected("received")).toBe(true);
    expect(isCollected("reviewed")).toBe(true);
    expect(isCollected("requested")).toBe(false);
    expect(isCollected("not_received")).toBe(false);
  });

  it("期限が過去で未収集の場合のみ期限超過とする", () => {
    expect(isOverdue("requested", "2026-10-01", "2026-10-02")).toBe(true);
    expect(isOverdue("requested", "2026-10-02", "2026-10-02")).toBe(false);
    expect(isOverdue("received", "2026-10-01", "2026-10-02")).toBe(false);
    expect(isOverdue("not_received", undefined, "2026-10-02")).toBe(false);
  });
});

describe("進捗", () => {
  it("規則による書類と追加した書類を合わせて集計する", () => {
    const c = make({
      requirementStates: { photo: { status: "reviewed" }, application_form: { status: "requested", dueDate: "2026-09-30" } },
      customRequirements: [custom({}), custom({ id: "x2", name: "任意資料", isRequired: false }), custom({ id: "x3", name: "受領済み資料", status: "received" })],
    });
    const base = evaluate(c).requiredCount;
    const p = progressOf(evaluate(c), c.customRequirements, "2026-10-02");
    expect(p.requiredCount).toBe(base + 2); // 任意の追加書類は含めない
    expect(p.receivedCount).toBe(2); // photo と受領済み資料
    expect(p.missing).toHaveLength(p.requiredCount - p.receivedCount);
    expect(p.overdue.map((i) => i.key)).toEqual(["application_form"]);
  });

  it("規則の対象外でも、追加した書類は管理できる", () => {
    const c = make({ procedureType: "change", customRequirements: [custom({})] });
    const ev = evaluate(c);
    expect(ev.ruleSet).toBeNull();
    expect(progressOf(ev, c.customRequirements, "2026-10-02").missing.map((i) => i.name)).toEqual(["卒業証明書"]);
  });

  it("不要と判断した規則の書類は、進捗に含めない", () => {
    const c = make({ requirementStates: { photo: { status: "not_received", override: "not_required" } } });
    const p = progressOf(evaluate(c), [], "2026-10-02");
    expect(p.missing.map((i) => i.key)).not.toContain("photo");
  });
});
