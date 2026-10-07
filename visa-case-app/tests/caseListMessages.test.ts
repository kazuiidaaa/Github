import { describe, expect, it } from "vitest";
import { SORT_KEYS } from "../lib/caseMetrics";
import { sortDirKey, SORT_OPTION_KEYS, targetStatusKeys } from "../lib/i18n/caseList";
import { caseList } from "../lib/i18n/messages/caseList";
import { translate } from "../lib/i18n/translate";
import { getTargetStatusDisplay } from "../lib/types";

const jaKeys = Object.keys(caseList.ja);
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("caseList 区分の訳表", () => {
  it.each(["en", "ko"] as const)("%s は、日本語と同じキーがすべて埋まっている", (lang) => {
    expect(Object.keys(caseList[lang]).sort()).toEqual([...jaKeys].sort());
    for (const key of jaKeys) expect((caseList[lang] as Record<string, string>)[key], key).not.toBe("");
  });

  it.each(["en", "ko"] as const)("%s は、差し込み {名前} が日本語と一致する", (lang) => {
    for (const key of jaKeys) {
      expect(placeholders((caseList[lang] as Record<string, string>)[key]), key).toEqual(placeholders((caseList.ja as Record<string, string>)[key]));
    }
  });

  it("訳が空のときは、日本語の原文を返す", () => {
    const original = caseList.en.newCase;
    (caseList.en as Record<string, string>).newCase = "";
    try {
      expect(translate("en", "caseList.newCase")).toBe("新規案件");
    } finally {
      (caseList.en as Record<string, string>).newCase = original;
    }
  });

  it("{名前} を差し込む", () => {
    expect(translate("en", "caseList.resultCount", { count: 3, total: 10 })).toBe("3 matching (of 10 total)");
    expect(translate("ja", "caseList.resultCount", { count: 3, total: 10 })).toBe("該当 3 件（全 10 件）");
    expect(translate("ko", "caseList.pageOf", { page: 2, total: 5 })).toBe("2 / 5 페이지");
  });

  it("並び順の選択肢は、すべての並び順に訳がある", () => {
    for (const k of SORT_KEYS) expect(translate("ja", SORT_OPTION_KEYS[k])).toMatch(/^並び順：/);
  });

  it("日本語の見出しは、元の関数 getTargetStatusDisplay と一致する", () => {
    for (const type of ["change", "coe"]) {
      const orig = getTargetStatusDisplay(type, "x");
      const keys = targetStatusKeys(type);
      expect(translate("ja", keys.table)).toBe(orig?.tableLabel);
      expect(translate("ja", keys.card)).toBe(orig?.cardLabel);
    }
  });

  it("並び替えの向きの説明（日本語）は、元の表記と一致する", () => {
    expect(translate("ja", sortDirKey("expiry", "asc"))).toBe("近い順");
    expect(translate("ja", sortDirKey("expiry", "desc"))).toBe("遠い順");
    expect(translate("ja", sortDirKey("name", "asc"))).toBe("昇順");
    expect(translate("ja", sortDirKey("updated", "desc"))).toBe("降順");
  });
});
