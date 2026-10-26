import { EMPTY_FORM_DETAILS } from "@/lib/formDetails";
import { hasAcceptedDateError } from "@/lib/acceptedDate";
import { buildBulkCaseNames } from "@/lib/bulkCaseNames";
import type { MessageKey } from "@/lib/i18n/messages";
import type { MessageParams } from "@/lib/i18n/translate";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, procedureNeedsTarget, type CaseRecord, type EmploymentInfo, type ProcedureType } from "@/lib/types";

/**
 * 新規案件の登録の、入力検証と案件レコードの組み立て（PC 版 app/cases/new と iPhone 版 app/m/cases/new で共通）。
 * 画面の状態・遷移・保存の呼び出しは含めない純粋な関数。保存（saveCase）と監査記録（logAudit）は、各画面が行う。
 */

/** 検証する欄（画面の上からの並び順）。送信時は、この順で最初の誤りの欄へフォーカスを移す */
export const NEW_CASE_ERROR_ORDER = ["procedureType", "caseName", "targetStatus", "acceptedDate", "employment", "groupName", "names"] as const;
export type NewCaseErrorKey = (typeof NEW_CASE_ERROR_ORDER)[number];

type T = (key: MessageKey, params?: MessageParams) => string;

export interface NewCaseInput {
  bulk: boolean;
  caseName: string;
  procedureType: ProcedureType | "";
  currentStatus: string;
  targetStatus: string;
  memo: string;
  acceptedDate: string;
  employment: EmploymentInfo;
  groupName: string;
  names: string[];
}

/**
 * 入力の誤りを、欄ごとの文言で返す（誤りが無ければ空のオブジェクト）。
 * - targetLegend：「変更後の在留資格」などの欄名（誤りの文に差し込む）
 * - employmentDateError：まとめて登録のときの雇用開始日の誤り（判定は画面側の部品が持つため、結果を受け取る）
 */
export function validateNewCase(
  input: Pick<NewCaseInput, "bulk" | "caseName" | "procedureType" | "targetStatus" | "acceptedDate" | "groupName" | "names">,
  t: T,
  targetLegend: string,
  employmentDateError: boolean,
): Partial<Record<NewCaseErrorKey, string>> {
  const next: Partial<Record<NewCaseErrorKey, string>> = {};
  const { bulk, caseName, procedureType, targetStatus, acceptedDate, groupName, names } = input;
  const bulkNames = bulk ? buildBulkCaseNames(groupName, names) : [];
  if (bulk) {
    if (!groupName.trim()) next.groupName = t("caseNew.errGroupNameRequired");
    else if (groupName.length > 100) next.groupName = t("caseNew.errGroupNameTooLong");
    if (names.length === 0) next.names = t("caseNew.errNamesEmpty");
    else if (bulkNames.some((n) => n.length > 100)) next.names = t("caseNew.errNamesTooLong");
    if (employmentDateError) next.employment = t("caseNew.errEmploymentDate");
  } else {
    if (!caseName.trim()) next.caseName = t("caseNew.errCaseNameRequired");
    if (caseName.length > 100) next.caseName = t("caseNew.errCaseNameTooLong");
  }
  if (!procedureType) next.procedureType = t("caseNew.errProcedureRequired");
  if (procedureNeedsTarget(procedureType) && !targetStatus.trim()) next.targetStatus = t("caseNew.errTargetRequired", { label: targetLegend });
  if (hasAcceptedDateError(acceptedDate)) next.acceptedDate = t("caseNew.errAcceptedDate");
  return next;
}

/** 作成する案件の名前の一覧。1件ずつ登録は案件名 1 件、まとめて登録は行ごと（空欄は「グループ名（行番号）」） */
export function newCaseNames(input: Pick<NewCaseInput, "bulk" | "caseName" | "groupName" | "names">): string[] {
  return input.bulk ? buildBulkCaseNames(input.groupName, input.names) : [input.caseName.trim()];
}

/**
 * 案件 1 件分のレコードを組み立てる。検証を通った入力で呼ぶこと（手続種別は選択済み）。
 * 案件ごとに独立したレコードとするため、雇用情報は複製する（作成後の同期は行わない）。
 */
export function buildNewCaseRecord(
  input: NewCaseInput & { procedureType: ProcedureType },
  name: string,
  id: string,
  now: string,
  /** まとめて登録で作ったグループの ID。関係は空欄（後から案件の詳細で設定する） */
  groupId?: string,
): CaseRecord {
  const needsTarget = procedureNeedsTarget(input.procedureType);
  return {
    id,
    caseName: name,
    procedureType: input.procedureType,
    currentStatus: input.currentStatus.trim(),
    targetStatus: needsTarget ? input.targetStatus.trim() : "",
    memo: input.memo,
    acceptedDate: input.acceptedDate,
    ...(groupId ? { groupId } : {}),
    workflowStatus: "preparing",
    createdAt: now,
    updatedAt: now,
    applicant: { ...EMPTY_APPLICANT },
    employment: input.bulk ? { ...input.employment } : { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  };
}
