import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChoiceGroup, nextEnabledIndex, type ChoiceOption } from "../components/ChoiceGroup";
import { CHECK_STATUS_LABELS, type CheckStatus } from "../lib/types";

const options: ChoiceOption[] = (Object.keys(CHECK_STATUS_LABELS) as CheckStatus[]).map((s) => ({
  value: s,
  label: CHECK_STATUS_LABELS[s],
  tone: s === "passed" ? "green" : s === "warning" ? "yellow" : s === "failed" ? "red" : "gray",
}));

function html(value: string, hideLegend = true): string {
  return renderToStaticMarkup(<ChoiceGroup legend="項目 状態" hideLegend={hideLegend} options={options} value={value} onChange={() => {}} />);
}

describe("状態の選択（ChoiceGroup の tone・hideLegend）", () => {
  it("状態5種を、横並びのボタンで表示する", () => {
    const m = html("pending");
    expect(m.match(/role="radio"/g)).toHaveLength(5);
    expect(m).not.toContain("<select");
    expect(m).not.toContain('type="search"');
  });

  it("選択中のボタンだけが、状態の色と図形（三角）を持つ", () => {
    const m = html("warning");
    expect(m.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(m).toContain("bg-yellow-100");
    expect(m).toContain("M6 1.2 11 10.5H1z");
    expect(html("failed")).toContain("M6 .8 11.2 6 6 11.2.8 6z");
  });

  it("legend は、読み上げ用に残し、画面には出さない", () => {
    expect(html("passed")).toContain('<legend class="sr-only">項目 状態</legend>');
    expect(html("passed", false)).not.toContain("sr-only");
  });

  it("矢印キー・Home・End で、前後の状態へ移動する", () => {
    expect(nextEnabledIndex(options, 0, "ArrowRight")).toBe(1);
    expect(nextEnabledIndex(options, 0, "ArrowLeft")).toBe(4);
    expect(nextEnabledIndex(options, 2, "Home")).toBe(0);
    expect(nextEnabledIndex(options, 2, "End")).toBe(4);
    expect(nextEnabledIndex(options, 2, "a")).toBeNull();
  });
});
