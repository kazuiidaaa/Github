import { afterEach, describe, expect, it, vi } from "vitest";
import { LANGS } from "../lib/documents/lang";
import { CATALOG } from "../lib/i18n/messages";
import { REVIEW_STATUS, draftNamespaces, hasDraft } from "../lib/i18n/reviewStatus";
import { translate, untranslatedKeys } from "../lib/i18n/translate";

type Table = Record<string, Record<string, string>>;
const catalog = CATALOG as unknown as Record<string, Table>;

describe("translate（値の差し込み）", () => {
  it("日本語の文言を返す", () => {
    expect(translate("ja", "header.home")).toBe("ホーム");
  });

  it("params がなければ、文言をそのまま返す", () => {
    expect(translate("en", "header.home")).toBe(catalog.header.en.home);
  });
});

describe("translate（差し込みと、日本語への退避）", () => {
  afterEach(() => {
    vi.doUnmock("../lib/i18n/messages");
    vi.resetModules();
  });

  async function loadWithFakeCatalog() {
    vi.resetModules();
    vi.doMock("../lib/i18n/messages", () => ({
      CATALOG: {
        t: {
          ja: { greet: "こんにちは、{name}さん（{n}件）", onlyJa: "日本語のみ", plain: "固定" },
          en: { greet: "Hello, {name} ({n})", onlyJa: "", plain: "Fixed" },
          ko: { greet: "", onlyJa: "", plain: "" },
        },
      },
    }));
    return await import("../lib/i18n/translate");
  }

  it("{名前} の部分を、文字列・数値で置き換える", async () => {
    const m = await loadWithFakeCatalog();
    expect(m.translate("ja", "t.greet" as never, { name: "テスト", n: 3 })).toBe("こんにちは、テストさん（3件）");
    expect(m.translate("en", "t.greet" as never, { name: "Test", n: 0 })).toBe("Hello, Test (0)");
  });

  it("params にない {名前} は、そのまま残す", async () => {
    const m = await loadWithFakeCatalog();
    expect(m.translate("en", "t.greet" as never, { name: "Test" })).toBe("Hello, Test ({n})");
  });

  it("英語・韓国語の文言が空の場合は、日本語の原文を返す", async () => {
    const m = await loadWithFakeCatalog();
    expect(m.translate("en", "t.onlyJa" as never)).toBe("日本語のみ");
    expect(m.translate("ko", "t.onlyJa" as never)).toBe("日本語のみ");
    expect(m.translate("ko", "t.greet" as never, { name: "A", n: 1 })).toBe("こんにちは、Aさん（1件）");
    expect(m.translate("en", "t.plain" as never)).toBe("Fixed");
  });

  it("空の文言は、未訳として数える", async () => {
    const m = await loadWithFakeCatalog();
    expect(m.untranslatedKeys("en")).toEqual(["t.onlyJa"]);
    expect(m.untranslatedKeys("ko")).toEqual(["t.greet", "t.onlyJa", "t.plain"]);
    expect(m.untranslatedKeys("ja")).toEqual([]);
  });
});

describe("訳表（CATALOG）の整合", () => {
  it("英語・韓国語に、未訳（空）の文言がない", () => {
    expect(untranslatedKeys("en")).toEqual([]);
    expect(untranslatedKeys("ko")).toEqual([]);
  });

  it("すべての区分で、英語・韓国語のキーが日本語と一致する", () => {
    for (const [ns, table] of Object.entries(catalog)) {
      const ja = Object.keys(table.ja).sort();
      expect(ja.length, ns).toBeGreaterThan(0);
      for (const lang of LANGS) {
        expect(Object.keys(table[lang]).sort(), `${ns}.${lang}`).toEqual(ja);
      }
    }
  });

  it("日本語の文言は、すべて空でない", () => {
    for (const [ns, table] of Object.entries(catalog)) {
      for (const [k, v] of Object.entries(table.ja)) expect(v, `${ns}.${k}`).not.toBe("");
    }
  });

  it("英語・韓国語の差し込み部分 {名前} が、日本語と一致する", () => {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [ns, table] of Object.entries(catalog)) {
      for (const [k, ja] of Object.entries(table.ja)) {
        expect(names(table.en[k]), `${ns}.${k}.en`).toEqual(names(ja));
        expect(names(table.ko[k]), `${ns}.${k}.ko`).toEqual(names(ja));
      }
    }
  });
});

describe("訳文の確認状態（reviewStatus）", () => {
  it("確認状態の区分が、訳表の区分と一致する", () => {
    expect(Object.keys(REVIEW_STATUS).sort()).toEqual(Object.keys(catalog).sort());
    for (const s of Object.values(REVIEW_STATUS)) expect(Object.keys(s).sort()).toEqual(["en", "ko"]);
  });

  it("日本語は、確認前の対象にならない", () => {
    expect(hasDraft("ja")).toBe(false);
    expect(draftNamespaces("ja")).toEqual([]);
  });

  it("確認前の区分の有無と一覧が、REVIEW_STATUS と一致する", () => {
    for (const lang of ["en", "ko"] as const) {
      const expected = Object.entries(REVIEW_STATUS)
        .filter(([, s]) => s[lang] !== "reviewed")
        .map(([ns]) => ns);
      expect(draftNamespaces(lang)).toEqual(expected);
      expect(hasDraft(lang)).toBe(expected.length > 0);
    }
  });
});
