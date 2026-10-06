import type { ExpiryLevel } from "@/lib/caseMetrics";
import type { Lang } from "@/lib/documents/lang";
import type { MessageKey } from "./messages";
import { translate } from "./translate";

/**
 * 在留期限の表示文（言語別）。lib/caseMetrics.ts の EXPIRY_LEVEL_LABELS・expiryMessage と、
 * 日本語の出力が一致する（試験で確認）。元の関数は、書類・監査記録などで使うため変更しない。
 */
const LEVEL_KEYS: Record<ExpiryLevel, MessageKey> = {
  unknown: "display.expiryUnknown",
  overdue: "display.expiryOverdue",
  urgent: "display.expiryUrgent",
  caution: "display.expiryCaution",
  normal: "display.expiryNormal",
};

export function expiryLevelLabel(lang: Lang, level: ExpiryLevel): string {
  return translate(lang, LEVEL_KEYS[level]);
}

export function expiryText(lang: Lang, days: number | null): string {
  if (days === null) return translate(lang, "display.expiryNoDate");
  return days >= 0
    ? translate(lang, "display.expiryRemaining", { days })
    : translate(lang, "display.expiryPassed", { days: -days });
}
