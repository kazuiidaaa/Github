"use client";

import Link from "next/link";
import { useId } from "react";
import type { Summary } from "@/lib/caseMetrics";
import { HOME_METRIC_KEYS, metricsFor, type CardKey, type MetricDefinition } from "@/lib/dashboardMetrics";

export type { CardKey };

const CARD_BASE = "rounded-2xl border bg-white hover:-translate-y-0.5 hover:shadow-md";

/** 説明文は操作できる要素の外に置く（タップで誤って絞り込まれないようにする）。 */
function CardShell({
  metric,
  summary,
  descId,
  className,
  children,
}: {
  metric: MetricDefinition;
  summary: Summary;
  descId: string;
  className: string;
  children: (body: React.ReactNode) => React.ReactNode;
}) {
  return (
    <div className={className}>
      {children(
        <>
          <span className="block text-xs text-slate-500">{metric.label}</span>
          <span className="mt-1 block text-2xl font-semibold">{summary[metric.field]}</span>
        </>,
      )}
      <p id={descId} className="px-4 pb-4 text-xs leading-relaxed text-slate-500">
        {metric.description}
      </p>
    </div>
  );
}

/** 案件一覧の指標カード（押すと絞り込む）。 */
export function DashboardCards({
  summary,
  active,
  onSelect,
}: {
  summary: Summary;
  active: CardKey | null;
  onSelect: (key: CardKey) => void;
}) {
  const uid = useId();
  return (
    <div className="anim-stagger mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      {metricsFor().map((m) => {
        const descId = `${uid}-${m.key}`;
        return (
          <CardShell
            key={m.key}
            metric={m}
            summary={summary}
            descId={descId}
            className={`${CARD_BASE} hover:bg-slate-50 ${active === m.key ? "border-accent ring-2 ring-accent" : "border-slate-200"}`}
          >
            {(body) => (
              <button onClick={() => onSelect(m.key)} aria-pressed={active === m.key} aria-describedby={descId} className="block w-full rounded-t-2xl p-4 pb-2 text-left">
                {body}
              </button>
            )}
          </CardShell>
        );
      })}
    </div>
  );
}

/** ホームの指標カード（押すと案件一覧の対応する絞り込みへ移動する）。 */
export function HomeMetricCards({ summary }: { summary: Summary }) {
  const uid = useId();
  return (
    <div className="anim-stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {metricsFor(HOME_METRIC_KEYS).map((m) => {
        const descId = `${uid}-${m.key}`;
        return (
          <CardShell key={m.key} metric={m} summary={summary} descId={descId} className={`${CARD_BASE} border-slate-200 hover:bg-slate-50`}>
            {(body) => (
              <Link href={m.href} aria-describedby={descId} className="block rounded-t-2xl p-4 pb-2">
                {body}
              </Link>
            )}
          </CardShell>
        );
      })}
    </div>
  );
}
