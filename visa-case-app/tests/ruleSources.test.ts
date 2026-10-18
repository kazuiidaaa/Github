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
  it("全出典に kind があり、3値のいずれかで、URL の拡張子と矛盾しない", () => {
    for (const { rs, src } of ALL_SOURCES) {
      expect(src.kind, `${rs}: ${src.title}（kind が未設定）`).toBeDefined();
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
  const src = (comparedAt?: string) => ({ title: "t", url: "https://example.test/a.html", kind: "page" as const, comparedAt });

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

// 照合表がある資格（reconciliation/README.md の1章の表）。出典に kind があり、案内ページの出典に comparedAt（2026-10-18）が入っていること（Issue #374 項目2 手順2）
const RECONCILED_IDS = [
  ...["gijinkoku", "keiei_kanri", "kaigo", "houmu_kaikei", "iryo", "kenkyu", "kigyonai", "tokutei_kenkyu", "daigaku_sotsugyo", "tokutei_joho"].flatMap((p) => ["renewal", "change", "coe"].map((x) => `${p}_${x}`)),
  "gino_change", // 技能は変更のみ 2026-10-18 に照合。認定・更新は日付を入れない
  "hsp_acquisition",
  "gijinkoku_acquisition",
  "kazokutaizai_acquisition",
];

describe("照合表がある資格の出典", () => {
  it("すべての出典に kind があり、案内ページの出典に comparedAt（2026-10-18）がある", () => {
    for (const id of RECONCILED_IDS) {
      const rs = RULE_SETS.find((r) => r.id === id);
      expect(rs, id).toBeDefined();
      expect(rs!.sources.every((s) => s.kind !== undefined), `${id}: kind`).toBe(true);
      const pages = rs!.sources.filter((s) => s.kind === "page" && s.comparedAt);
      expect(pages.length, `${id}: comparedAt のある案内ページ`).toBeGreaterThan(0);
      expect(ruleSetComparedAt(rs!), id).toBe("2026-10-18");
    }
  });

  it("照合していない出典（技能の認定・更新、高度専門職の認定・変更・更新）は日付を入れない（推測しない）", () => {
    for (const id of ["gino_coe", "gino_renewal", "hsp_coe", "hsp_change", "hsp_change_2", "hsp_renewal"]) {
      const rs = RULE_SETS.find((r) => r.id === id);
      expect(rs, id).toBeDefined();
      expect(ruleSetComparedAt(rs!), id).toBeUndefined();
    }
  });
});
