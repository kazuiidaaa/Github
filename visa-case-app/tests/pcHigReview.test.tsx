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

  it("説明・注意・エラーの枠（rounded-xl）は、PC 版で 10px へ読み替える印（mac-notice）を持つ。入力欄・ボタン・iPhone 版の札は対象外", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.mac-notice\s*\{\s*border-radius: var\(--radius-mac-group\);/);
    for (const f of ["app/cases/new/page.tsx", "components/NextActionCard.tsx", "components/RequirementsPanel.tsx", "components/FormDetailsForm.tsx", "components/DeadlineBanner.tsx"]) {
      for (const line of read(f).split("\n").filter((l) => l.includes("rounded-xl"))) {
        expect(line, `${f}: ${line.trim().slice(0, 80)}`).toContain("mac-notice");
      }
    }
  });

  it("「必要書類」の状態のセルは、PC の表で 2×2 に収まる幅を確保する（縦 4 段にしない）", () => {
    const src = read("components/RequirementsPanel.tsx");
    expect(src).toContain("md:min-w-[14rem]");
    expect(src).toMatch(/<td className=\{TD_STATUS_CLASS\}>\s*<CellLabel>\{t\("caseRequirements.colStatus"\)\}/);
  });
});
