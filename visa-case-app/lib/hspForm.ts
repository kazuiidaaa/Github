import { jaT, type T } from "./i18n/jaT";
import { ADVANCED_PROFESSIONAL_GRADES, baseResidenceStatus, ADVANCED_PROFESSIONAL_STATUS } from "./types";

/** 高度専門職の「行う活動」（申請書の様式の選択に使う）。在留資格の表記と同じ文字列で保存する */
export const HSP_ACTIVITIES = [
  "教授",
  "研究",
  "企業内転勤",
  "技術・人文知識・国際業務",
  "法律・会計業務",
  "医療",
  "経営・管理",
] as const;

export type HspActivity = (typeof HSP_ACTIVITIES)[number];
export type CoeFormCode = "I" | "L" | "M" | "N" | "U";

/**
 * 号と行う活動から、認定（COE）で使う様式を決める対応表（出入国在留管理庁の案内ページによる。Issue #181）。
 * キーは「号|行う活動」。表にない組み合わせは、推測せず、様式を特定できないものとして扱う。
 */
const COE_FORM_TABLE: Record<string, CoeFormCode> = {
  "高度専門職（1号イ）|教授": "I",
  "高度専門職（1号イ）|研究": "N",
  "高度専門職（1号ロ）|企業内転勤": "L",
  "高度専門職（1号ロ）|技術・人文知識・国際業務": "N",
  "高度専門職（1号ロ）|法律・会計業務": "U",
  "高度専門職（1号ロ）|医療": "U",
  "高度専門職（1号ハ）|経営・管理": "M",
  "高度専門職（1号ハ）|法律・会計業務": "U",
};

export type CoeFormResolution =
  | { kind: "not_applicable" } // 高度専門職ではない
  | { kind: "grade_missing" } // 号が未選択
  | { kind: "activity_missing" } // 行う活動が未選択
  | { kind: "unknown"; grade: string; activity: string } // 表にない組み合わせ
  | { kind: "resolved"; form: CoeFormCode };

export function isAdvancedProfessional(targetStatus: string): boolean {
  return baseResidenceStatus(targetStatus.trim()) === ADVANCED_PROFESSIONAL_STATUS;
}

export function resolveCoeForm(targetStatus: string, activity: string): CoeFormResolution {
  const grade = targetStatus.trim();
  if (!isAdvancedProfessional(grade)) return { kind: "not_applicable" };
  if (!(ADVANCED_PROFESSIONAL_GRADES as readonly string[]).includes(grade)) return { kind: "grade_missing" };
  const act = activity.trim();
  if (!act) return { kind: "activity_missing" };
  const form = COE_FORM_TABLE[`${grade}|${act}`];
  return form ? { kind: "resolved", form } : { kind: "unknown", grade, activity: act };
}

/** 画面に表示する案内文。resolved 以外は、利用者が次に何をするかを示す */
export function describeCoeForm(r: CoeFormResolution, t: T = jaT): string {
  switch (r.kind) {
    case "not_applicable":
      return "";
    case "grade_missing":
      return t("caseForm.coeGradeMissing");
    case "activity_missing":
      return t("caseForm.coeActivityMissing");
    case "unknown":
      return t("caseForm.coeUnknown", { grade: r.grade, activity: r.activity });
    case "resolved":
      return t("caseForm.coeResolved", { form: r.form });
  }
}
