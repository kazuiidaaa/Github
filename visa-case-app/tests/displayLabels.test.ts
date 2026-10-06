import { describe, expect, it } from "vitest";
import { EXPIRY_LEVEL_LABELS, expiryMessage, type ExpiryLevel } from "../lib/caseMetrics";
import { LANGS } from "../lib/documents/lang";
import { expiryLevelLabel, expiryText } from "../lib/i18n/expiry";
import {
  CHECK_STATUS_KEYS,
  CHECK_TYPE_KEYS,
  DOCUMENT_STATUS_KEYS,
  REQUIREMENT_STATUS_KEYS,
  WORKFLOW_KEYS,
  makeLabels,
} from "../lib/i18n/labels";
import { CATALOG } from "../lib/i18n/messages";
import { translate } from "../lib/i18n/translate";
import {
  CHECK_STATUS_LABELS,
  CHECK_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  REQUIREMENT_STATUS_LABELS,
  WORKFLOW_LABELS,
} from "../lib/types";

const NAMESPACES = ["display", "labels"] as const;
type Table = Record<string, string>;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("display・labels 区分の訳", () => {
  for (const ns of NAMESPACES) {
    const table = CATALOG[ns] as unknown as Record<string, Table>;
    it(`${ns}：英語・韓国語のキーが日本語と同じで、すべて埋まっている`, () => {
      const keys = Object.keys(table.ja);
      expect(keys.length).toBeGreaterThan(0);
      for (const lang of LANGS) {
        expect(Object.keys(table[lang]).sort()).toEqual([...keys].sort());
        for (const k of keys) expect(table[lang][k], `${ns}.${k} (${lang})`).toBeTruthy();
      }
    });
    it(`${ns}：差し込み {名前} が、言語間で一致する`, () => {
      for (const k of Object.keys(table.ja)) {
        for (const lang of LANGS) expect(placeholders(table[lang][k]), `${ns}.${k} (${lang})`).toEqual(placeholders(table.ja[k]));
      }
    });
  }
});

describe("labels：全 enum 値に訳がある", () => {
  const cases = [
    ["workflow", WORKFLOW_KEYS, WORKFLOW_LABELS],
    ["requirementStatus", REQUIREMENT_STATUS_KEYS, REQUIREMENT_STATUS_LABELS],
    ["checkStatus", CHECK_STATUS_KEYS, CHECK_STATUS_LABELS],
    ["checkType", CHECK_TYPE_KEYS, CHECK_TYPE_LABELS],
    ["documentStatus", DOCUMENT_STATUS_KEYS, DOCUMENT_STATUS_LABELS],
  ] as const;

  for (const [name, keys, jaConst] of cases) {
    it(`${name}：キーの集合が、lib/types.ts の定数と一致し、日本語が定数と同じ`, () => {
      expect(Object.keys(keys).sort()).toEqual(Object.keys(jaConst).sort());
      for (const value of Object.keys(jaConst)) {
        const key = (keys as Record<string, (typeof keys)[keyof typeof keys]>)[value];
        expect(translate("ja", key)).toBe((jaConst as Record<string, string>)[value]);
        for (const lang of ["en", "ko"] as const) expect(translate(lang, key)).toBeTruthy();
      }
    });
  }

  it("makeLabels：言語に合わせて引き、未知の値は日本語の定数または値そのものへ退避する", () => {
    const en = makeLabels((k) => translate("en", k));
    expect(en.workflow("review_required")).toBe(CATALOG.labels.en.workflow_review_required);
    expect(en.workflow("review_required")).not.toBe(WORKFLOW_LABELS.review_required);
    const ja = makeLabels((k) => translate("ja", k));
    expect(ja.checkType("deadline")).toBe(CHECK_TYPE_LABELS.deadline);
    expect(ja.workflow("unknown_status" as never)).toBe("unknown_status");
  });
});

describe("expiry：日本語が lib/caseMetrics.ts の元の関数と一致する", () => {
  it("水準名", () => {
    for (const level of Object.keys(EXPIRY_LEVEL_LABELS) as ExpiryLevel[]) {
      expect(expiryLevelLabel("ja", level)).toBe(EXPIRY_LEVEL_LABELS[level]);
    }
  });
  it("期限の文（未入力・残り日数・経過日数）", () => {
    for (const days of [null, 0, 1, 29, 30, 31, 90, 365, -1, -45]) {
      expect(expiryText("ja", days)).toBe(expiryMessage(days));
    }
  });
  it("英語・韓国語は、日数を差し込んだ文になる", () => {
    for (const lang of ["en", "ko"] as const) {
      expect(expiryText(lang, 12)).toContain("12");
      expect(expiryText(lang, -7)).toContain("7");
      expect(expiryText(lang, -7)).not.toContain("-7");
      expect(expiryText(lang, null)).toBeTruthy();
      expect(expiryText(lang, null)).not.toBe(expiryMessage(null));
    }
  });
});
