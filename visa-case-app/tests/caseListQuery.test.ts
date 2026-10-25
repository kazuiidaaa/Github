import { describe, expect, it } from "vitest";
import { DEFAULT_FILTER, type CaseFilter } from "../lib/caseMetrics";
import { activeCard, cardFilter, readFilter, readPage, toQuery, toQueryWithPage } from "../lib/caseListQuery";
import type { CardKey } from "../lib/dashboardMetrics";

const params = (s: string) => new URLSearchParams(s);

describe("readFilter", () => {
  it("クエリが無ければ既定の条件になる", () => {
    expect(readFilter(params(""))).toEqual(DEFAULT_FILTER);
  });
  it("各クエリ名を読む", () => {
    const f = readFilter(params("q=サンプル&procedure=renewal&status=review_required&within30=1&missing=1&nocard=1&unconfirmed=1&checks=1&sort=expiry"));
    expect(f).toEqual({
      query: "サンプル",
      procedure: "renewal",
      status: "review_required",
      within30: true,
      missingDocs: true,
      noCard: true,
      unconfirmed: true,
      checksPending: true,
      sort: "expiry",
    });
  });
  it("フラグは 1 のときだけ有効、不正な sort は updated に戻る", () => {
    const f = readFilter(params("within30=true&missing=0&sort=bogus"));
    expect(f.within30).toBe(false);
    expect(f.missingDocs).toBe(false);
    expect(f.sort).toBe("updated");
  });
});

describe("readPage", () => {
  it("正の整数を読む", () => {
    expect(readPage(params("page=3"))).toBe(3);
  });
  it("無い・不正な値は 1", () => {
    for (const q of ["", "page=0", "page=-2", "page=1.5", "page=abc", "page="]) expect(readPage(params(q))).toBe(1);
  });
});

describe("toQuery", () => {
  it("既定の条件は ? だけ", () => {
    expect(toQuery(DEFAULT_FILTER)).toBe("?");
  });
  it("既定でない条件だけを書く", () => {
    const f: CaseFilter = { ...DEFAULT_FILTER, query: "テスト", procedure: "renewal", sort: "name", noCard: true };
    expect(toQuery(f)).toBe("?q=%E3%83%86%E3%82%B9%E3%83%88&procedure=renewal&nocard=1&sort=name");
  });
  it("書き出して読み直すと同じ条件になる", () => {
    const f: CaseFilter = { query: "a b", procedure: "renewal", status: "application_ready", within30: true, missingDocs: true, noCard: true, unconfirmed: true, checksPending: true, sort: "expiryDesc" };
    expect(readFilter(params(toQuery(f)))).toEqual(f);
  });
});

describe("toQueryWithPage", () => {
  it("1 ページ目には page を付けない", () => {
    expect(toQueryWithPage(DEFAULT_FILTER)).toBe("?");
    expect(toQueryWithPage({ ...DEFAULT_FILTER, sort: "name" }, 1)).toBe("?sort=name");
  });
  it("2 ページ目以降は page を付ける", () => {
    expect(toQueryWithPage(DEFAULT_FILTER, 2)).toBe("?page=2");
    expect(toQueryWithPage({ ...DEFAULT_FILTER, status: "review_required" }, 3)).toBe("?status=review_required&page=3");
  });
});

describe("cardFilter / activeCard", () => {
  it("カードごとの絞り込み", () => {
    expect(cardFilter("total")).toEqual(DEFAULT_FILTER);
    expect(cardFilter("review").status).toBe("review_required");
    expect(cardFilter("ready").status).toBe("application_ready");
    expect(cardFilter("checksPending").checksPending).toBe(true);
    expect(cardFilter("missingDocs").missingDocs).toBe(true);
    expect(cardFilter("unconfirmed").unconfirmed).toBe(true);
    expect(cardFilter("within30")).toMatchObject({ within30: true, sort: "expiry" });
  });
  it("既定の条件を書き換えない", () => {
    cardFilter("within30");
    expect(DEFAULT_FILTER.within30).toBe(false);
  });
  it("カードの絞り込みから、同じカードが選択中になる", () => {
    const keys: CardKey[] = ["total", "review", "missingDocs", "unconfirmed", "checksPending", "ready", "within30"];
    for (const k of keys) expect(activeCard(cardFilter(k))).toBe(k);
  });
  it("対応するカードが無い条件は null", () => {
    expect(activeCard({ ...DEFAULT_FILTER, query: "x" })).toBeNull();
    expect(activeCard({ ...DEFAULT_FILTER, noCard: true })).toBeNull();
  });
});
