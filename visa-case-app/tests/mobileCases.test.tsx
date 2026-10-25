import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseRecord } from "../lib/types";

// 画面の状態は、モックの値で切り替える（データは架空のデモ用の案件）
const ctx = vi.hoisted(() => ({
  search: "",
  cases: [] as CaseRecord[],
  loaded: true,
  error: "",
  canEdit: true,
  replaced: [] as string[],
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/m/cases",
  useRouter: () => ({ replace: (u: string) => ctx.replaced.push(u), push: () => {} }),
  useSearchParams: () => new URLSearchParams(ctx.search),
}));
vi.mock("../lib/store", () => ({
  useCases: () => ctx.cases,
  useStoreLoaded: () => ctx.loaded,
  useStoreError: () => ctx.error,
  useCan: () => ctx.canEdit,
  ensureLoaded: () => Promise.resolve(),
  refetch: () => Promise.resolve(true),
}));

import MobileCasesPage from "../app/m/cases/page";
import { buildDemoSeedCases } from "../lib/demoSeed";
import { PAGE_SIZE } from "../lib/caseMetrics";

const seed = () => buildDemoSeedCases(new Date());
const render = (search = "") => {
  ctx.search = search;
  return renderToStaticMarkup(<MobileCasesPage />);
};
/** 一覧の行（リンク）が出ている案件名の順 */
const names = (m: string) => [...m.matchAll(/href="\/m\/cases\/([^"]+)"/g)].map((x) => x[1]).filter((x) => x !== "new");

beforeEach(() => {
  ctx.search = "";
  ctx.cases = seed();
  ctx.loaded = true;
  ctx.error = "";
  ctx.canEdit = true;
  ctx.replaced = [];
});

describe("案件一覧（iPhone 版）の描画", () => {
  it("大見出し・検索・要点カード・チップ・並び替えを出し、行は iPhone 版の詳細へ移る", () => {
    const m = render();
    expect(m.match(/<h1/g)).toHaveLength(1);
    expect(m).toContain('role="search"');
    expect(m).toContain('aria-label="要点（押すと絞り込み）"');
    expect(m).toContain('aria-label="状態で絞り込む"');
    expect(m).toContain('aria-label="並び替え（現在：最終更新が新しい順）"');
    expect(m).toContain("並び順：最終更新が新しい順");
    // 状態のチップは残し、手続の種類・条件はメニューのボタンにする（チップ列は 1 つだけ）
    expect(m.match(/role="group"/g)).toHaveLength(2); // 要点カードの群と、状態のチップ
    expect(m).toContain("手続：すべて");
    expect(m).toContain('aria-label="条件で絞り込む"');
    // 新規登録はナビゲーションバー右の「+」。引いて更新（キーボード用の再読み込みボタン）を付ける
    expect(m).toContain('aria-label="新規案件"');
    expect(m).toContain("再読み込み");
    expect(m).not.toContain("更新できませんでした");
    expect(names(m).sort()).toEqual(["demo-sample-a", "demo-sample-b", "demo-sample-c"]);
    expect(m).toContain("サンプル案件A");
    expect(m).toContain("該当 3 件（全 3 件）");
    // 状態は文字（Badge）で示す
    expect(m).toContain("申請準備完了");
  });

  it("既定の並びは最終更新が新しい順", () => {
    expect(names(render())).toEqual(["demo-sample-a", "demo-sample-b", "demo-sample-c"]);
  });
});

