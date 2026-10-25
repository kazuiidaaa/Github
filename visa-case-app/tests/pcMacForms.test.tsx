import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Button, Field, inputClass } from "../components/ui";

const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
/** PR4 の PC 版のみの指定（コメント「PC 版のみ：入力フォーム・ダイアログ」から、次の「書類のプレビュー」まで） */
const start = css.indexOf("PC 版のみ：入力フォーム・ダイアログ・確認画面を macOS 風に");
const block = css.slice(start, css.indexOf("/* 書類のプレビュー", start));

describe("PC 版の入力フォーム・ダイアログ（Mac 風。Issue #456 PR4）", () => {
  it("部品に、読み替え用の印のクラスが付き、操作の高さ 44px は残る", () => {
    expect(renderToStaticMarkup(<Button>OK</Button>)).toMatch(/class="mac-button [^"]*min-h-\[44px\]/);
    expect(inputClass).toMatch(/^mac-input .*min-h-\[44px\].*text-base/);
    expect(renderToStaticMarkup(<Field label="氏名" required><input /></Field>)).toContain("mac-label");
  });
  it("確認ダイアログは、印（mac-dialog）と、役割・名前・閉じる操作を持つ", () => {
    const m = renderToStaticMarkup(<ConfirmDialog title="削除" message="本文" confirmLabel="削除する" onCancel={() => {}} onConfirm={() => {}} />);
    expect(m).toContain("mac-dialog");
    expect(m).toContain('role="alertdialog"');
    expect(m).toContain("aria-labelledby=");
    expect(m).toContain("削除する");
  });
  it("読み替えは、幅 md 以上かつ iPhone 版（.m-root）を含まない画面だけ。値はトークンから引く", () => {
    expect(start).toBeGreaterThan(0);
    expect(block).toContain("@media (min-width: 48rem)");
    const selectors = [...block.matchAll(/^\s*([^{}\n/*][^{}\n]*)\{/gm)].map((x) => x[1].trim()).filter((s) => !s.startsWith("@media"));
    expect(selectors.length).toBeGreaterThanOrEqual(7);
    for (const s of selectors) expect(s.startsWith(":root:not(:has(.m-root)) .mac-")).toBe(true);
    for (const v of ["--radius-mac-control", "--radius-mac-group", "--radius-mac-window", "--color-grouped-surface", "--color-separator", "--focus-ring", "--text-mac-footnote", "--text-mac-title3"]) {
      expect(block).toContain(`var(${v}`);
    }
  });
  it("操作の高さ・入力欄の文字（16px）・色の対比に関わる指定は、読み替えに含めない", () => {
    expect(block).not.toMatch(/min-height|(^|[\s;{])height\s*:/);
    const input = block.slice(block.indexOf(".mac-input {"), block.indexOf(".mac-label"));
    expect(input).not.toContain("font-size");
    expect(input).not.toMatch(/(^|[^-])color\s*:/m);
  });
});
