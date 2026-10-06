import { describe, expect, it } from "vitest";
import { LANGS } from "../lib/documents/lang";
import { OFFICIAL_FORM_LOGIN_REQUIRED } from "../lib/documents/officialFormAccess";
import { OFFICIAL_FORM_SPECS, officialFormScopeWarnings } from "../lib/documents/officialForms";
import { precheckRows, type PrecheckInput } from "../lib/documents/precheck";
import {
  DOCUMENT_TYPE_LABELS,
  GENERATED_STATUS_LABELS,
  OFFICIAL_FORM_NOTICES,
  OUTPUT_FORMAT_LABELS,
} from "../lib/documents/types";
import { AppError, messageOf, toAppError } from "../lib/errors";
import {
  DOCUMENT_TYPE_KEYS,
  ERROR_TEXT_KEYS,
  GENERATED_STATUS_KEYS,
  OFFICIAL_NOTICE_KEYS,
  OUTPUT_FORMAT_KEYS,
  errorText,
  makeDocumentLabels,
  precheckRowsText,
  scopeWarningsText,
} from "../lib/i18n/documentsView";
import { CATALOG } from "../lib/i18n/messages";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";
import { translate, untranslatedKeys, type MessageParams } from "../lib/i18n/translate";
import type { MessageKey } from "../lib/i18n/messages";
import type { ProcedureType } from "../lib/types";

const table = CATALOG.documents as unknown as Record<string, Record<string, string>>;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tFor = (lang: (typeof LANGS)[number]) => (key: MessageKey, params?: MessageParams) => translate(lang, key, params);
const ja = tFor("ja");

describe("documents 区分の訳表", () => {
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
    expect(REVIEW_STATUS.documents).toEqual({ en: "draft", ko: "draft" });
  });
  it("未訳は日本語に退避する", () => {
    expect(untranslatedKeys("en").filter((k) => k.startsWith("documents."))).toEqual([]);
    const saved = table.en.notFound;
    table.en.notFound = "";
    try {
      expect(translate("en", "documents.notFound")).toBe("案件が見つかりません。");
    } finally {
      table.en.notFound = saved;
    }
  });
  it("{名前} を差し込める", () => {
    expect(translate("en", "documents.unresolvedLine1", { count: 3 })).toContain("3 unresolved");
    expect(translate("ko", "documents.showArchived", { count: 2 })).toContain("2건");
  });
});

describe("書類の種類・状態・出力形式・公式様式の注意：日本語は元の定数と一致", () => {
  it("書類の種類", () => {
    expect(Object.keys(DOCUMENT_TYPE_KEYS).sort()).toEqual(Object.keys(DOCUMENT_TYPE_LABELS).sort());
    for (const [type, label] of Object.entries(DOCUMENT_TYPE_LABELS)) expect(ja(DOCUMENT_TYPE_KEYS[type as keyof typeof DOCUMENT_TYPE_KEYS])).toBe(label);
  });
  it("状態", () => {
    for (const [s, label] of Object.entries(GENERATED_STATUS_LABELS)) expect(ja(GENERATED_STATUS_KEYS[s as keyof typeof GENERATED_STATUS_KEYS])).toBe(label);
  });
  it("出力形式", () => {
    for (const [f, label] of Object.entries(OUTPUT_FORMAT_LABELS)) expect(ja(OUTPUT_FORMAT_KEYS[f as keyof typeof OUTPUT_FORMAT_KEYS])).toBe(label);
  });
  it("公式様式の注意・ログイン案内", () => {
    expect(OFFICIAL_NOTICE_KEYS.map((k) => ja(k))).toEqual(OFFICIAL_FORM_NOTICES);
    expect(ja("documents.officialLoginRequired")).toBe(OFFICIAL_FORM_LOGIN_REQUIRED);
  });
  it("英語・韓国語でも、全種類に表示名がある", () => {
    for (const lang of ["en", "ko"] as const) {
      const l = makeDocumentLabels(tFor(lang));
      for (const type of Object.keys(DOCUMENT_TYPE_LABELS)) expect(l.documentType(type as keyof typeof DOCUMENT_TYPE_LABELS)).not.toBe(DOCUMENT_TYPE_LABELS[type as keyof typeof DOCUMENT_TYPE_LABELS]);
    }
  });
});

