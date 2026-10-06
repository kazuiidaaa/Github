import type { CheckStatus, CheckType, DocumentStatus, RequirementStatus, WorkflowStatus } from "@/lib/types";
import {
  CHECK_STATUS_LABELS,
  CHECK_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  REQUIREMENT_STATUS_LABELS,
  WORKFLOW_LABELS,
} from "@/lib/types";
import { useT } from "./LanguageProvider";
import type { MessageKey } from "./messages";

type LabelKey = Extract<MessageKey, `labels.${string}`>;

/**
 * enum の値から、訳表（labels 区分）のキーへの対応。
 * Record<キーの型, ...> のため、enum に値を足すと、ここと訳表の漏れを tsc が検出する。
 */
export const WORKFLOW_KEYS: Record<WorkflowStatus, LabelKey> = {
  preparing: "labels.workflow_preparing",
  applicant_confirmed: "labels.workflow_applicant_confirmed",
  review_required: "labels.workflow_review_required",
  application_ready: "labels.workflow_application_ready",
};

export const REQUIREMENT_STATUS_KEYS: Record<RequirementStatus, LabelKey> = {
  not_received: "labels.requirement_not_received",
  requested: "labels.requirement_requested",
  received: "labels.requirement_received",
  reviewed: "labels.requirement_reviewed",
};

export const CHECK_STATUS_KEYS: Record<CheckStatus, LabelKey> = {
  pending: "labels.checkStatus_pending",
  passed: "labels.checkStatus_passed",
  warning: "labels.checkStatus_warning",
  failed: "labels.checkStatus_failed",
  not_applicable: "labels.checkStatus_not_applicable",
};

export const CHECK_TYPE_KEYS: Record<CheckType, LabelKey> = {
  applicant: "labels.checkType_applicant",
  document: "labels.checkType_document",
  deadline: "labels.checkType_deadline",
  manual: "labels.checkType_manual",
};

export const DOCUMENT_STATUS_KEYS: Record<DocumentStatus, LabelKey> = {
  uploaded: "labels.document_uploaded",
};

type T = (key: MessageKey) => string;

function pick<K extends string>(t: T, keys: Record<K, LabelKey>, fallback: Record<K, string>, value: K): string {
  const key = keys[value];
  // 実行時に未知の値（古いデータなど）が来た場合は、日本語の定数、なければ値そのものを返す
  return key ? t(key) : (fallback[value] ?? String(value));
}

/** 翻訳関数から、各ラベルの引き関数を作る。フックと試験で共用する */
export function makeLabels(t: T) {
  return {
    workflow: (s: WorkflowStatus) => pick(t, WORKFLOW_KEYS, WORKFLOW_LABELS, s),
    requirementStatus: (s: RequirementStatus) => pick(t, REQUIREMENT_STATUS_KEYS, REQUIREMENT_STATUS_LABELS, s),
    checkStatus: (s: CheckStatus) => pick(t, CHECK_STATUS_KEYS, CHECK_STATUS_LABELS, s),
    checkType: (s: CheckType) => pick(t, CHECK_TYPE_KEYS, CHECK_TYPE_LABELS, s),
    documentStatus: (s: DocumentStatus) => pick(t, DOCUMENT_STATUS_KEYS, DOCUMENT_STATUS_LABELS, s),
  };
}

/**
 * 画面の表示用ラベル（現在の表示言語）。クライアントの部品で使う。
 * 例：const labels = useLabels(); labels.workflow(c.workflowStatus)
 * lib/types.ts の日本語の定数は、書類の出力・監査記録に使うため、そちらは変更しない。
 */
export function useLabels() {
  const t = useT();
  return makeLabels(t);
}
