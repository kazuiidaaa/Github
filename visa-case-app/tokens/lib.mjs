// デザイントークンの共通処理。style-dictionary.config.mjs（生成）と tests/designTokens.test.ts（回帰テスト）の両方が使う。
// entry の形：{ path: string[], type: string, value: any（元の $value。参照は "{a.b}" のまま）, dark?: string, platforms?: string[], legacyAlias?: boolean }

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EXT_KEY = "app.visa-case";
export const TOKEN_FILES = [
  "base.tokens.json",
  "color.tokens.json",
  "semantic.tokens.json",
  "motion.tokens.json",
  "shadow.tokens.json",
  "mac.tokens.json",
];

const here = path.dirname(fileURLToPath(import.meta.url));

/** JSON ファイルを直接読み、トークンの一覧にする（style-dictionary を通さない）。 */
export function loadEntries(dir = here) {
  const entries = [];
  const walk = (node, p) => {
    if (node && typeof node === "object" && "$value" in node) {
      const ext = node.$extensions?.[EXT_KEY] ?? {};
      entries.push({
        path: p,
        type: node.$type,
        value: node.$value,
        dark: ext.dark,
        platforms: ext.platforms,
        legacyAlias: ext.legacyAlias === true,
      });
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (!k.startsWith("$")) walk(v, [...p, k]);
    }
  };
  for (const f of TOKEN_FILES) walk(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), []);
  return entries;
}

const isRef = (v) => typeof v === "string" && /^\{[^}]+\}$/.test(v);
const refPath = (v) => v.slice(1, -1).split(".");

/** Web の CSS 変数名。base と motion は接頭辞を付けない（app/globals.css の既存名に合わせる）。 */
export function cssName(p) {
  const parts = p[0] === "base" || p[0] === "motion" ? p.slice(1) : p;
  return "--" + parts.join("-");
}

export function shadowToCss(layers) {
  return layers
    .map((l) => {
      const spread = l.spread && l.spread !== "0" ? ` ${l.spread}` : "";
      return `${l.offsetX} ${l.offsetY} ${l.blur}${spread} ${l.color}`;
    })
    .join(", ");
}

/** CSS に書く値。色の参照は var() のまま（app/globals.css と同じ形）。mode は "light" | "dark"。 */
export function cssValue(e, mode = "light") {
  if (e.type === "color") {
    if (isRef(e.value)) return `var(${cssName(refPath(e.value))})`;
    return mode === "dark" && e.dark ? e.dark : e.value;
  }
  if (e.type === "cubicBezier") return `cubic-bezier(${e.value.join(", ")})`;
  if (e.type === "shadow") return shadowToCss(e.value);
  return e.value;
}

/** 参照をたどった色の値（Swift 用）。 */
export function resolveColor(entries, e, mode) {
  const byPath = new Map(entries.map((x) => [x.path.join("."), x]));
  let cur = e;
  while (isRef(cur.value)) cur = byPath.get(refPath(cur.value).join("."));
  return mode === "dark" && cur.dark ? cur.dark : cur.value;
}

export function generateCss(entries) {
  const all = entries.filter((e) => !e.platforms || e.platforms.includes("css"));
  const light = all.map((e) => `  ${cssName(e.path)}: ${cssValue(e, "light")};`);
  const dark = all.filter((e) => e.type === "color" && e.dark).map((e) => `  ${cssName(e.path)}: ${cssValue(e, "dark")};`);
  return [
    "/* 自動生成（npm run tokens:build）。直接編集しない。正本は tokens/*.tokens.json。",
    " * 今は、どこからも読み込まない（app/globals.css は変更していない）。 */",
    ":root {",
    ...light,
    "}",
    "",
    ':root[data-theme="dark"] {',
    ...dark,
    "}",
    "",
  ].join("\n");
}

const camel = (parts) =>
  parts
    .join("-")
    .split("-")
    .map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1)))
    .join("");

const swiftHex = (hex) => "0x" + hex.slice(1).toUpperCase();
const num = (s) => String(parseFloat(s)).replace(/^(\d+)$/, "$1.0");
const px = (s) => num(s.replace("px", ""));

export function generateSwift(entries) {
  const out = [];
  out.push(
    "// 自動生成（npm run tokens:build）。直接編集しない。正本は tokens/*.tokens.json。",
    "import SwiftUI",
    "#if canImport(UIKit)",
    "import UIKit",
    "#endif",
    "",
    "public enum DesignTokens {",
    "  /// 明色・暗色の両方の値を持つ色。",
    "  public enum Colors {",
  );
  for (const e of entries.filter((x) => x.type === "color" && (!x.platforms || x.platforms.includes("swift")))) {
    const name = camel(e.path.slice(1));
    const l = swiftHex(resolveColor(entries, e, "light"));
    const d = swiftHex(resolveColor(entries, e, "dark"));
    out.push(`    public static let ${name} = Color(light: ${l}, dark: ${d})`);
  }
  out.push("  }", "", "  public enum Motion {");
  out.push("    public struct CubicBezier { public let x1: Double, y1: Double, x2: Double, y2: Double }");
  for (const e of entries.filter((x) => x.path[0] === "motion" && (!x.platforms || x.platforms.includes("swift")))) {
    const name = camel(e.path.slice(1));
    if (e.type === "cubicBezier") {
      const [a, b, c, d] = e.value;
      out.push(`    public static let ${name} = CubicBezier(x1: ${num(String(a))}, y1: ${num(String(b))}, x2: ${num(String(c))}, y2: ${num(String(d))})`);
    } else if (e.type === "duration") {
      out.push(`    /// 秒`, `    public static let ${name}: Double = ${parseFloat(e.value)}`);
    }
  }
  out.push("  }", "", "  public enum Shadows {");
  out.push(
    "    /// blur は CSS の blur 半径（px）。SwiftUI の radius に使うときは、見た目を確かめて調整する。",
    "    public struct Layer { public let x: Double, y: Double, blur: Double, spread: Double, opacity: Double }",
  );
  for (const e of entries.filter((x) => x.type === "shadow" && (!x.platforms || x.platforms.includes("swift")))) {
    const layers = e.value.map((l) => {
      const op = l.color.match(/\/\s*([\d.]+)\s*\)/)[1];
      return `Layer(x: ${px(l.offsetX)}, y: ${px(l.offsetY)}, blur: ${px(l.blur)}, spread: ${px(l.spread)}, opacity: ${op})`;
    });
    out.push(`    public static let ${camel(e.path.slice(1))}: [Layer] = [`, ...layers.map((s) => `      ${s},`), "    ]");
  }
  out.push(
    "  }",
    "}",
    "",
    "extension Color {",
    "  /// 0xRRGGBB。暗色の画面では dark を返す。",
    "  init(light: UInt32, dark: UInt32) {",
    "    #if canImport(UIKit)",
    "    self.init(UIColor { trait in",
    "      let v = trait.userInterfaceStyle == .dark ? dark : light",
    "      return UIColor(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255, blue: CGFloat(v & 0xFF) / 255, alpha: 1)",
    "    })",
    "    #else",
    "    self.init(red: Double((light >> 16) & 0xFF) / 255, green: Double((light >> 8) & 0xFF) / 255, blue: Double(light & 0xFF) / 255)",
    "    #endif",
    "  }",
    "}",
    "",
  );
  return out.join("\n");
}
