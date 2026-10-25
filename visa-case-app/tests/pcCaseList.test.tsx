import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {} }),
  useSearchParams: () => new URLSearchParams(nav.query),
  usePathname: () => "/cases",
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import { CaseFilters } from "../components/CaseFilters";
import { CaseListTable } from "../components/CaseListTable";
import { CaseSearchField } from "../components/CaseSearchField";
import { applyFilter, DEFAULT_FILTER } from "../lib/caseMetrics";
import { buildDemoSeedCases } from "../lib/demoSeed";

const rows = applyFilter(buildDemoSeedCases(), DEFAULT_FILTER);

function table(sort: "updated" | "name" | "expiry" = "updated", empty: React.ReactNode = null) {
  return renderToStaticMarkup(<CaseListTable rows={rows} filter={{ ...DEFAULT_FILTER, sort }} onSort={() => {}} stagger="" empty={empty} />);
}

describe("CaseListTable（PC 版の案件一覧の表）", () => {
  it("列は 案件名／手続／在留資格／期限／次の作業 の 5 つで、行は案件の件数分ある", () => {
    const m = table();
    const heads = [...m.matchAll(/<th [^>]*scope="col"[^>]*>(.*?)<\/th>/g)].map((x) => x[1]); // 見出しの文字を含むかのみ見る（タグの除去はしない）
    expect(heads).toHaveLength(5);
    expect(heads[0]).toContain("案件名");
    expect(heads[1]).toContain("手続種別");
    expect(heads[2]).toContain("在留資格");
    expect(heads[3]).toContain("在留期限");
    expect(heads[4]).toContain("次の作業");
    expect(m.match(/data-row-link/g)).toHaveLength(rows.length);
  });
  it("並べ替えできる見出し（案件名・期限）はボタンで、現在の並びを aria-sort と ▲▼ で示す", () => {
    const m = table("expiry");
    expect(m).toMatch(/aria-sort="ascending"/);
    expect(m).toContain("▲");
    expect(m).toContain("↕"); // 案件名は今の並びではない
    expect(m).not.toMatch(/aria-sort="descending"/);
    // 見出しのボタンは高さ 44px 以上
    expect(m.match(/<button[^>]*min-h-\[44px\]/g)?.length).toBe(2);
  });
  it("幅が足りないとき（文字拡大を含む）は、コンテナの幅で隠れ、横に溢れる囲み（overflow-x-auto）を使わない", () => {
    const m = table();
    expect(m).toMatch(/class="hidden [^"]*@\[44rem\]:block/);
    expect(m).not.toContain("overflow-x-auto");
    expect(m).toContain("table-fixed");
  });
  it("行のリンクは案件詳細へ。未選択のとき、選択の印（aria-current・data-selected）は付かない", () => {
    const m = table();
    expect(m).toContain(`href="/cases/${rows[0].record.id}"`);
    expect(m).not.toContain("aria-current");
    expect(m).not.toContain("data-selected");
  });
  it("案件がないときは、空の表示を 1 行で出す", () => {
    const m = renderToStaticMarkup(<CaseListTable rows={[]} filter={DEFAULT_FILTER} onSort={() => {}} stagger="" empty={<span>該当なし</span>} />);
    expect(m).toContain("該当なし");
    expect(m).not.toContain("data-row-link");
  });
});

describe("検索欄の位置（PC 版はツールバー）", () => {
  it("ツールバーの検索欄は検索語を URL の q から受け取り、名前（aria-label）と 44px の高さを持つ", () => {
    nav.query = "q=abc";
    const m = renderToStaticMarkup(<CaseSearchField />);
    expect(m).toContain('type="search"');
    expect(m).toContain('aria-label="案件名・氏名・在留資格で検索"');
    expect(m).toContain('value="abc"');
    expect(m).toContain("min-h-[44px]");
  });
  it("一覧の上の検索欄は md 未満のみ（PC 版では隠し、重複させない）", () => {
    nav.query = "";
    const m = renderToStaticMarkup(<CaseFilters filter={DEFAULT_FILTER} active={false} onChange={() => {}} onReset={() => {}} />);
    expect(m).toMatch(/<input[^>]*class="[^"]*\bmd:hidden\b[^"]*"[^>]*aria-label="案件名・氏名・在留資格で検索"/);
  });
});
