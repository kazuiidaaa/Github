"use client";

import Link from "next/link";
import { ToneIcon, type Tone } from "@/components/ui";
import { deadlineGroupOf, type DeadlineRow as DeadlineRowData } from "@/lib/mobileDeadlines";
import { useT } from "@/lib/i18n/LanguageProvider";
import { decideNextAction } from "@/lib/nextAction";

const TONES = { overdue: "red", within30: "yellow", later: "blue", none: "gray" } as const satisfies Record<string, Tone>;

/**
 * 「期限と次の作業」の 1 行（閲覧のみ）。行全体が /m/cases/[id] へのリンクで、高さは 44pt 以上。固定の高さは持たず、文字を大きくすると折り返す。
 * 1 行目：案件名。2 行目：期限（印＋文字。「超過 N日」「本日まで」「あと N日」「未入力」）。
 * 3 行目：次にやること（lib/nextAction.ts の decideNextAction。案件詳細の「次の作業」と同じ判定）。編集の操作は置かない。
 */
export function DeadlineRow({ row }: { row: DeadlineRowData }) {
  const t = useT();
  const { record: c, metrics: m } = row;
  const group = deadlineGroupOf(m.days);
  const days = m.days;
  const text =
    days === null ? t("mobileDeadlines.noExpiry") : days < 0 ? t("mobileDeadlines.overdueDays", { days: -days }) : days === 0 ? t("mobileDeadlines.today") : t("mobileDeadlines.daysLeft", { days });
  const urgent = group === "overdue" || group === "within30";
  return (
    <li className="m-row relative">
      <Link href={`/m/cases/${c.id}`} className="flex min-h-[44px] items-start gap-3 px-4 py-3 active:bg-slate-100">
        <span className="min-w-0 flex-1">
          <span className="block break-words text-base font-bold">{c.caseName}</span>
          <span className={`mt-0.5 flex items-center gap-1 text-sm ${urgent ? "font-bold text-danger-text" : "text-slate-600"}`}>
            <ToneIcon tone={TONES[group]} />
            <span>
              <span className="sr-only">{t("mobileDeadlines.expiryLabel")}</span>
              {text}
            </span>
          </span>
          <span className="mt-0.5 block break-words text-sm text-slate-600">
            {t("mobileDeadlines.nextLabel")}
            {decideNextAction(c, t).message}
          </span>
        </span>
        <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1.5 shrink-0 text-slate-400">
          <path d="m1 1 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}
