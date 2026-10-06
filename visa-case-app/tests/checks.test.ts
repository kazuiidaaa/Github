import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { describe, expect, it } from "vitest";
import { CHECK_DEFINITIONS, missingChecks, sortChecks, unresolvedCount } from "../lib/checks/definitions";
import { referenceFor } from "../lib/checks/reference";
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
    applicant: { ...EMPTY_APPLICANT, legalName: "LI MING" },
    employment: { ...EMPTY_EMPLOYMENT },
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

describe("申請前チェックの項目補完", () => {
  it("初回は全項目を未確認で補う", () => {
    const added = missingChecks([])!;
    expect(added).toHaveLength(CHECK_DEFINITIONS.length);
    expect(added.every((c) => c.status === "pending")).toBe(true);
  });

  it("既存の項目は変更せず、重複も作らない", () => {
    const first = missingChecks([])!;
    const edited: CheckRecord[] = first.map((c, i) => (i === 0 ? { ...c, status: "passed", note: "確認" } : c));
    expect(missingChecks(edited)).toBeNull();
    const partial = edited.slice(0, 3);
    const added = missingChecks(partial)!;
    expect(added).toHaveLength(CHECK_DEFINITIONS.length - 3);
    expect(added.some((c) => partial.some((p) => p.key === c.key))).toBe(false);
  });

  it("確認済み・対象外以外を未完了として数える", () => {
    const base = missingChecks([])!;
    const checks: CheckRecord[] = base.map((c, i) => ({
      ...c,
      status: i === 0 ? "passed" : i === 1 ? "not_applicable" : i === 2 ? "warning" : "pending",
    }));
    expect(unresolvedCount(checks)).toBe(base.length - 2);
  });

  it("分類順に並べ替える", () => {
    const manual: CheckRecord = { key: "manual.x", type: "manual", name: "x", status: "pending", note: "" };
    const sorted = sortChecks([manual, ...missingChecks([])!]);
    expect(sorted[0].type).toBe("applicant");
    expect(sorted[sorted.length - 1].key).toBe("manual.x");
  });
});

describe("参考表示", () => {
  it("入力の有無を示し、状態は決めない", () => {
    const c = make();
    expect(referenceFor(c, "applicant.legal_name").text).toBe("入力あり");
    expect(referenceFor(c, "applicant.nationality").text).toBe("未入力");
    expect(referenceFor(c, "document.reviewed").text).toBe("");
  });

  it("申請予定日が満了日以降なら注意を示す", () => {
    const d = (n: number) => {
      const t = new Date();
      t.setDate(t.getDate() + n);
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    };
    const c = make({ plannedApplicationDate: d(10) });
    c.applicant.residenceExpiryDate = d(5);
    expect(referenceFor(c, "deadline.planned_date_checked").tone).toBe("warn");
    c.applicant.residenceExpiryDate = d(40);
    expect(referenceFor(c, "deadline.planned_date_checked").tone).toBe("ok");
  });
});
