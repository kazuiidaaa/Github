import type { CoeFormCode, FormResolution } from "./hspForm";
import { jaT, type T } from "./i18n/jaT";

/** 高度専門職の様式を引く手続。認定は目的の在留資格、変更は変更後の在留資格、更新は現在の在留資格で号を決める */
export type HspProcedure = "coe" | "change" | "renewal";

/** 手続ごとに、号を取る案件情報の欄 */
export function hspStatusOf(procedure: HspProcedure, c: { currentStatus: string; targetStatus: string }): string {
  return procedure === "renewal" ? c.currentStatus : c.targetStatus;
}

/**
 * 画面・警告に表示する案内文（手続共通）。resolved 以外は、利用者が次に何をするかを示す。
 * lib/hspForm.ts の describeCoeForm（認定専用）を、変更・更新へ広げたもの。
 */
export function describeHspForm(r: FormResolution<CoeFormCode>, procedure: HspProcedure, t: T = jaT): string {
  switch (r.kind) {
    case "not_applicable":
      return "";
    case "grade_missing":
      return procedure === "renewal" ? t("caseForm.hspGradeMissingCurrent") : t("caseForm.coeGradeMissing");
    case "activity_missing":
      return t("caseForm.coeActivityMissing");
    case "unknown":
      return t("caseForm.coeUnknown", { grade: r.grade, activity: r.activity });
    case "no_renewal":
      return t("caseForm.hspNoRenewal");
    case "resolved":
      return t(procedure === "coe" ? "caseForm.coeResolved" : procedure === "change" ? "caseForm.hspResolvedChange" : "caseForm.hspResolvedRenewal", {
        form: r.form,
      });
  }
}

/** 「行う活動」の選択に添える説明（手続ごと） */
export function hspActivityHintKey(procedure: HspProcedure) {
  return procedure === "coe" ? "caseForm.hintHspActivityCoe" : procedure === "change" ? "caseForm.hintHspActivityChange" : "caseForm.hintHspActivityRenewal";
}
