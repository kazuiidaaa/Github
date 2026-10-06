import { describe, expect, it } from "vitest";
import { CATALOG, type MessageKey } from "../lib/i18n/messages";
import { caseNew } from "../lib/i18n/messages/caseNew";
import { employment } from "../lib/i18n/messages/employment";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";
import { CATEGORY_KEYS, noRuleMessage, procedureDescriptionText, targetStatusLegend } from "../lib/i18n/caseNew";
import { translate, untranslatedKeys } from "../lib/i18n/translate";
import { notApplicableMessage } from "../lib/requirements/evaluate";
import { CATEGORY_LABELS } from "../lib/requirements/rules";
import { PROCEDURE_TYPES, targetStatusLabel } from "../lib/types";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe.each([
  ["caseNew", caseNew],
  ["employment", employment],
] as const)("%s 区分の訳表", (name, table) => {
  const jaKeys = Object.keys(table.ja);

  it("キーがあり、CATALOG と reviewStatus に登録されている", () => {
    expect(jaKeys.length).toBeGreaterThan(0);
    expect(CATALOG[name]).toBe(table);
    expect(REVIEW_STATUS[name]).toEqual({ en: "draft", ko: "draft" });
  });

  it.each(["en", "ko"] as const)("%s は、日本語と同じキーがすべて埋まっている", (lang) => {
    expect(Object.keys(table[lang]).sort()).toEqual([...jaKeys].sort());
    for (const key of jaKeys) expect((table[lang] as Record<string, string>)[key], key).not.toBe("");
  });

  it.each(["en", "ko"] as const)("%s は、差し込み {名前} が日本語と一致する", (lang) => {
    for (const key of jaKeys) {
      expect(placeholders((table[lang] as Record<string, string>)[key]), key).toEqual(placeholders((table.ja as Record<string, string>)[key]));
    }
  });
});

describe("案件の新規登録の訳の引き方", () => {
  const tFor = (lang: "ja" | "en" | "ko") => (key: MessageKey, params?: Record<string, string | number>) => translate(lang, key, params);

  it("未訳（空）の訳は、日本語の原文に退避する", () => {
    expect(untranslatedKeys("en").filter((k) => k.startsWith("caseNew.") || k.startsWith("employment."))).toEqual([]);
    const saved = caseNew.en.title;
    (caseNew.en as Record<string, string>).title = "";
    try {
      expect(translate("en", "caseNew.title")).toBe(caseNew.ja.title);
    } finally {
      (caseNew.en as Record<string, string>).title = saved;
    }
  });

  it("{名前} を差し込む", () => {
    expect(translate("en", "caseNew.submitBulk", { count: 3 })).toBe("Create 3 cases");
    expect(translate("ko", "caseNew.createdBulk", { count: 2 })).toContain("2");
    expect(translate("ja", "caseNew.namesRowAria", { n: 4 })).toBe("案件名 4");
  });

  it("日本語の出力は、元の関数・定数と一致する", () => {
    const t = tFor("ja");
    expect(noRuleMessage(t)).toBe(notApplicableMessage());
    for (const type of ["", "renewal", "change", "coe", "acquisition", "other"] as const) {
      expect(targetStatusLegend(t, type)).toBe(targetStatusLabel(type));
    }
    for (const p of PROCEDURE_TYPES) expect(procedureDescriptionText(t, p.value)).toBe(p.description);
    expect(procedureDescriptionText(t, "")).toBeUndefined();
    for (const k of Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]) expect(t(CATEGORY_KEYS[k])).toBe(CATEGORY_LABELS[k]);
  });

  it("英語・韓国語でも、手続名と在留資格名は日本語のまま差し込まれる", () => {
    for (const lang of ["en", "ko"] as const) {
      const msg = noRuleMessage(tFor(lang));
      expect(msg).toContain("在留資格取得許可申請");
      expect(msg).toContain("経営・管理");
      expect(msg).not.toContain("{");
    }
  });
});
