"use client";

import { useMemo } from "react";
import { BackLink } from "@/components/mobile/BackLink";
import { DeadlineRow } from "@/components/mobile/DeadlineRow";
import { GroupedList } from "@/components/mobile/GroupedList";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { LoadingSpinner } from "@/components/mobile/LoadingSpinner";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { groupByDeadline, type DeadlineGroupId } from "@/lib/mobileDeadlines";
import { ensureLoaded, useCases, useStoreError, useStoreLoaded } from "@/lib/store";

const GROUP_LABELS: Record<DeadlineGroupId, MessageKey> = {
  overdue: "mobileDeadlines.groupOverdue",
  within30: "mobileDeadlines.groupWithin30",
  later: "mobileDeadlines.groupLater",
  none: "mobileDeadlines.groupNone",
};

/**
 * 期限と次の作業（iPhone 版）。在留期限が近い順に、見出し付きの一覧で示す（閲覧のみ。保存・権限には触れない）。
 * データは lib/store.ts のフックだけを通す。行を押すと /m/cases/[id] へ移る。
 */
export default function MobileDeadlinesPage() {
  const t = useT();
  const cases = useCases();
  const loaded = useStoreLoaded();
  const error = useStoreError();
  const groups = useMemo(() => groupByDeadline(cases), [cases]);

  const header = <LargeTitleHeader title={t("mobileDeadlines.title")} leading={<BackLink href="/m/cases" label={t("mobileDeadlines.backLabel")} ariaLabel={t("mobileDeadlines.backAria")} />} />;

  if (!loaded) {
    return (
      <>
        {header}
        <div className="mx-4 my-4">
          {error ? (
            <div role="alert" className="rounded-[10px] bg-red-50 p-4 text-sm text-red-800">
              <p>{t("caseList.loadError")}</p>
              <button type="button" onClick={() => void ensureLoaded()} className="mt-2 min-h-[44px] rounded-full border border-red-300 bg-white px-4 font-bold">
                {t("mobile.casesRetry")}
              </button>
            </div>
          ) : (
            <LoadingSpinner />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <p className="mx-4 text-sm text-slate-600">{t("mobileDeadlines.entryNote")}</p>
      {groups.length === 0 ? (
        <p role="status" className="mx-4 my-4 rounded-[10px] bg-white px-4 py-10 text-center text-sm text-slate-600">
          {t("mobileDeadlines.empty")}
        </p>
      ) : (
        groups.map((g) => (
          <GroupedList
            key={g.id}
            ariaLabel={`${t(GROUP_LABELS[g.id])}（${t("mobileDeadlines.groupCount", { count: g.rows.length })}）`}
            header={
              <>
                {t(GROUP_LABELS[g.id])} ・ {t("mobileDeadlines.groupCount", { count: g.rows.length })}
              </>
            }
          >
            {g.rows.map((row) => (
              <DeadlineRow key={row.record.id} row={row} />
            ))}
          </GroupedList>
        ))
      )}
      <p className="mx-4 text-xs text-slate-600">{t("mobileDeadlines.note")}</p>
    </>
  );
}
