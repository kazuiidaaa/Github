import { describe, expect, it } from "vitest";
import { dialog } from "../lib/i18n/messages/dialog";

const jaKeys = Object.keys(dialog.ja);
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dialog 区分の訳表", () => {
  it("キーがある", () => {
    expect(jaKeys.length).toBeGreaterThan(0);
  });

  it.each(["en", "ko"] as const)("%s は、日本語と同じキーがすべて埋まっている", (lang) => {
    expect(Object.keys(dialog[lang]).sort()).toEqual([...jaKeys].sort());
    for (const key of jaKeys) {
      expect((dialog[lang] as Record<string, string>)[key], key).not.toBe("");
    }
  });

  it.each(["en", "ko"] as const)("%s は、差し込み {名前} が日本語と一致する", (lang) => {
    for (const key of jaKeys) {
      const ja = (dialog.ja as Record<string, string>)[key];
      const other = (dialog[lang] as Record<string, string>)[key];
      expect(placeholders(other), key).toEqual(placeholders(ja));
    }
  });
});
