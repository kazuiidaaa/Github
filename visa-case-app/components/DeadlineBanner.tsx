"use client";

import { useT } from "@/lib/i18n/LanguageProvider";
import { daysUntil, formatDate } from "@/lib/format";

/** 在留期間の満了日を目立たせる。満了日当日はオンライン申請ができない。 */
export function DeadlineBanner({ date }: { date: string }) {
  const t = useT();
  const days = daysUntil(date);
  if (days === null) {
    return (
      <p className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
        {t("dialog.deadline_missing")}
      </p>
    );
  }
  const urgent = days < 30;
  const message =
    days < 0
      ? t("dialog.deadline_overdue", { days: -days })
      : days === 0
        ? t("dialog.deadline_today")
        : t("dialog.deadline_remaining", { days });
  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 ${
        urgent ? "border-red-400 bg-red-50 text-red-900" : "border-slate-200 bg-white text-slate-800"
      }`}
    >
      <p className="text-xs">{t("dialog.deadline_label")}</p>
      <p className="text-xl font-semibold">{formatDate(date)}</p>
      <p className="mt-1 text-sm">{message}</p>
      {days > 0 && <p className="mt-1 text-xs">{t("dialog.deadline_noOnline")}</p>}
    </div>
  );
}