describe("絞り込み・並び替え（URL の反映）", () => {
  it("status で絞り込み、選択中のチップは aria-pressed とチェックの印で示す", () => {
    const m = render("status=application_ready");
    expect(names(m)).toEqual(["demo-sample-b"]);
    expect(m).toContain("該当 1 件（全 3 件）");
    expect(m).toMatch(/aria-pressed="true"[^>]*>(<span[^>]*>)<svg/);
  });
  it("within30 と sort=expiry（期限が近い順）", () => {
    expect(names(render("within30=1&sort=expiry"))).toEqual(["demo-sample-c"]);
    expect(names(render("sort=expiry"))).toEqual(["demo-sample-c", "demo-sample-a", "demo-sample-b"]);
    expect(names(render("sort=expiryDesc"))).toEqual(["demo-sample-b", "demo-sample-a", "demo-sample-c"]);
  });
  it("q（検索語）で絞り込み、検索欄に値が入る", () => {
    const m = render("q=" + encodeURIComponent("案件B"));
    expect(names(m)).toEqual(["demo-sample-b"]);
    expect(m).toContain('value="案件B"');
  });
  it("未確認・書類・申請前チェックの条件（unconfirmed / missing / checks / nocard）", () => {
    expect(names(render("unconfirmed=1")).sort()).toEqual(["demo-sample-a"]);
    expect(names(render("missing=1")).includes("demo-sample-b")).toBe(false);
    expect(names(render("nocard=1")).length).toBe(3);
  });
  it("要点カードの選択状態は、cardFilter と対応する URL から求める", () => {
    const m = render("status=review_required");
    expect(m).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?確認待ち/);
  });
  it("手続の種類で絞り込む", () => {
    expect(names(render("procedure=renewal")).length).toBe(3);
    expect(names(render("procedure=change"))).toEqual([]);
  });
});

describe("空・読み込み中・エラー", () => {
  it("該当なし：案件はあるので、条件のリセットを出し、新規登録は出さない", () => {
    const m = render("procedure=change");
    expect(m).toContain("該当する案件がありません。");
    expect(m).toContain("条件をリセット");
    expect(m.match(/href="\/m\/cases\/new"/g)).toHaveLength(1); // ナビゲーションバーの「+」だけ
  });
  it("案件が 0 件：権限があるときだけ新規登録を出す", () => {
    ctx.cases = [];
    expect(render().match(/href="\/m\/cases\/new"/g)).toHaveLength(2); // 「+」と空状態のリンク
    expect(render()).toContain("案件がありません。");
    ctx.canEdit = false;
    const m = render();
    expect(m).toContain("案件がありません。");
    expect(m).not.toContain('href="/m/cases/new"');
    expect(m).not.toContain('aria-label="新規案件"');
  });
  it("読み込み中は role=status、失敗は role=alert と再試行ボタン", () => {
    ctx.loaded = false;
    ctx.cases = [];
    const loading = render();
    expect(loading).toContain("読み込み中……");
    expect(loading).toContain("animate-spin");
    expect(loading).toContain("motion-reduce:animate-none");
    expect(loading).not.toContain('role="alert"');
    ctx.error = "読み込みに失敗しました";
    const failed = render();
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("もう一度読み込む");
  });
});

describe("さらに読み込む", () => {
  const many = (n: number): CaseRecord[] => {
    const base = seed()[0];
    return Array.from({ length: n }, (_, i) => ({ ...base, id: `demo-${i}`, caseName: `サンプル${String(i).padStart(3, "0")}` }));
  };
  it("PAGE_SIZE を超えると、先頭から PAGE_SIZE 件とボタンを出し、page=2 で倍の件数になる", () => {
    ctx.cases = many(PAGE_SIZE + 20);
    const first = render();
    expect(names(first)).toHaveLength(PAGE_SIZE);
    expect(first).toContain("さらに読み込む");
    expect(first).toContain(`${PAGE_SIZE + 20} 件中 ${PAGE_SIZE} 件を表示`);
    const second = render("page=2");
    expect(names(second)).toHaveLength(PAGE_SIZE + 20);
    expect(second).not.toContain("さらに読み込む");
  });
  it("範囲外の page は最後に補正し、PAGE_SIZE 以下ではボタンを出さない", () => {
    expect(render("page=99")).not.toContain("さらに読み込む");
    ctx.cases = many(PAGE_SIZE + 1);
    expect(names(render("page=99"))).toHaveLength(PAGE_SIZE + 1);
  });
});

describe("文言", () => {
  it("英語・韓国語の文言が、同じキーで揃っている", async () => {
    const { CATALOG } = await import("../lib/i18n/messages");
    const m = CATALOG.mobile as unknown as Record<string, Record<string, string>>;
    const keys = Object.keys(m.ja).filter((k) => k.startsWith("cases"));
    expect(keys.length).toBeGreaterThan(10);
    for (const k of keys) {
      expect(m.en[k], k).toBeTruthy();
      expect(m.ko[k], k).toBeTruthy();
    }
  });
});
