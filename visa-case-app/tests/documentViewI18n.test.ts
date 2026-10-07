import { describe, expect, it } from "vitest";
import { LANGS } from "../lib/documents/lang";
import { CATALOG } from "../lib/i18n/messages";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";
import { translate, untranslatedKeys } from "../lib/i18n/translate";

const table = CATALOG.documentView as unknown as Record<string, Record<string, string>>;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("documentView 区分の訳表", () => {
  it("英語・韓国語のキーが日本語と同じで、すべて埋まっている", () => {
    const keys = Object.keys(table.ja);
    expect(keys.length).toBeGreaterThan(0);
    for (const lang of LANGS) {
      expect(Object.keys(table[lang]).sort()).toEqual([...keys].sort());
      for (const k of keys) expect(table[lang][k], `${k} (${lang})`).toBeTruthy();
    }
  });
  it("差し込み {名前} が、言語間で一致する", () => {
    for (const k of Object.keys(table.ja)) {
      for (const lang of LANGS) expect(placeholders(table[lang][k]), `${k} (${lang})`).toEqual(placeholders(table.ja[k]));
    }
  });
  it("確認状態の一覧に登録されている（英語・韓国語は下書き）", () => {
    expect(REVIEW_STATUS.documentView).toEqual({ en: "draft", ko: "draft" });
  });
  it("未訳がない", () => {
    expect(untranslatedKeys("en").filter((k) => k.startsWith("documentView."))).toEqual([]);
    expect(untranslatedKeys("ko").filter((k) => k.startsWith("documentView."))).toEqual([]);
  });
  it("日本語は、元の画面の文言と同じ", () => {
    expect(translate("ja", "documentView.reviewedMessage")).toBe(
      "この版を、行政書士が内容を確認した版として記録します。確認者の名前と確認日時が、書類に表示されます。",
    );
    expect(translate("ja", "documentView.fileFailed", { reason: "x" })).toBe("ファイルの出力に失敗しました：x");
    expect(translate("ja", "documentView.newerVersion", { latest: 3 })).toBe("これより新しい版（v3）があります。");
  });
  it("画面の言語と書類の言語が別である旨を、日本語以外で示す", () => {
    expect(translate("en", "documentView.langNoticeJa")).toContain("Japanese");
    expect(translate("ko", "documentView.langNoticeJa")).toContain("일본어");
  });
});
