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
 * 高度専門職ではない在留資格が、認定・変更・更新で使う様式の一覧（どの在留資格がどの様式か、の唯一の表）。
 * 新しい在留資格（研究・特定活動など）の様式は、該当する様式の行へ足す。各様式の出典は、下の FORM_*_STATUSES の説明を参照。
 * 様式N（見出し「技術・人文知識・国際業務」ほか）は、介護・技能も同じ様式（入管庁の各在留資格の案内ページによる。Issue #297・#298）。
 */
export const FORM_STATUSES: Readonly<Record<"I" | "L" | "N" | "U", readonly string[]>> = {
  I: ["教授", "教育"],
  L: ["報道", "企業内転勤"],
  N: ["技術・人文知識・国際業務", "介護", "技能"],
  U: ["法律・会計業務", "医療"],
};

/** 様式Nの見出しの在留資格。この文字を含む値（例：括弧つき）も様式Nとして扱う（部分一致は、この在留資格だけ） */
const FORM_N_BASE_STATUS = FORM_STATUSES.N[0];

/** 第1表のみ差し込む「経営・管理」。認定は様式M、変更・更新は様式Nの第1表だけを使う（Issue #191） */
export const KEIEI_KANRI_STATUS = "経営・管理";

/**
 * 高度専門職ではない在留資格から、使う様式（I・L・N・U）を決める。一覧にない値は undefined。
 * FORM_STATUSES と完全一致で照合する（「技能」は「技能実習」「特定技能」を含まない）。ただし技術・人文知識・国際業務だけは部分一致。
 */
export function formCodeOfStatus(status: string): Exclude<CoeFormCode, "M"> | undefined {
  const s = status.trim();
  for (const code of ["I", "L", "U", "N"] as const) {
    if (FORM_STATUSES[code].includes(s)) return code;
  }
  return s.includes(FORM_N_BASE_STATUS) ? "N" : undefined;
}

/**
 * 特定活動のうち、様式Nを使う種別（Issue #299・#300）。様式Nの見出しは「特定活動（研究活動等）」「特定活動（本邦大学卒業者）」を含む
 * （入管庁の特定研究等活動（告示36号）・本邦大学等卒業者（告示46号）の案内ページ・様式Nの見出しによる）。
 * 特定活動は在留資格の文字列だけでは様式を決められない（家事使用人・EPAなど、様式が異なる種別がある）ため、FORM_STATUSES には入れず、案件の特定活動の種別で判定する。
 * 特定情報処理活動（告示37号。Issue #334）も含める：様式Nの別紙「職種一覧」の注記が「特定研究等活動（告示36号）及び特定情報処理活動（告示37号）」を同じ選択肢にしており、案内ページも同じ申請書を案内している（見出しは「特定活動（研究活動等）」。行政書士の確認を待つ）。
 * 特定研究等活動・本邦大学等卒業者・特定情報処理活動の家族は「その他」として、ここには入れない。
 */
export const FORM_N_TOKUTEI_TYPES: readonly string[] = ["tokuteiKenkyu", "daigakuSotsugyo", "tokuteiJoho"];

/** 在留資格が特定活動か（「特定活動（告示○号）」などの表記を含む。lib/requirements/evaluate.ts の isTokuteiKatsudo と同じ判定） */
export function isTokuteiKatsudoStatus(status: string): boolean {
  return status.replace(/[\s・･]/g, "").includes("特定活動");
}

/** 特定活動の在留資格が、案件の特定活動の種別により様式Nを使うか。特定活動以外の在留資格・種別が未選択・ほかの種別は false */
export function isFormNTokuteiCase(status: string, tokuteiKatsudoType: string | undefined): boolean {
  return isTokuteiKatsudoStatus(status) && FORM_N_TOKUTEI_TYPES.includes(tokuteiKatsudoType ?? "");
}

/**
 * 在留資格が、公式様式（認定・変更・更新）で扱える範囲か。一覧の在留資格（FORM_STATUSES）、高度専門職、経営・管理（第1表のみ）なら true。
 * 特定活動は、案件の特定活動の種別（tokuteiKatsudoType）が様式Nを使う種別のときだけ true（FORM_N_TOKUTEI_TYPES）。
 * 種別を渡さない・未選択・ほかの種別の特定活動、研究などは、一覧に足すまでは false（対象外の可能性を警告する）。
 */
export function isStatusInFormScope(status: string, tokuteiKatsudoType?: string): boolean {
  return (
    formCodeOfStatus(status) !== undefined ||
    isAdvancedProfessional(status) ||
    status.trim() === KEIEI_KANRI_STATUS ||
    isFormNTokuteiCase(status, tokuteiKatsudoType)
  );
}

/**
 * 高度専門職ではなく、それ自体が様式 I（見出し「教授」）を使う在留資格（出入国在留管理庁の各在留資格の案内ページによる。Issue #292・#293）。
 * 認定・変更・更新とも、公式様式は高度専門職の様式 I（docs/official/）と同じファイル（教育も同一ファイルであることをバイト単位で確認した）。完全一致で照合する。
 */
export const FORM_I_STATUSES: readonly string[] = FORM_STATUSES.I;
export const isFormIStatus = (status: string): boolean => FORM_I_STATUSES.includes(status.trim());

/**
 * 高度専門職ではなく、それ自体が様式 L（見出し「高度専門職（1号ロ）・（2号）、報道、研究（転勤）、企業内転勤」）を使う在留資格（出入国在留管理庁の各在留資格の案内ページによる。Issue #294）。
 * 認定・変更・更新とも、公式様式は高度専門職の様式 L（docs/official/）と同じファイル。完全一致で照合する（Issue #294・#295）。
 * 「研究（転勤）」も同じ様式 L だが、研究の在留資格の扱い（#296）に属するため、ここには入れない。
 */
export const FORM_L_STATUSES: readonly string[] = FORM_STATUSES.L;
export const isFormLStatus = (status: string): boolean => FORM_L_STATUSES.includes(status.trim());

/**
 * 高度専門職ではなく、それ自体が様式 U（見出し「その他」）を使う在留資格（出入国在留管理庁の各在留資格の案内ページによる。Issue #301・#302）。
 * 認定・変更・更新とも、公式様式は高度専門職の様式 U（docs/official/）と同じファイル。完全一致で照合する。
 */
export const FORM_U_STATUSES: readonly string[] = FORM_STATUSES.U;
export const isFormUStatus = (status: string): boolean => FORM_U_STATUSES.includes(status.trim());

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
