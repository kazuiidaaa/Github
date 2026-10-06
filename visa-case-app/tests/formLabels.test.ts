import { describe, expect, it } from "vitest";
import { EDUCATION_LEVELS, FORM_LAYOUTS, getFormDetailsWarnings, validateFormDetails, EMPTY_FORM_DETAILS } from "@/lib/formDetails";
import { describeCoeForm } from "@/lib/hspForm";
import { HSP_POINT_SHEETS, estimateHspPoints, hspPointConfirmLines } from "@/lib/hspPoints";
import { FORM_LABEL_TRANSLATIONS, formLabelText } from "@/lib/i18n/formLabels";
import { CATALOG } from "@/lib/i18n/messages";
import { translate } from "@/lib/i18n/translate";

function layoutStrings(): string[] {
  const out: string[] = [];
  for (const l of Object.values(FORM_LAYOUTS)) {
    out.push(l!.formName);
    out.push(...(Object.values(l!.labels) as string[]));
    out.push(...(Object.values(l!.sectionTitles) as string[]));
    for (const k of ["desiredStatusLabel", "desiredStatusCaseLabel", "livesTogetherLabel"] as const) if (l![k]) out.push(l![k]!);
  }
  return out;
}

describe("公式様式の項目名の訳表", () => {
  it("すべての項目名・見出し・様式名に、英語・韓国語の訳がある", () => {
    for (const lang of ["en", "ko"] as const) {
      for (const s of layoutStrings()) expect(formLabelText(lang, s), s).not.toBe(s);
    }
  });

  it("項目の番号は、訳しても、そのまま残る", () => {
    for (const lang of ["en", "ko"] as const) {
      expect(formLabelText(lang, "10 (1) 旅券番号").startsWith("10 (1) ")).toBe(true);
      expect(formLabelText(lang, "3 (2) 法人番号（13桁）").startsWith("3 (2) ")).toBe(true);
      expect(formLabelText(lang, "5 出生地").startsWith("5 ")).toBe(true);
    }
  });

  it("日本語は、原文のまま返す", () => {
    for (const s of layoutStrings()) expect(formLabelText("ja", s)).toBe(s);
  });

  it("訳表のキーは、様式の文言のいずれかと一致する（使われない訳がない）", () => {
    const used = new Set<string>();
    for (const s of layoutStrings()) {
      used.add(s);
      const m = /^(\d+(?: \([^)]+\))?)\s+([\s\S]*)$/.exec(s);
      if (m) used.add(m[2]);
    }
    for (const k of Object.keys(FORM_LABEL_TRANSLATIONS)) expect(used.has(k), k).toBe(true);
  });
});

describe("lib の日本語の出力は、翻訳関数を省略したとき、日本語の訳表と一致する", () => {
  const ja = (k: Parameters<typeof translate>[1], p?: Record<string, string | number>) => translate("ja", k, p);

  it("日付の誤り・注意", () => {
    const f = { ...EMPTY_FORM_DETAILS, passportExpiry: "2020-13-45", entryHistoryLastFrom: "2024-05-01", entryHistoryLastTo: "2024-04-01" };
    expect(validateFormDetails(f).passportExpiry).toBe(ja("caseForm.dateInvalid"));
    expect(getFormDetailsWarnings(f)).toEqual([ja("caseForm.warnEntryDates")]);
  });

  it("高度専門職の様式の案内", () => {
    expect(describeCoeForm({ kind: "resolved", form: "N" })).toBe("使う様式：様式 N");
    expect(describeCoeForm({ kind: "unknown", grade: "g", activity: "a" })).toBe("様式を特定できません（g・a）。入管庁の案内ページで、使う様式を確認してください。");
  });

  it("ポイントの目安の注意と確認の文（英語・韓国語は、差し込みが残らない）", () => {
    const sheet = HSP_POINT_SHEETS.B;
    const unscored = sheet.rows.find((r) => r.points === null)!;
    const check = `B:${unscored.row}`;
    for (const lang of ["ja", "en", "ko"] as const) {
      const t = (k: Parameters<typeof translate>[1], p?: Record<string, string | number>) => translate(lang, k, p);
      const est = estimateHspPoints("B", [check], t);
      for (const line of [...est.notes, ...hspPointConfirmLines(est, t)]) expect(line).not.toMatch(/\{\w+\}/);
      expect(est.notes.length).toBeGreaterThan(0);
    }
    const jaEst = estimateHspPoints("B", [check]);
    expect(jaEst.notes).toEqual(estimateHspPoints("B", [check], ja).notes);
  });

  it("学歴の区分の保存値は、訳表のキーと対応する", () => {
    expect(EDUCATION_LEVELS.length).toBe(8);
    for (const k of ["edu_doctor", "edu_master", "edu_university", "edu_juniorCollege", "edu_vocational", "edu_highSchool", "edu_middleSchool", "edu_other"]) {
      expect(Object.keys(CATALOG.caseForm.ja)).toContain(k);
    }
  });
});
