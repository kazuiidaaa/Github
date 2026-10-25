import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cssName, cssValue, loadEntries } from "../tokens/lib.mjs";

// デザイントークンの正本（tokens/*.tokens.json）が、PC版が読む app/globals.css の現行の宣言と一致すること（段階0の回帰テスト）。

type Entry = {
  path: string[];
  type: string;
  value: unknown;
  dark?: string;
  platforms?: string[];
  legacyAlias: boolean;
};

const css = fs.readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8");

/** 開き括弧 `header {` の最初の出現から、対応する閉じ括弧までの中身を返す。 */
function block(header: string): string {
  const start = css.indexOf(header + " {");
  if (start < 0) throw new Error(`ブロックが見つからない: ${header}`);
  let i = css.indexOf("{", start);
  const from = i + 1;
  let depth = 0;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(from, i);
  }
  throw new Error("括弧が閉じていない");
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function decls(body: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const x of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) m.set(x[1], norm(x[2]));
  return m;
}

const theme = decls(block("@theme"));
const themeStatic = decls(block("@theme static"));
const rootLight = decls(block(":root"));
const rootDark = decls(block(':root[data-theme="dark"]'));

const light = new Map([...theme, ...themeStatic, ...rootLight]);
const entries = loadEntries() as Entry[];

describe("デザイントークン（app/globals.css との一致）", () => {
  it("トークンが読み込める", () => {
    expect(entries.length).toBeGreaterThan(60);
  });

  it("明色：全トークンの値が app/globals.css の宣言と一致する", () => {
    for (const e of entries) {
      const name = cssName(e.path);
      expect(light.has(name), `${name} が globals.css にない`).toBe(true);
      expect(norm(cssValue(e, "light")), name).toBe(light.get(name));
    }
  });

  it("暗色：暗色値を持つトークンが、:root[data-theme=dark] の宣言と一致する", () => {
    const withDark = entries.filter((e) => e.dark);
    expect(withDark.length).toBeGreaterThan(40);
    for (const e of withDark) {
      const name = cssName(e.path);
      expect(rootDark.has(name), `${name} が暗色にない`).toBe(true);
      expect(norm(cssValue(e, "dark")), name).toBe(rootDark.get(name));
    }
  });

  it("暗色：globals.css の暗色の色宣言は、すべてトークンにある（取りこぼしがない）", () => {
    const named = new Map(entries.map((e) => [cssName(e.path), e]));
    for (const [name, value] of rootDark) {
      if (!/^#[0-9a-f]{6}$/.test(value)) continue;
      expect(named.get(name)?.dark, `${name} が暗色トークンにない`).toBe(value);
    }
  });

  it("明色：globals.css の @theme の色宣言（16進）は、すべてトークンにある", () => {
    const named = new Map(entries.map((e) => [cssName(e.path), e]));
    for (const [name, value] of theme) {
      if (!/^#[0-9a-f]{6}$/.test(value)) continue;
      expect(norm(String(named.get(name)?.value)), `${name} がトークンにない`).toBe(value);
    }
  });

  it("意味の名前は、旧色名への参照であり、暗色値は持たない（参照先に追随する）", () => {
    const semantic = entries.filter((e) => e.path[0] === "color" && typeof e.value === "string" && e.value.startsWith("{"));
    expect(semantic.length).toBe(16);
    for (const e of semantic) expect(e.dark).toBeUndefined();
  });

  it("旧色名（red・green・amber・yellow）は Web 互換のエイリアスとして区別されている", () => {
    for (const e of entries) {
      if (["red", "green", "amber", "yellow"].includes(e.path[1])) expect(e.legacyAlias, e.path.join(".")).toBe(true);
    }
  });
});
