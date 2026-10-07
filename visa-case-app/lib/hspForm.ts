import { jaT, type T } from "./i18n/jaT";
import {
  ADVANCED_PROFESSIONAL_GRADES,
  ADVANCED_PROFESSIONAL_GRADE_2,
  ADVANCED_PROFESSIONAL_STATUS,
  baseResidenceStatus,
} from "./types";

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
 * 高度専門職ではなく、それ自体が様式 I（見出し「教授」）を使う在留資格（出入国在留管理庁の各在留資格の案内ページによる。Issue #292）。
 * 認定・変更・更新とも、公式様式は高度専門職の様式 I（docs/official/）と同じファイル。完全一致で照合する。
 */
export const FORM_I_STATUSES: readonly string[] = ["教授"];
export const isFormIStatus = (status: string): boolean => FORM_I_STATUSES.includes(status.trim());

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

/**
 * 変更・更新（1号）で使う様式の対応表（出入国在留管理庁の案内ページによる。Issue #212）。認定と同じ組み合わせ。
 * 1号は「号|行う活動」で引く。2号への変更は、様式が号ではなく活動で決まるため、活動だけで引く（resolveHspForm の grade2ActivityOnly）。
 */
export const HSP_CHANGE_FORM_TABLE: Record<string, CoeFormCode> = {
  "高度専門職（1号イ）|教授": "I",
  "高度専門職（1号イ）|研究": "N",
  "高度専門職（1号ロ）|企業内転勤": "L",
  "高度専門職（1号ロ）|技術・人文知識・国際業務": "N",
  "高度専門職（1号ロ）|法律・会計業務": "U",
  "高度専門職（1号ロ）|医療": "U",
  "高度専門職（1号ハ）|経営・管理": "M",
  "高度専門職（1号ハ）|法律・会計業務": "U",
};

export type FormResolution<C> =
  | { kind: "not_applicable" } // 高度専門職ではない
  | { kind: "grade_missing" } // 号が未選択
  | { kind: "activity_missing" } // 行う活動が未選択
  | { kind: "unknown"; grade: string; activity: string } // 表にない組み合わせ
  | { kind: "no_renewal"; grade: string } // 2号の更新（更新の手続がない）
  | { kind: "resolved"; form: C };

export interface ResolveHspOptions {
  /** 2号を、号を使わず行う活動だけで引く（変更。表の全エントリのうち、その活動の様式が一意なときに限る） */
  grade2ActivityOnly?: boolean;
  /** 2号を no_renewal にする（更新。2号には更新がない）。grade2ActivityOnly より優先する */
  grade2NoRenewal?: boolean;
}

/** 表の全エントリから、行う活動だけで様式を引く。活動に対する様式が一意でなければ undefined */
function formByActivity<C>(table: Record<string, C>, activity: string): C | undefined {
  const forms = new Set<C>();
  for (const [key, form] of Object.entries(table)) {
    if (key.slice(key.indexOf("|") + 1) === activity) forms.add(form);
  }
  return forms.size === 1 ? [...forms][0] : undefined;
}

export function isAdvancedProfessional(targetStatus: string): boolean {
  return baseResidenceStatus(targetStatus.trim()) === ADVANCED_PROFESSIONAL_STATUS;
}

/** 号と行う活動から様式を決める汎用関数。表にない組み合わせは、推測せず unknown を返す */
export function resolveHspForm<C>(
  table: Record<string, C>,
  status: string,
  activity: string,
  options: ResolveHspOptions = {},
): FormResolution<C> {
  const grade = status.trim();
  if (!isAdvancedProfessional(grade)) return { kind: "not_applicable" };
  const act = activity.trim();
  if (grade === ADVANCED_PROFESSIONAL_GRADE_2) {
    if (options.grade2NoRenewal) return { kind: "no_renewal", grade };
    if (!options.grade2ActivityOnly) return { kind: "grade_missing" };
    if (!act) return { kind: "activity_missing" };
    const form = formByActivity(table, act);
    return form !== undefined ? { kind: "resolved", form } : { kind: "unknown", grade, activity: act };
  }
  if (!(ADVANCED_PROFESSIONAL_GRADES as readonly string[]).includes(grade)) return { kind: "grade_missing" };
  if (!act) return { kind: "activity_missing" };
  const form = table[`${grade}|${act}`];
  return form !== undefined ? { kind: "resolved", form } : { kind: "unknown", grade, activity: act };
}

/** 認定（COE）用。2号は号が使えないため grade_missing（従来どおり） */
export type CoeFormResolution = Exclude<FormResolution<CoeFormCode>, { kind: "no_renewal" }>;

export function resolveCoeForm(targetStatus: string, activity: string): CoeFormResolution {
  return resolveHspForm(COE_FORM_TABLE, targetStatus, activity) as CoeFormResolution;
}

/** 変更用。2号は活動だけで引く */
export function resolveChangeForm(targetStatus: string, activity: string): CoeFormResolution {
  return resolveHspForm(HSP_CHANGE_FORM_TABLE, targetStatus, activity, { grade2ActivityOnly: true }) as CoeFormResolution;
}

/** 更新用。2号は no_renewal */
export function resolveRenewalForm(status: string, activity: string): FormResolution<CoeFormCode> {
  return resolveHspForm(HSP_CHANGE_FORM_TABLE, status, activity, { grade2NoRenewal: true });
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
