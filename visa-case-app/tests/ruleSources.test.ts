import { describe, expect, it } from "vitest";
import { RULE_SETS, ruleSetComparedAt, type SourceKind } from "@/lib/requirements/rules";

const KINDS: SourceKind[] = ["page", "pdf", "form"];

/** URL の拡張子から期待される kind（Issue #374 項目2） */
function kindFromUrl(url: string): SourceKind | null {
  const path = url.split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".html") || path.endsWith(".htm")) return "page";
  if (path.endsWith(".pdf")) return "pdf";
  if (/\.(xlsx|xls|docx|doc)$/.test(path)) return "form";
  return null;
}

const ALL_SOURCES = RULE_SETS.flatMap((rs) => rs.sources.map((src) => ({ rs: rs.title, src })));

describe("RuleSource の kind", () => {
  it("kind がある出典は、3値のいずれかで、URL の拡張子と矛盾しない", () => {
    for (const { rs, src } of ALL_SOURCES) {
      if (src.kind === undefined) continue;
      expect(KINDS, `${rs}: ${src.title}`).toContain(src.kind);
      const expected = kindFromUrl(src.url);
      if (expected !== null) expect(src.kind, `${rs}: ${src.url}`).toBe(expected);
    }
  });
});

describe("RuleSource の comparedAt", () => {
  it("comparedAt がある出典は、実在する日付（YYYY-MM-DD）で、未来日でない", () => {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    for (const { rs, src } of ALL_SOURCES) {
      if (src.comparedAt === undefined) continue;
      expect(src.comparedAt, `${rs}: ${src.title}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const d = new Date(`${src.comparedAt}T00:00:00Z`);
      expect(Number.isNaN(d.getTime()), `${src.comparedAt}`).toBe(false);
      expect(d.toISOString().slice(0, 10), `${src.comparedAt}`).toBe(src.comparedAt);
      expect(src.comparedAt <= today, `${rs}: ${src.comparedAt} は未来日`).toBe(true);
    }
  });
});

describe("ruleSetComparedAt", () => {
  const src = (comparedAt?: string) => ({ title: "t", url: "https://example.test/a.html", comparedAt });

  it("出典の comparedAt のうち最も新しい日を返す", () => {
    expect(ruleSetComparedAt({ sources: [src("2026-10-12"), src("2026-10-18"), src(undefined), src("2026-10-07")] })).toBe("2026-10-18");
  });

  it("comparedAt が1件もなければ undefined（画面側は checkedAt に戻る）", () => {
    const rs = { sources: [src(undefined)], checkedAt: "2026-10-04" };
    expect(ruleSetComparedAt(rs)).toBeUndefined();
    expect(ruleSetComparedAt({ sources: [] })).toBeUndefined();
    expect(ruleSetComparedAt(rs) ?? rs.checkedAt).toBe("2026-10-04");
  });

  it("comparedAt があれば、checkedAt より優先される", () => {
    const rs = { sources: [src("2026-10-18")], checkedAt: "2026-10-12" };
    expect(ruleSetComparedAt(rs) ?? rs.checkedAt).toBe("2026-10-18");
  });
});
