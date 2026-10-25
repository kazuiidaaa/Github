import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseRecord } from "../lib/types";

const ctx = vi.hoisted(() => ({ cases: [] as CaseRecord[], loaded: true, error: "" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/m/deadlines" }));
vi.mock("../lib/store", () => ({
  useCases: () => ctx.cases,
  useStoreLoaded: () => ctx.loaded,
  useStoreError: () => ctx.error,
  ensureLoaded: () => Promise.resolve(),
}));

import MobileDeadlinesPage from "../app/m/deadlines/page";
import { activeTab } from "../components/mobile/paths";
import { buildDemoSeedCases } from "../lib/demoSeed";
import { decideNextAction } from "../lib/nextAction";
import { deadlineGroupOf, groupByDeadline } from "../lib/mobileDeadlines";

function dateIn(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function caseWith(index: number, id: string, expiryInDays: number | null): CaseRecord {
  const base = buildDemoSeedCases()[index];
  return { ...base, id, applicant: { ...base.applicant, residenceExpiryDate: expiryInDays === null ? "" : dateIn(expiryInDays) } };
}

const ids = (cases: CaseRecord[]) => groupByDeadline(cases).map((g) => [g.id, g.rows.map((r) => r.record.id)]);

describe("groupByDeadline", () => {
  it("超過を先頭に近い順で並べ、超過／30日以内／それ以降／期限なしに分ける", () => {
    expect(ids([caseWith(0, "none", null), caseWith(0, "d31", 31), caseWith(1, "d30", 30), caseWith(2, "o1", -1), caseWith(0, "d0", 0), caseWith(1, "o9", -9), caseWith(2, "d90", 90)])).toEqual([
      ["overdue", ["o9", "o1"]],
      ["within30", ["d0", "d30"]],
      ["later", ["d31", "d90"]],
      ["none", ["none"]],
    ]);
  });

  it("該当のない区分は出さない。案件がなければ空", () => {
    expect(ids([caseWith(0, "a", 5)])).toEqual([["within30", ["a"]]]);
    expect(groupByDeadline([])).toEqual([]);
  });

  it("区分の境界", () => {
    expect([-1, 0, 30, 31, null].map(deadlineGroupOf)).toEqual(["overdue", "within30", "within30", "later", "none"]);
  });
});

describe("期限と次の作業（iPhone 版）の描画", () => {
  beforeEach(() => {
    ctx.cases = [caseWith(0, "late", 120), caseWith(1, "over", -3), caseWith(2, "soon", 12), caseWith(0, "today", 0), caseWith(1, "blank", null)];
    ctx.loaded = true;
    ctx.error = "";
  });
  const render = () => renderToStaticMarkup(<MobileDeadlinesPage />);

  it("見出しの順と、期限の文言（印＋文字）を出す", () => {
    const m = render();
    const order = ["期限を過ぎている", "30日以内", "それ以降", "期限なし"].map((h) => m.indexOf(h));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(m).toContain("超過 3日");
    expect(m).toContain("本日まで");
    expect(m).toContain("あと 12日");
    expect(m).toContain("未入力");
    expect(m).toContain("<svg"); // 印
    expect(m.match(/<h1/g)).toHaveLength(1);
  });

  it("行は /m/cases/[id] へのリンクで、並びは近い順。編集の操作は置かない", () => {
    const m = render();
    expect([...m.matchAll(/href="\/m\/cases\/([^"]+)"/g)].map((x) => x[1])).toEqual(["over", "today", "soon", "late", "blank"]);
    expect(m).not.toContain("<button");
    expect(m).not.toContain("<input");
  });

  it("次にやることを、既存の判定（decideNextAction）の文で示す", () => {
    const m = render();
    for (const c of ctx.cases) expect(m).toContain(decideNextAction(c).message);
    expect(m).toContain("次にやること：");
  });

  it("案件がないときは案内、読み込み中は一覧を出さない", () => {
    ctx.cases = [];
    expect(render()).toContain("案件がありません");
    ctx.loaded = false;
    expect(render()).not.toContain("案件がありません");
  });

  it("下部タブは案件を選択中にする", () => {
    expect(activeTab("/m/deadlines")).toBe("cases");
  });

  it("入口：案件一覧に、期限と次の作業へのリンクを 1 つ置く", () => {
    expect(readFileSync("app/m/cases/page.tsx", "utf8").match(/href="\/m\/deadlines"/g)).toHaveLength(1);
  });
});
