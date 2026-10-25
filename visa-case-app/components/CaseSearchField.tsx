"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { readFilter, toQueryWithPage } from "@/lib/caseListQuery";
import { useT } from "@/lib/i18n/LanguageProvider";
import { useCommittedSearch } from "@/lib/useCommittedSearch";

function SearchInput() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const filter = useMemo(() => readFilter(new URLSearchParams(params.toString())), [params]);
  const search = useCommittedSearch(filter.query, (query) => {
    // 検索語を変えたときは、1 ページ目に戻す（案件一覧の他の条件と同じ）
    router.replace(`/cases${toQueryWithPage({ ...filter, query }, 1)}`, { scroll: false });
  });
  return (
    <div className="relative min-w-0 flex-1 basis-48 sm:max-w-[28rem]">
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="pointer-events-none absolute size-3.5 top-1/2 left-2.5 -translate-y-1/2 text-muted">
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" />
      </svg>
      <input
        type="search"
        enterKeyHint="search"
        className="min-h-[44px] w-full rounded-mac-control border border-line-strong bg-grouped-surface py-0 pr-2 pl-8 text-mac-footnote"
        placeholder={t("caseList.searchLabelList")}
        aria-label={t("caseList.searchLabelList")}
        {...search.inputProps}
      />
    </div>
  );
}

/**
 * 案件一覧の検索欄（PC 版のツールバー用。Mac の検索欄の位置）。条件は URL の q に反映する（一覧と同じ）。
 * useSearchParams を使うため、Suspense で包む。
 */
export function CaseSearchField() {
  return (
    <Suspense fallback={null}>
      <SearchInput />
    </Suspense>
  );
}
