import { describe, expect, it } from "vitest";
import { AUDIT_LABELS } from "../lib/auditLabels";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type CheckRecord } from "../lib/types";
import { LANGS } from "../lib/documents/lang";
import { ERROR_KEYS, AUDIT_KEYS, ROLE_KEYS, makeAccountText } from "../lib/i18n/accountText";
import { makeMetricText } from "../lib/i18n/metrics";
import { nextActionMessage } from "../lib/i18n/nextActionText";
import { CATALOG } from "../lib/i18n/messages";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";
import { translate, untranslatedKeys, type MessageParams } from "../lib/i18n/translate";
import type { MessageKey } from "../lib/i18n/messages";
import { decideNextAction } from "../lib/nextAction";
import { METRICS } from "../lib/dashboardMetrics";
import { AppError, messageOf, toAppError } from "../lib/errors";
import { ROLES, ROLE_LABELS } from "../lib/permissions";

type Table = Record<string, string>;
const NAMESPACES = ["home", "account"] as const;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tFor = (lang: "ja" | "en" | "ko") => (key: MessageKey, params?: MessageParams) => translate(lang, key, params);

describe("home・account 区分の訳表", () => {
  for (const ns of NAMESPACES) {
    const table = CATALOG[ns] as unknown as Record<string, Table>;
    it(`${ns}：3言語で同じキーを持ち、すべて埋まっている`, () => {
      const keys = Object.keys(table.ja);
      expect(keys.length).toBeGreaterThan(0);
      for (const lang of LANGS) {
        expect(Object.keys(table[lang]).sort()).toEqual([...keys].sort());
        for (const k of keys) expect(table[lang][k], `${ns}.${k} (${lang})`).toBeTruthy();
      }
    });
    it(`${ns}：差し込み {名前} が言語間で一致する`, () => {
      for (const k of Object.keys(table.ja)) {
        for (const lang of LANGS) expect(placeholders(table[lang][k]), `${ns}.${k} (${lang})`).toEqual(placeholders(table.ja[k]));
      }
    });
    it(`${ns}：確認状態が登録され、未訳がない`, () => {
      expect(REVIEW_STATUS[ns]).toEqual({ en: "draft", ko: "draft" });
      for (const lang of ["en", "ko"] as const) {
        expect(untranslatedKeys(lang).filter((k) => k.startsWith(`${ns}.`))).toEqual([]);
      }
    });
  }

  it("{名前} を差し込める", () => {
    expect(translate("en", "home.countsTitle", { total: 3 })).toContain("3");
    expect(translate("ko", "account.members_roleOf", { email: "a@example.test" })).toContain("a@example.test");
  });
});

describe("指標カード：日本語が元の定義と一致する", () => {
  for (const m of METRICS) {
    it(m.key, () => {
      expect(makeMetricText(tFor("ja"), m.key)).toEqual({ label: m.label, description: m.description });
      expect(makeMetricText(tFor("en"), m.key).label).not.toBe(m.label);
    });
  }
});

describe("操作履歴・ロール名：日本語が元の定義と一致する", () => {
  it("操作名のキーの集合が AUDIT_LABELS と一致し、日本語が同じ", () => {
    expect(Object.keys(AUDIT_KEYS).sort()).toEqual(Object.keys(AUDIT_LABELS).sort());
    const text = makeAccountText(tFor("ja"));
    for (const [action, label] of Object.entries(AUDIT_LABELS)) expect(text.audit(action)).toBe(label);
  });
  it("未知の操作名は、そのまま返す（元の関数と同じ）", () => {
    expect(makeAccountText(tFor("en")).audit("unknown_action")).toBe("unknown_action");
  });
  it("ロール名", () => {
    expect(Object.keys(ROLE_KEYS).sort()).toEqual([...ROLES].sort());
    const ja = makeAccountText(tFor("ja"));
    const en = makeAccountText(tFor("en"));
    for (const r of ROLES) {
      expect(ja.role(r)).toBe(ROLE_LABELS[r]);
      expect(en.role(r)).not.toBe(ROLE_LABELS[r]);
    }
    expect(en.role("client")).toBe("client");
  });
});

describe("エラー文", () => {
  it("lib が返す日本語の文が、表に含まれ、日本語では同じ文に戻る", () => {
    const ja = makeAccountText(tFor("ja"));
    const sources = [
      messageOf(new Error("x")),
      toAppError({}).message,
      toAppError({ code: "42501" }).message,
      toAppError({ code: "401" }).message,
      toAppError({ code: "23505" }).message,
      toAppError({ code: "413" }).message,
    ];
    for (const s of sources) {
      expect(ERROR_KEYS, s).toHaveProperty([s]);
      expect(ja.error(s)).toBe(s);
    }
    for (const s of Object.keys(ERROR_KEYS)) expect(ja.error(s)).toBe(s);
  });
  it("英語・韓国語では訳され、表にない文は原文のまま", () => {
    const en = makeAccountText(tFor("en"));
    expect(en.error(messageOf(new AppError("この操作を行う権限がありません。")))).not.toMatch(/[ぁ-ん]/);
    expect(en.error("表にない文")).toBe("表にない文");
  });
});

function make(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT, category: "1" },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}
const card = { id: "d1", documentType: "residence_card", fileName: "a.png", mimeType: "image/png" } as CaseRecord["documents"][number];
const check = (status: CheckRecord["status"]): CheckRecord => ({ key: "k", type: "manual", name: "n", status, note: "" });
const confirmed = { ...EMPTY_APPLICANT, confirmationStatus: "confirmed" as const };
function ready(over: Partial<CaseRecord> = {}): CaseRecord {
  const states: CaseRecord["requirementStates"] = {};
  for (const id of ["application_form", "photo", "passport_card"]) states[id] = { status: "received" };
  return make({ documents: [card], applicant: confirmed, requirementStates: states, ...over });
}

describe("次に行うこと：日本語が元の案内文と一致する", () => {
  const scenarios: [string, CaseRecord][] = [
    ["段階1", make()],
    ["段階2", make({ documents: [card] })],
    ["段階3", make({ documents: [card], applicant: confirmed })],
    ["段階4（チェックなし）", ready()],
    ["段階4（未解決あり）", ready({ checks: [check("pending"), check("failed")] })],
    ["段階5", ready({ checks: [check("passed")] })],
  ];
  for (const [name, c] of scenarios) {
    it(name, () => {
      expect(nextActionMessage(tFor("ja"), c)).toBe(decideNextAction(c).message);
      for (const lang of ["en", "ko"] as const) {
        expect(nextActionMessage(tFor(lang), c)).not.toMatch(/[ぁ-ん]/);
      }
    });
  }
});
