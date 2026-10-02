import { daysUntil, formatDate } from "@/lib/format";
import { Badge } from "./ui";

export function ExpiryBadge({ date }: { date: string }) {
  const days = daysUntil(date);
  if (days === null) return <span className="text-slate-400">未確認</span>;
  const tone = days < 30 ? "red" : days < 90 ? "yellow" : "green";
  return (
    <span className="flex items-center gap-2">
      {formatDate(date)}
      <Badge tone={tone}>{days >= 0 ? `残り${days}日` : `${-days}日超過`}</Badge>
    </span>
  );
}
