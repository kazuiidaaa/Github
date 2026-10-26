import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChoiceGroup } from "../components/ChoiceGroup";
import { DashboardCards } from "../components/DashboardCards";
import { summarize } from "../lib/caseMetrics";

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

describe("PC 版 HIG 適合レビューの反映（Issue #456）", () => {
  it("案件一覧の件数カードは、印（mac-metric）と、見えない説明（読み上げには残す）を持つ", () => {
    const m = renderToStaticMarkup(<DashboardCards summary={summarize([])} active={null} onSelect={() => {}} />);
    expect(m).toContain("mac-metric");
    expect(m).toContain("mac-metric-compact");
    expect(m).toContain("md:sr-only");
    expect(m).toContain("aria-describedby=");
  });

  it("カードは、画面幅の段ではなく、置き場所の幅に合わせて列を増減する（文字拡大でも 1 文字ずつ折れない）", () => {
    const src = read("components/DashboardCards.tsx");
    expect(src).not.toMatch(/xl:grid-cols-[67]/);
    expect(src.match(/repeat\(auto-fill,minmax\(/g)?.length).toBe(2);
  });

  it("選択肢が多い一覧は、列の数を幅で決める（狭い列でも、項目名が 1 文字ずつ折れない）", () => {
    const m = renderToStaticMarkup(
      <ChoiceGroup legend="在留資格" variant="list" options={[{ value: "a", label: "技術・人文知識・国際業務" }]} value="a" onChange={() => {}} />,
    );
    expect(m).toContain("repeat(auto-fill,minmax(min(100%,10rem),1fr))");
    expect(m).not.toContain("lg:grid-cols-3");
  });

  it("手作りのボタン・リンクにも、PC 版で角丸の四角へ読み替える印（mac-button）が付いている", () => {
    for (const f of ["app/page.tsx", "app/cases/page.tsx", "app/cases/[id]/page.tsx", "components/ThemeToggle.tsx", "components/LanguageSwitcher.tsx"]) {
      const src = read(f);
      for (const line of src.split("\n").filter((l) => l.includes("rounded-full") && !l.includes("md:hidden") && /border-line-strong|bg-accent/.test(l))) {
        expect(line, `${f}: ${line.trim().slice(0, 80)}`).toContain("mac-button");
      }
    }
  });

  it("PC 版では、ホームのページ内の「新規案件」を出さない（ツールバーにあるため。md 未満のみ残す）", () => {
    expect(read("app/page.tsx")).toMatch(/href="\/cases\/new" className="[^"]*md:hidden"/);
  });
});
