import { describe, expect, it } from "vitest";
import { applyFilter, DEFAULT_FILTER, expiryLevel, expiryMessage, summarize } from "../lib/caseMetrics";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

function dateIn(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function make(over: Partial<CaseRecord> & { expiry?: string; name?: string; confirmed?: boolean } = {}): CaseRecord {
  return {
    id: over.id ?? "1",
    caseName: over.caseName ?? "案件",
    procedureType: over.procedureType ?? "renewal",
    currentStatus: "",
    targetStatus: "",
    memo: "",
    workflowStatus: over.workflowStatus ?? "preparing",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: over.updatedAt ?? "2026-01-01T00:00:00Z",
    applicant: {
      ...EMPTY_APPLICANT,
      legalName: over.name ?? "",
      residenceStatus: "技術・人文知識・国際業務",
      residenceExpiryDate: over.expiry ?? "",
      confirmationStatus: over.confirmed ? "confirmed" : "draft",
    },
    employment: { ...EMPTY_EMPLOYMENT },
    requirementStates: {},
    documents: [],
    checks: [],
    customRequirements: [],
    plannedApplicationDate: "",
    checkMemo: "",
  };
}

describe("expiryLevel", () => {
  it("区分の境界", () => {
    expect(expiryLevel(null)).toBe("unknown");
    expect(expiryLevel(-1)).toBe("overdue");
    expect(expiryLevel(0)).toBe("urgent");
    expect(expiryLevel(30)).toBe("urgent");
    expect(expiryLevel(31)).toBe("caution");
    expect(expiryLevel(90)).toBe("caution");
    expect(expiryLevel(91)).toBe("normal");
  });
  it("表示文は法的判断を含まない", () => {
    expect(expiryMessage(45)).toBe("在留期限まで45日");
    expect(expiryMessage(-3)).toBe("在留期限を3日経過");
    expect(expiryMessage(null)).not.toMatch(/申請できる|許可/);
  });
});

describe("summarize / applyFilter", () => {
  const cases = [
    make({ id: "a", caseName: "甲", name: "LI MING", expiry: dateIn(10), workflowStatus: "review_required", updatedAt: "2026-03-01T00:00:00Z" }),
    make({ id: "b", caseName: "乙", name: "KIM", expiry: dateIn(200), confirmed: true, procedureType: "change", updatedAt: "2026-02-01T00:00:00Z" }),
    make({ id: "c", caseName: "丙", expiry: "" }),
  ];

  it("集計", () => {
    const s = summarize(cases);
    expect(s.total).toBe(3);
    expect(s.review).toBe(1);
    expect(s.checksPending).toBe(3);
    expect(s.ready).toBe(0);
    expect(s.within30).toBe(1);
    expect(s.unconfirmed).toBe(2);
  });

  it("氏名検索と手続種別", () => {
    expect(applyFilter(cases, { ...DEFAULT_FILTER, query: "li ming" }).map((r) => r.record.id)).toEqual(["a"]);
    expect(applyFilter(cases, { ...DEFAULT_FILTER, procedure: "change" }).map((r) => r.record.id)).toEqual(["b"]);
  });

  it("期限30日以内", () => {
    expect(applyFilter(cases, { ...DEFAULT_FILTER, within30: true }).map((r) => r.record.id)).toEqual(["a"]);
  });

  it("期限が近い順では未確認が末尾", () => {
    expect(applyFilter(cases, { ...DEFAULT_FILTER, sort: "expiry" }).map((r) => r.record.id)).toEqual(["a", "b", "c"]);
  });

  it("最終更新順", () => {
    expect(applyFilter(cases, DEFAULT_FILTER).map((r) => r.record.id)).toEqual(["a", "b", "c"]);
  });
});
