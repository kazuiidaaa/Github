import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { describe, expect, it } from "vitest";
import { applyFilter, countActiveFilters, DEFAULT_FILTER, expiryLevel, expiryMessage, isFilterActive, matchesSearch, normalizeSearchText, summarize } from "../lib/caseMetrics";
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

describe("検索の照合（全角・半角、かな・カナ、大文字・小文字、空白）", () => {
  it("正規化は、全角・半角、カナの種類、大文字・小文字、空白の違いを吸収する", () => {
    expect(normalizeSearchText("ﾘ ﾒｲ")).toBe("りめい");
    expect(normalizeSearchText("リ　メイ")).toBe("りめい");
    expect(normalizeSearchText("りめい")).toBe("りめい");
    expect(normalizeSearchText("ＬＩ　Ｍｉｎｇ")).toBe("liming");
    expect(normalizeSearchText("ガ")).toBe("が");
  });

  it("「ﾘ ﾒｲ」「りめい」「リメイ」は相互に一致する", () => {
    const forms = ["ﾘ ﾒｲ", "りめい", "リメイ", "リ　メイ", "り めい"];
    for (const q of forms) for (const t of forms) expect(matchesSearch(q, [t])).toBe(true);
  });

  it("「李 明」は「李明」「李　明」と一致するが、読みの「りめい」とは一致しない", () => {
    expect(matchesSearch("李 明", ["李明"])).toBe(true);
    expect(matchesSearch("李明", ["李　明"])).toBe(true);
    expect(matchesSearch("李 明", ["りめい"])).toBe(false);
    expect(matchesSearch("りめい", ["李 明"])).toBe(false);
  });

  it("英字は全角・半角、大文字・小文字を問わず一致する", () => {
    expect(matchesSearch("ＬＩ ming", ["Li Ming"])).toBe(true);
    expect(matchesSearch("LIMING", ["li　ming"])).toBe(true);
    expect(matchesSearch("wang", ["Li Ming"])).toBe(false);
  });

  it("検索語が空（空白のみを含む）なら常に一致し、項目をまたいだ一致はしない", () => {
    expect(matchesSearch("  　", ["abc"])).toBe(true);
    expect(matchesSearch("abcdef", ["abc", "def"])).toBe(false);
  });

  it("applyFilter は氏名の表記の違いを吸収して絞り込む", () => {
    const cases = [make({ id: "a", name: "リ メイ" }), make({ id: "b", name: "Wang Fang" })];
    const ids = (query: string) => applyFilter(cases, { ...DEFAULT_FILTER, query }).map((r) => r.record.id);
    expect(ids("ﾘﾒｲ")).toEqual(["a"]);
    expect(ids("りめい")).toEqual(["a"]);
    expect(ids("ＷＡＮＧ　fang")).toEqual(["b"]);
  });
});
