import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { passwordUpdateErrorMessage } from "../lib/authMessages";
import { translateAuthError } from "../lib/i18n/authErrors";
import { about } from "../lib/i18n/messages/about";
import { auth } from "../lib/i18n/messages/auth";
import { translate } from "../lib/i18n/translate";
import { PROTOTYPE_NOTICE, REVIEW_NOTICE } from "../lib/notices";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tables = { auth, about } as const;

describe.each(Object.entries(tables))("%s 区分の訳表", (_name, table) => {
  const jaKeys = Object.keys(table.ja);
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

describe("エラー文の対応", () => {
  const t = (lang: "ja" | "en" | "ko") => (key: Parameters<typeof translate>[1]) => translate(lang, key);

  it("passwordUpdateErrorMessage の全ての文が、日本語の訳表と一致し、英語・韓国語に訳せる", () => {
    for (const code of ["same_password", "weak_password", "session_expired", "bad_jwt", undefined, "unexpected_failure"]) {
      const ja = passwordUpdateErrorMessage({ code });
      expect(translateAuthError(t("ja"), ja)).toBe(ja);
      for (const lang of ["en", "ko"] as const) expect(translateAuthError(t(lang), ja), `${code}/${lang}`).not.toBe(ja);
    }
  });

  it("lib/auth.ts の画面に出る日本語の文が、訳表の日本語と一致する", () => {
    const src = readFileSync("lib/auth.ts", "utf8");
    for (const key of ["err_noSupabase", "err_badCredentials", "err_server", "err_resetTrouble", "err_passwordShort"] as const) {
      expect(src, key).toContain(`"${auth.ja[key]}"`);
    }
  });

  it("未知の文は、そのまま返す", () => {
    expect(translateAuthError(t("en"), "未知の文")).toBe("未知の文");
  });
});

describe("ご利用にあたって", () => {
  it("日本語の注意書きは、lib/notices.ts の定数と同じ内容", () => {
    expect(about.ja.notice).toBe(`${PROTOTYPE_NOTICE}。${REVIEW_NOTICE}。`);
  });
});

describe("未訳の退避と差し込み", () => {
  it("英語で訳が空なら、日本語の原文を返す", () => {
    const saved = auth.en.email;
    (auth.en as Record<string, string>).email = "";
    try {
      expect(translate("en", "auth.email")).toBe(auth.ja.email);
    } finally {
      (auth.en as Record<string, string>).email = saved;
    }
  });
  it("{名前} を差し込める", () => {
    expect(translate("ko", "auth.disabledBody", { envFile: "A", readme: "B" })).toContain("A");
    expect(translate("en", "auth.disabledBody", { envFile: "A", readme: "B" })).not.toContain("{");
  });
});
