"use client";

import { useState } from "react";
import { countActiveFilters, type CaseFilter, type SortKey } from "@/lib/caseMetrics";
import { SORT_OPTION_KEYS } from "@/lib/i18n/caseList";
import { useLabels } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/LanguageProvider";
import { PROCEDURE_TYPES, WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/types";
import { SORT_KEYS } from "@/lib/caseMetrics";
import { useCommittedSearch } from "@/lib/useCommittedSearch";

// 入力欄は 16px（iOS Safari の自動拡大を避ける）・高さ 44px。ui.tsx の inputClass と同じ規則
const select = "min-h-[44px] rounded-xl border border-line-strong bg-white px-3 py-2 text-base";

export function CaseFilters({
  filter,
  active,
  onChange,
  onReset,
}: {
  filter: CaseFilter;
  active: boolean;
  onChange: (patch: Partial<CaseFilter>) => void;
  onReset: () => void;
}) {
  const t = useT();
  const labels = useLabels();
  // スマートフォン幅では既定で折りたたみ、条件が有効なときは展開して開始する。md 以上は常時展開。
  const [open, setOpen] = useState(() => active || countActiveFilters(filter) > 0);
  const count = countActiveFilters(filter);

  const search = useCommittedSearch(filter.query, (query) => onChange({ query }));
  // 他の条件を変えたときは、未反映の検索語も同時に反映する。
  const change = (patch: Partial<CaseFilter>) => {
    const pending = search.flush();
    onChange(pending === null ? patch : { ...patch, query: pending });
  };
  const reset = () => {
    search.reset();
    onReset();
  };
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        {/* PC 版（md 以上）の検索欄はツールバー（PcToolbar）にある。ここは md 未満のみ */}
        <input
          className="min-h-[44px] w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-base md:hidden"
          placeholder={t("caseList.searchLabel")}
          aria-label={t("caseList.searchLabel")}
          {...search.inputProps}
        />
        <button
          type="button"
          className="min-h-[44px] rounded-xl border border-line-strong bg-white px-3 py-2 text-sm active:bg-slate-100 md:hidden"
          aria-expanded={open}
          aria-controls="case-filter-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t("caseList.filterClose") : t("caseList.filterOpen")}
          {count > 0 && t("caseList.filterActiveCount", { count })}
        </button>
      </div>
      <div id="case-filter-panel" className={`space-y-3 ${open ? "block" : "hidden md:block"}`}>
      <div className="flex flex-wrap gap-3">
        <select className={select} aria-label={t("caseList.selProcedure")} value={filter.procedure} onChange={(e) => change({ procedure: e.target.value })}>
          <option value="all">{t("caseList.procedureAll")}</option>
          {PROCEDURE_TYPES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select className={select} aria-label={t("caseList.selState")} value={filter.status} onChange={(e) => change({ status: e.target.value })}>
          <option value="all">{t("caseList.stateAll")}</option>
          {(Object.keys(WORKFLOW_LABELS) as WorkflowStatus[]).map((k) => (
            <option key={k} value={k}>
              {labels.workflow(k)}
            </option>
          ))}
        </select>
        <select className={select} aria-label={t("caseList.selSort")} value={filter.sort} onChange={(e) => change({ sort: e.target.value as SortKey })}>
          {SORT_KEYS.map((k) => (
            <option key={k} value={k}>
              {t(SORT_OPTION_KEYS[k])}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 text-sm">
        <div role="group" aria-label={t("caseList.conditionsGroup")} className="flex flex-wrap items-center gap-x-4">
        <label className="flex min-h-[44px] items-center gap-2">
          <input type="checkbox" className="size-5 shrink-0" checked={filter.within30} onChange={(e) => change({ within30: e.target.checked })} />
          {t("caseList.within30")}
        </label>
        <label className="flex min-h-[44px] items-center gap-2">
          <input type="checkbox" className="size-5 shrink-0" checked={filter.missingDocs} onChange={(e) => change({ missingDocs: e.target.checked })} />
          {t("caseList.missingDocs")}
        </label>
        <label className="flex min-h-[44px] items-center gap-2">
          <input type="checkbox" className="size-5 shrink-0" checked={filter.noCard} onChange={(e) => change({ noCard: e.target.checked })} />
          {t("caseList.noCard")}
        </label>
        <label className="flex min-h-[44px] items-center gap-2">
          <input type="checkbox" className="size-5 shrink-0" checked={filter.unconfirmed} onChange={(e) => change({ unconfirmed: e.target.checked })} />
          {t("caseList.unconfirmed")}
        </label>
        <label className="flex min-h-[44px] items-center gap-2">
          <input type="checkbox" className="size-5 shrink-0" checked={filter.checksPending} onChange={(e) => change({ checksPending: e.target.checked })} />
          {t("caseList.checksPending")}
        </label>
        </div>
        {active && (
          <button onClick={reset} className="min-h-[44px] text-blue-700 hover:underline">
            {t("caseList.resetConditions")}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
