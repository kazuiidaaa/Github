import { describe, expect, it } from "vitest";
import { summarize } from "../lib/caseMetrics";
import { HOME_METRIC_KEYS, METRICS, metricsFor } from "../lib/dashboardMetrics";

/** `app/cases/page.tsx` の `cardFilter` が返す絞り込みを、URL の問い合わせ文字列で表したもの。 */
const EXPECTED_QUERY: Record<string, Record<string, string>> = {
  total: {},
  review: { status: "review_required" },
  missingDocs: { missing: "1" },
  unconfirmed: { unconfirmed: "1" },
  checksPending: { checks: "1" },
  ready: { status: "application_ready" },
  within30: { within30: "1", sort: "expiry" },
};

describe("指標カードの定義", () => {
  it("キーが重複せず、案件一覧の7種類と順序が一致する", () => {
    expect(METRICS.map((m) => m.key)).toEqual(["total", "review", "missingDocs", "unconfirmed", "checksPending", "ready", "within30"]);
  });

  it("すべてのカードに、表示名と説明がある", () => {
    for (const m of METRICS) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });

  it("件数の項目は、集計結果（summarize）に存在する", () => {
    const summary = summarize([]);
    for (const m of METRICS) expect(summary).toHaveProperty(m.field);
  });

  it("移動先のURLが、案件一覧の絞り込み（cardFilter）と対応する", () => {
    for (const m of METRICS) {
      const url = new URL(m.href, "http://localhost");
      expect(url.pathname).toBe("/cases");
      expect(Object.fromEntries(url.searchParams)).toEqual(EXPECTED_QUERY[m.key]);
    }
  });

  it("「期限30日以内」の説明に、期限超過を含むことが書かれている", () => {
    const m = METRICS.find((x) => x.key === "within30");
    expect(m?.description).toContain("過ぎた");
    expect(m?.description).toContain("含み");
  });

  it("ホームは「案件総数」を除く6枚を、同じ順序で表示する", () => {
    const home = metricsFor(HOME_METRIC_KEYS);
    expect(home.map((m) => m.key)).toEqual(["review", "missingDocs", "unconfirmed", "checksPending", "ready", "within30"]);
    expect(home.every((m) => METRICS.includes(m))).toBe(true);
  });
});
