"use client";

import type { Summary } from "@/lib/caseMetrics";
import { metricsFor, type CardKey } from "@/lib/dashboardMetrics";
import { useMetricText } from "@/lib/i18n/metrics";

/**
 * 一覧の先頭に置く、横に流れる要点カード（DashboardCards と同じ指標・同じ順序）。
 * 押すと、その指標に対応する絞り込み（lib/caseListQuery.ts の cardFilter）に切り替える。選択中は、枠と、チェックの印で示す（色だけにしない）。
 * 説明文は、読み上げ用の名前の補足（aria-describedby 相当）として sr-only で持つ。
 *
 * props:
 * - summary  summarize() の結果
 * - active   選択中のカード（activeCard() の結果。なければ null）
 * - onSelect カードを押したとき、その key を渡す
 * - ariaLabel カード列全体の読み上げ名
 */
export function SummaryCards({
  summary,
  active,
  onSelect,
  ariaLabel,
}: {
  summary: Summary;
  active: CardKey | null;
  onSelect: (key: CardKey) => void;
  ariaLabel: string;
}) {
  const text = useMetricText();
  return (
    <div role="group" aria-label={ariaLabel} className="m-chips -mx-4 flex scroll-px-4 snap-x gap-3 overflow-x-auto px-4 py-1">
      {metricsFor().map((m) => {
        const on = active === m.key;
        const { label, description } = text(m.key);
        return (
          <button
            key={m.key}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(m.key)}
            className={`relative min-h-[64px] w-32 shrink-0 snap-start rounded-[14px] border bg-white p-3 text-left active:bg-slate-100 ${
              on ? "border-accent ring-2 ring-accent" : "border-slate-200"
            }`}
          >
            <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
              {on && (
                <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-accent">
                  <path d="m3.5 8.5 3 3 6-7" />
                </svg>
              )}
              {label}
            </span>
            <span className="mt-1 block text-2xl font-bold">{summary[m.field]}</span>
            <span className="sr-only">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
