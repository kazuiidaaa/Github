import type { CustomRequirement, RequirementStatus } from "../types";
import type { Evaluation } from "./evaluate";

/** 受領済み・確認済みを「収集済み」とする */
export function isCollected(status: RequirementStatus): boolean {
  return status === "received" || status === "reviewed";
}

/** 期限が today より前で、まだ収集済みでない場合に期限超過とする（日付は YYYY-MM-DD） */
export function isOverdue(status: RequirementStatus, dueDate: string | undefined, today: string): boolean {
  return !!dueDate && dueDate < today && !isCollected(status);
}

export interface ProgressItem {
  key: string;
  name: string;
  status: RequirementStatus;
  dueDate?: string;
}

export interface Progress {
  requiredCount: number;
  receivedCount: number;
  /** 必要だが収集済みでない書類（規則による書類と追加した書類の合計） */
  missing: ProgressItem[];
  overdue: ProgressItem[];
}

/** 規則による書類と、行政書士が追加した書類を合わせた進捗を算出する */
export function progressOf(ev: Evaluation, custom: CustomRequirement[], today: string): Progress {
  const required: ProgressItem[] = [
    ...ev.items
      .filter((i) => i.effective === "required")
      .map((i) => ({ key: i.rule.id, name: i.rule.name, status: i.state.status, dueDate: i.state.dueDate })),
    ...custom
      .filter((c) => c.isRequired)
      .map((c) => ({ key: c.id, name: c.name, status: c.status, dueDate: c.dueDate })),
  ];
  const missing = required.filter((r) => !isCollected(r.status));
  return {
    requiredCount: required.length,
    receivedCount: required.length - missing.length,
    missing,
    overdue: missing.filter((r) => isOverdue(r.status, r.dueDate, today)),
  };
}
