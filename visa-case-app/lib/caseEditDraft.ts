import type { MessageKey } from "@/lib/i18n/messages";
import type { MessageParams } from "@/lib/i18n/translate";
import { needsTargetStatus, type CaseRecord, type ProcedureType } from "@/lib/types";

/**
 * iPhone 版の案件の編集シート（components/mobile/CaseEditSheet.tsx）の、入力内容の扱い。
 * 画面の状態は持たない純粋な関数。編集できる項目と検証の規則は、PC 版 components/CaseInfoEditor.tsx と同じ
 * （案件名・手続種別・現在の在留資格・変更後／希望する在留資格・メモ。案件名は必須で 100 文字まで、変更後は手続によって必須）。
 * 受任日など PC 版の編集欄にあっても iPhone 版のシートに載せない項目は、保存でも触れない。
 */

type T = (key: MessageKey, params?: MessageParams) => string;

/** シートで編集する値 */
export interface CaseEditDraft {
  caseName: string;
  procedureType: ProcedureType;
  currentStatus: string;
  targetStatus: string;
  memo: string;
}

/** 検証する欄（画面の上からの並び順）。保存時は、この順で最初の誤りの欄へフォーカスを移す */
export const CASE_EDIT_ERROR_ORDER = ["caseName", "targetStatus"] as const;
export type CaseEditErrorKey = (typeof CASE_EDIT_ERROR_ORDER)[number];
export type CaseEditErrors = Partial<Record<CaseEditErrorKey, string>>;

/** 案件名の最大文字数（PC 版・新規登録と同じ） */
export const CASE_NAME_MAX = 100;

export function draftFromRecord(record: CaseRecord): CaseEditDraft {
  return {
    caseName: record.caseName,
    procedureType: record.procedureType,
    currentStatus: record.currentStatus,
    targetStatus: record.targetStatus,
    memo: record.memo,
  };
}

/** 変更後の在留資格は、必要な手続のときだけ意味を持つ（要らない手続では空として扱う） */
const effectiveTarget = (d: CaseEditDraft) => (needsTargetStatus(d.procedureType) ? d.targetStatus : "");

/** 開いたときの内容から変わっているか。変わっていなければ、確認なしで閉じてよい */
export function isDraftDirty(initial: CaseEditDraft, draft: CaseEditDraft): boolean {
  return (
    initial.caseName !== draft.caseName ||
    initial.procedureType !== draft.procedureType ||
    initial.currentStatus !== draft.currentStatus ||
    effectiveTarget(initial) !== effectiveTarget(draft) ||
    initial.memo !== draft.memo
  );
}

/** 入力の誤りを、欄ごとの文で返す（誤りが無ければ空のオブジェクト）。規則と文言は PC 版と同じ */
export function validateCaseEdit(draft: CaseEditDraft, t: T, targetLegend: string): CaseEditErrors {
  const next: CaseEditErrors = {};
  if (!draft.caseName.trim()) next.caseName = t("caseNew.errCaseNameRequired");
  else if (draft.caseName.length > CASE_NAME_MAX) next.caseName = t("caseNew.errCaseNameTooLong");
  if (needsTargetStatus(draft.procedureType) && !draft.targetStatus.trim()) next.targetStatus = t("caseNew.errTargetRequired", { label: targetLegend });
  return next;
}

/** 保存する案件。シートに無い項目（受任日・申請人情報など）は、現在の記録のまま残す */
export function applyCaseEdit(c: CaseRecord, draft: CaseEditDraft): CaseRecord {
  return {
    ...c,
    caseName: draft.caseName.trim(),
    procedureType: draft.procedureType,
    currentStatus: draft.currentStatus.trim(),
    targetStatus: needsTargetStatus(draft.procedureType) ? draft.targetStatus.trim() : "",
    memo: draft.memo,
  };
}

/** 「キャンセル」（Escape・背景も同じ）を押したときの動き。変更があれば確認を出し、なければそのまま閉じる */
export function cancelOutcome(dirty: boolean): "confirm" | "close" {
  return dirty ? "confirm" : "close";
}

export type SubmitResult =
  | { kind: "invalid"; errors: CaseEditErrors; first: CaseEditErrorKey }
  | { kind: "unchanged" }
  | { kind: "saved" }
  | { kind: "failed" };

/** 保存処理の接続先（本番は lib/store.ts の関数。試験では差し替える） */
export interface CaseEditDeps {
  /** 画面のストアを更新して保存を依頼する（PC 版と同じ updateCase） */
  update: (id: string, fn: (c: CaseRecord) => CaseRecord) => void;
  /** 依頼した保存が終わるのを待ち、失敗したときだけ失敗の文を返す（成功は空文字） */
  settle: () => Promise<string>;
  /** 監査ログ（PC 版と同じ logAudit。保存の成否には含めない） */
  audit: (caseId: string, action: string) => void;
}

/**
 * 「完了」を押したときの処理。検証 → 変更が無ければ何もせず終了 → 保存 → 成否。
 * 保存は例外を投げても失敗として返す（シートを閉じず、文で示すため）。
 */
export async function submitCaseEdit(args: {
  record: CaseRecord;
  initial: CaseEditDraft;
  draft: CaseEditDraft;
  t: T;
  targetLegend: string;
  deps: CaseEditDeps;
}): Promise<SubmitResult> {
  const { record, initial, draft, t, targetLegend, deps } = args;
  const errors = validateCaseEdit(draft, t, targetLegend);
  const first = CASE_EDIT_ERROR_ORDER.find((k) => !!errors[k]);
  if (first) return { kind: "invalid", errors, first };
  if (!isDraftDirty(initial, draft)) return { kind: "unchanged" };
  try {
    deps.update(record.id, (c) => applyCaseEdit(c, draft));
    const failure = await deps.settle();
    if (failure) return { kind: "failed" };
  } catch {
    return { kind: "failed" };
  }
  deps.audit(record.id, "case_info_saved");
  return { kind: "saved" };
}
