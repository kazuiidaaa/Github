import { describe, expect, it } from "vitest";
import { loadEntries } from "../tokens/lib.mjs";

// PC 版 Mac 風の値（tokens/mac.tokens.json、Issue #456 PR1）のコントラスト（WCAG AA）と、出力先の限定を確かめる。

type Entry = { path: string[]; value: unknown; dark?: string; platforms?: string[] };
const entries = loadEntries() as Entry[];
const byName = new Map(entries.map((e) => [e.path.join("."), e]));

function hex(name: string, mode: "light" | "dark"): string {
  const e = byName.get(name);
  if (!e) throw new Error(name);
  const v = mode === "dark" && e.dark ? e.dark : e.value;
  if (typeof v !== "string" || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`${name} は 16進でない`);
  return v;
}

function lum(h: string): number {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe.each(["light", "dark"] as const)("Mac 風トークンのコントラスト（%s）", (mode) => {
  const fg = hex("base.foreground", mode);
  const muted = hex("color.slate.500", mode);
  const surfaces = ["color.window", "color.grouped-surface", "color.sidebar", "color.sidebar-selected"];

  it.each(surfaces)("本文色・補足色が %s の上で 4.5 以上", (s) => {
    expect(ratio(fg, hex(s, mode))).toBeGreaterThanOrEqual(4.5);
    // 補足色は、選択中の行には使わない（選択行は本文色）
    if (s !== "color.sidebar-selected") expect(ratio(muted, hex(s, mode))).toBeGreaterThanOrEqual(4.5);
  });

  it("焦点の輪が、各面に対し 3 以上", () => {
    for (const s of surfaces) expect(ratio(hex("focus-ring", mode), hex(s, mode)), s).toBeGreaterThanOrEqual(3);
  });
});

describe("Mac 風トークンの出力先", () => {
  it("新しいトークンはすべて CSS 専用（iPhone 版の Swift には出さない）", () => {
    const mac = entries.filter((e) => ["focus-ring", "radius", "control-height", "text"].includes(e.path[0]) || (e.path[0] === "shadow" && e.path[1].startsWith("mac-")) || ["window", "grouped-surface", "sidebar", "sidebar-selected", "separator"].includes(e.path[1]));
    expect(mac.length).toBeGreaterThan(20);
    for (const e of mac) expect(e.platforms, e.path.join(".")).toEqual(["css"]);
  });
});
