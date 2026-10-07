import { caseApplicant } from "./caseApplicant";
import { caseChecks } from "./caseChecks";
import { caseForm } from "./caseForm";
import { caseInfo } from "./caseInfo";
import { caseNew } from "./caseNew";
import { casePage } from "./casePage";
import { casePoints } from "./casePoints";
import { caseRequirements } from "./caseRequirements";
import { common } from "./common";
import { dialog } from "./dialog";
import { display } from "./display";
import { employment } from "./employment";
import { footer } from "./footer";
import { header } from "./header";
import { input } from "./input";
import { labels } from "./labels";

/**
 * 訳表の区分の一覧。区分を足すときは、ここへ1行足し、reviewStatus.ts にも同じ区分を足す。
 * 第2段階以降は、画面ごとに区分を足す（例：cases、account）。
 */
export const CATALOG = { common, header, footer, input, dialog, display, labels, caseNew, employment, casePage, caseRequirements, caseChecks, caseForm, casePoints, caseApplicant, caseInfo } as const;

export type Catalog = typeof CATALOG;
export type Namespace = keyof Catalog & string;

/** "区分.キー" の形のキーの一覧。存在しないキーは、型検査で弾かれる */
export type MessageKey = {
  [N in Namespace]: `${N}.${keyof Catalog[N]["ja"] & string}`;
}[Namespace];
