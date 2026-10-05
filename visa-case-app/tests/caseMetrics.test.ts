import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { describe, expect, it } from "vitest";
import { applyFilter, countActiveFilters, DEFAULT_FILTER, expiryLevel, expiryMessage, isFilterActive, nextSort, paginate, sortState, summarize } from "../lib/caseMetrics";
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
    formDetails: { ...EMPTY_FORM_DETAILS },
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

  it("期限が近い順では未入力が末尾", () => {
    expect(applyFilter(cases, { ...DEFAULT_FILTER, sort: "expiry" }).map((r) => r.record.id)).toEqual(["a", "b", "c"]);
  });

  it("最終更新順", () => {
    expect(applyFilter(cases, DEFAULT_FILTER).map((r) => r.record.id)).toEqual(["a", "b", "c"]);
  });
});

describe("在留カード未登録の絞り込み", () => {
  it("noCard は documents が空の案件のみを返す", () => {
    const withDoc = make({ id: "a" });
    withDoc.documents = [
      { id: "d", documentType: "residence_card", fileName: "x.png", mimeType: "image/png", fileSize: 1, status: "uploaded", uploadedAt: "2026-01-01T00:00:00Z" },
    ];
    const none1 = make({ id: "b" });
    const none2 = make({ id: "c" });
    none1.documents = [];
    none2.documents = [];
    const rows = applyFilter([withDoc, none1, none2], { ...DEFAULT_FILTER, noCard: true });
    expect(rows.map((r) => r.record.id).sort()).toEqual(["b", "c"]);
  });
});

describe("countActiveFilters", () => {
  it("既定値では 0、並び順は数えない", () => {
    expect(countActiveFilters(DEFAULT_FILTER)).toBe(0);
    expect(countActiveFilters({ ...DEFAULT_FILTER, sort: "expiry" })).toBe(0);
  });
  it("有効な条件の数を返す（空白のみの検索語は数えない）", () => {
    expect(countActiveFilters({ ...DEFAULT_FILTER, query: "  " })).toBe(0);
    expect(
      countActiveFilters({ ...DEFAULT_FILTER, query: "a", status: "x", within30: true, checksPending: true }),
    ).toBe(4);
  });
});

describe("isFilterActive", () => {
  it("初期状態では false を返す", () => {
    expect(isFilterActive(DEFAULT_FILTER)).toBe(false);
  });

  it("checksPending のみ true の場合は true を返す", () => {
    expect(isFilterActive({ ...DEFAULT_FILTER, checksPending: true })).toBe(true);
  });
});

describe("並び替え（案件名・申請人氏名・在留期限）", () => {
  const cases = [
    make({ id: "a", caseName: "丙案件", name: "KIM", expiry: dateIn(10), updatedAt: "2026-03-01T00:00:00Z" }),
    make({ id: "b", caseName: "", name: "", expiry: "", updatedAt: "2026-02-01T00:00:00Z" }),
    make({ id: "c", caseName: "あ案件", name: "LI", expiry: dateIn(200), updatedAt: "2026-01-01T00:00:00Z" }),
  ];
  const ids = (sort: Parameters<typeof applyFilter>[1]["sort"]) => applyFilter(cases, { ...DEFAULT_FILTER, sort }).map((r) => r.record.id);

  it("在留期限は近い順・遠い順のどちらでも、未入力が末尾", () => {
    expect(ids("expiry")).toEqual(["a", "c", "b"]);
    expect(ids("expiryDesc")).toEqual(["c", "a", "b"]);
  });
  it("案件名は昇順・降順のどちらでも、未入力が末尾", () => {
    expect(ids("name")).toEqual(["c", "a", "b"]);
    expect(ids("nameDesc")).toEqual(["a", "c", "b"]);
  });
  it("申請人氏名は昇順・降順のどちらでも、未入力が末尾", () => {
    expect(ids("applicant")).toEqual(["a", "c", "b"]);
    expect(ids("applicantDesc")).toEqual(["c", "a", "b"]);
  });
  it("最終更新は新しい順・古い順", () => {
    expect(ids("updated")).toEqual(["a", "b", "c"]);
    expect(ids("updatedAsc")).toEqual(["c", "b", "a"]);
  });
  it("見出しを押したときの切り替え", () => {
    expect(nextSort("updated", "name")).toBe("name");
    expect(nextSort("name", "name")).toBe("nameDesc");
    expect(nextSort("nameDesc", "name")).toBe("name");
    expect(nextSort("expiry", "updated")).toBe("updated");
    expect(nextSort("updated", "updated")).toBe("updatedAsc");
    expect(sortState("expiryDesc")).toEqual({ column: "expiry", dir: "desc" });
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 120 }, (_, i) => i);
  it("1ページ目は50件", () => {
    const p = paginate(items, 1);
    expect(p.items).toHaveLength(50);
    expect(p.totalPages).toBe(3);
    expect(p.total).toBe(120);
  });
  it("最終ページは端数", () => {
    const p = paginate(items, 3);
    expect(p.items).toEqual(items.slice(100));
  });
  it("範囲外・不正なページは補正する", () => {
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate(items, 0).page).toBe(1);
    expect(paginate(items, Number.NaN).page).toBe(1);
  });
  it("1ページ分以下なら総ページ数は1", () => {
    expect(paginate(items.slice(0, 50), 1).totalPages).toBe(1);
    expect(paginate([], 1)).toMatchObject({ items: [], page: 1, totalPages: 1, total: 0 });
  });
});