describe("公式様式の対象外の注意", () => {
  const procedures = ["renewal", "coe", "change", "acquisition", "other"] as ProcedureType[];
  const statuses = ["技術・人文知識・国際業務", "留学"];
  for (const procedureType of procedures) {
    for (const currentStatus of statuses) {
      it(`${procedureType}／${currentStatus}：日本語が元の関数と一致する`, () => {
        const s = { procedureType, currentStatus, residenceStatus: currentStatus };
        expect(scopeWarningsText(ja, s)).toEqual(officialFormScopeWarnings(s));
      });
    }
  }
  it("英語では、日本語の文言を返さない", () => {
    const w = scopeWarningsText(tFor("en"), { procedureType: "renewal", currentStatus: "留学", residenceStatus: "留学" });
    expect(w).toHaveLength(1);
    expect(w[0]).toContain("技術・人文知識・国際業務");
    expect(w[0]).toContain("This form is for");
  });
  it("様式の定義がある手続種別は、すべて訳がある", () => {
    for (const p of Object.keys(OFFICIAL_FORM_SPECS)) {
      const w = scopeWarningsText(tFor("ko"), { procedureType: p as ProcedureType, currentStatus: "x", residenceStatus: "x" });
      expect(w[0] ?? "").toMatch(/이 서식|^$/);
    }
  });
});

describe("事前チェック（データ状態）", () => {
  const inputs: PrecheckInput[] = [];
  for (const applicantConfirmed of [true, false])
    for (const hasRuleSet of [true, false])
      for (const [requiredCount, receivedCount] of [[5, 5], [5, 2], [0, 0], [3, 4]])
        for (const [checksTotal, checksUnresolved] of [[0, 0], [4, 2], [4, 0]])
          inputs.push({ applicantConfirmed, hasRuleSet, requiredCount, receivedCount, checksTotal, checksUnresolved });

  it("日本語の出力が、元の関数の返り値と一致する（全組み合わせ）", () => {
    for (const i of inputs) expect(precheckRowsText(ja, i)).toEqual(precheckRows(i));
  });
  it("英語・韓国語では、状態・詳細・注意が日本語のままではない", () => {
    for (const lang of ["en", "ko"] as const) {
      for (const i of inputs) {
        const orig = precheckRows(i);
        precheckRowsText(tFor(lang), i).forEach((r, n) => {
          expect(r.key).toBe(orig[n].key);
          expect(r.tone).toBe(orig[n].tone);
          expect(r.unresolved).toBe(orig[n].unresolved);
          expect(r.tab).toBe(orig[n].tab);
          expect(r.label).not.toBe(orig[n].label);
          expect(r.status).not.toBe(orig[n].status);
          if (orig[n].detail) expect(r.detail).not.toBe(orig[n].detail);
          expect(Boolean(r.warning)).toBe(Boolean(orig[n].warning));
          if (orig[n].warning) expect(r.warning).not.toBe(orig[n].warning);
        });
      }
    }
  });
});

describe("エラー文の訳", () => {
  it("訳表の日本語が、キー（元の文言）と一致する", () => {
    for (const [text, key] of Object.entries(ERROR_TEXT_KEYS)) expect(ja(key)).toBe(text);
  });
  it("lib/errors.ts が返す文言は、すべて対応している", () => {
    const texts = [
      toAppError({ code: "42501" }).message,
      toAppError({ code: "401" }).message,
      toAppError({ code: "23505" }).message,
      toAppError({ code: "413" }).message,
      toAppError({}).message,
      messageOf(new Error("x")),
    ];
    for (const text of texts) expect(ERROR_TEXT_KEYS[text], text).toBeDefined();
  });
  it("英語・韓国語へ引き直す。未知の文言は、そのまま返す", () => {
    const en = tFor("en");
    expect(errorText(en, messageOf(new AppError("この操作を行う権限がありません。")))).toBe("You do not have permission to perform this operation.");
    expect(errorText(tFor("ko"), "ログインが必要です。")).toBe("로그인이 필요합니다.");
    expect(errorText(en, "未知の文言")).toBe("未知の文言");
  });
  it("読み込み失敗の前置きは、理由も訳す。日本語は元と同じ", () => {
    const text = "生成文書の読み込みに失敗しました：この操作を行う権限がありません。";
    expect(errorText(ja, text)).toBe(text);
    expect(errorText(tFor("en"), text)).toBe("Failed to load generated documents: You do not have permission to perform this operation.");
  });
});
