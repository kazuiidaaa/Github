import type { GroupRelation } from "@/lib/types";
import type { MessageKey } from "./messages";

/** 「主たる申請人との関係」の訳のキー */
export function relationKey(r: GroupRelation): MessageKey {
  return `caseGroup.relation_${r}`;
}
