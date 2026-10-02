import { EXPIRY_LEVEL_LABELS, expiryLevel, expiryMessage } from "@/lib/caseMetrics";
import { daysUntil, formatDate } from "@/lib/format";
import { Badge } from "./ui";

const TONES = { overdue: "red", urgent: "red", caution: "yellow", normal: "green", unknown: "gray" } as const;

/** 在留期限の表示。業務上の注意喚起であり、申請の可否を示すものではない。 */
export function ExpiryBadge({ date }: { date: string }) {
  const days = daysUntil(date);
  if (days === null) return <span className="text-slate-400">未確認</span>;
  const level = expiryLevel(days);
  return (
    <span className="block">
      <span className="flex flex-wrap items-center gap-2">
        {formatDate(date)}
        <Badge tone={TONES[level]}>{EXPIRY_LEVEL_LABELS[level]}</Badge>
      </span>
      <span className="block text-xs text-slate-500">{expiryMessage(days)}</span>
      {(level === "urgent" || level === "overdue") && (
        <span className="block text-xs text-red-700">行政書士による確認が必要です。</span>
      )}
    </span>
  );
}
