import type { SortKey } from "@/lib/caseMetrics";
import type { MessageKey } from "./messages";

/** 並び順の選択肢と訳表のキー。SortKey に値を足すと、ここの漏れを tsc が検出する */
export const SORT_OPTION_KEYS: Record<SortKey, Extract<MessageKey, `caseList.sort_${string}`>> = {
  updated: "caseList.sort_updated",
  updatedAsc: "caseList.sort_updatedAsc",
  expiry: "caseList.sort_expiry",
  expiryDesc: "caseList.sort_expiryDesc",
  name: "caseList.sort_name",
  nameDesc: "caseList.sort_nameDesc",
  applicant: "caseList.sort_applicant",
  applicantDesc: "caseList.sort_applicantDesc",
};

/**
 * 「変更後／希望の在留資格」の見出しのキー。lib/types.ts の getTargetStatusDisplay と、
 * 日本語の出力が一致する（試験で確認）。元の関数は変更しない。値（在留資格名）は、訳さない。
 */
export function targetStatusKeys(procedureType: string): { table: MessageKey; card: MessageKey } {
  return procedureType === "change"
    ? { table: "caseList.targetTableChange", card: "caseList.targetCardChange" }
    : { table: "caseList.targetTableCoe", card: "caseList.targetCardCoe" };
}

/** 並び替えの見出しの向きの説明のキー（在留期限は「近い順・遠い順」） */
export function sortDirKey(column: "name" | "applicant" | "expiry" | "updated", dir: "asc" | "desc"): MessageKey {
  if (column === "expiry") return dir === "asc" ? "caseList.dirNear" : "caseList.dirFar";
  return dir === "asc" ? "caseList.dirAsc" : "caseList.dirDesc";
}
