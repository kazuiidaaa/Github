"use client";

import { expiryLevel } from "@/lib/caseMetrics";
import { daysUntil, formatDate } from "@/lib/format";
import { expiryLevelLabel, expiryText } from "@/lib/i18n/expiry";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import { Badge } from "./ui";

const TONES = { overdue: "red", urgent: "red", caution: "yellow", normal: "green", unknown: "gray" } as const;

/** 在留期限の表示。業務上の注意喚起であり、申請の可否を示すものではない。 */
export function ExpiryBadge({ date }: { date: string }) {
  const { lang } = useLang();
  const t = useT();
  const days = daysUntil(date);
  if (days === null) return <span className="text-slate-400">{t("display.expiryUnknown")}</span>;
  const level = expiryLevel(days);
  return (
    <span className="block">
      <span className="flex flex-wrap items-center gap-2">
        {formatDate(date)}
        <Badge tone={TONES[level]}>{expiryLevelLabel(lang, level)}</Badge>
      </span>
      <span className="block text-xs text-slate-500">{expiryText(lang, days)}</span>
      {(level === "urgent" || level === "overdue") && (
        <span className="block text-xs text-red-700">{t("display.expiryNeedsReview")}</span>
      )}
    </span>
  );
}
