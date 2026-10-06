"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Summary } from "@/lib/caseMetrics";
import { HOME_METRIC_KEYS, metricsFor, type CardKey, type MetricDefinition } from "@/lib/dashboardMetrics";

export type { CardKey };

const CARD_BASE = "rounded-2xl border bg-white hover:-translate-y-0.5 hover:shadow-md";

/**
 * 説明文は操作できる要素の外に置く（タップで誤って絞り込まれないようにする）。
 * 狭い幅（md 未満）では説明文を隠し、情報ボタンで共通の説明欄に表示する。
 */
function CardShell({
  metric,
  summary,
  descId,
  className,
  infoOpen,
  onInfo,
  children,
}: {
  metric: MetricDefinition;
  summary: Summary;
  descId: string;
  className: string;
  infoOpen: boolean;
  onInfo: () => void;
  children: (body: React.ReactNode) => React.ReactNode;
}) {
  return (
    <div className={`${className} relative w-36 shrink-0 snap-start md:w-auto`}>
      {children(
        <>
          <span className="block pr-7 text-xs text-slate-500 md:pr-0">{metric.label}</span>
          <span className="mt-1 block text-2xl font-semibold">{summary[metric.field]}</span>
        </>,
      )}
      <button
        type="button"
        onClick={onInfo}
        aria-expanded={infoOpen}
        aria-label={`${metric.label}の説明を${infoOpen ? "閉じる" : "表示する"}`}
        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 md:hidden"
      >
        <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-bold leading-none">
          i
        </span>
      </button>
      <p id={descId} className="hidden px-4 pb-4 text-xs leading-relaxed text-slate-500 md:block">
        {metric.description}
      </p>
    </div>
  );
}

/** 狭い幅では1段の横スクロール（スナップ付き）、md 以上は従来の格子。 */
function MetricRow({
  gridClass,
  metrics,
  activeKey,
  renderCard,
  className = "",
}: {
  gridClass: string;
  metrics: MetricDefinition[];
  activeKey?: CardKey | null;
  renderCard: (m: MetricDefinition, info: { open: boolean; toggle: () => void }) => React.ReactNode;
  className?: string;
}) {
  const [infoKey, setInfoKey] = useState<CardKey | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rowRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.parentElement?.scrollIntoView?.({ inline: "center", block: "nearest" });
  }, [activeKey]);
  const shown = metrics.find((m) => m.key === infoKey);
  return (
    <div className={className}>
      <div
        ref={rowRef}
        className={`anim-stagger flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-1 md:snap-none md:overflow-visible md:p-0 ${gridClass}`}
      >
        {metrics.map((m) => renderCard(m, { open: infoKey === m.key, toggle: () => setInfoKey(infoKey === m.key ? null : m.key) }))}
      </div>
      {shown && (
        <p role="status" className="mt-2 rounded-xl border border-line-strong px-3 py-2 text-xs leading-relaxed text-slate-600 md:hidden">
          <span className="font-bold">{shown.label}</span>：{shown.description}
        </p>
      )}
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
    <MetricRow
      className="mb-6"
      gridClass="md:grid md:grid-cols-4 xl:grid-cols-7"
      metrics={metricsFor()}
      activeKey={active}
      renderCard={(m, info) => {
        const descId = `${uid}-${m.key}`;
        return (
          <CardShell
            key={m.key}
            metric={m}
            summary={summary}
            descId={descId}
            infoOpen={info.open}
            onInfo={info.toggle}
            className={`${CARD_BASE} hover:bg-slate-50 ${active === m.key ? "border-accent ring-2 ring-accent" : "border-slate-200"}`}
          >
            {(body) => (
              <button onClick={() => onSelect(m.key)} aria-pressed={active === m.key} aria-describedby={descId} className="block w-full rounded-t-2xl p-3 pb-2 text-left md:p-4 md:pb-2">
                {body}
              </button>
            )}
          </CardShell>
        );
      }}
    />
  );
}

/** ホームの指標カード（押すと案件一覧の対応する絞り込みへ移動する）。 */
export function HomeMetricCards({ summary }: { summary: Summary }) {
  const uid = useId();
  return (
    <MetricRow
      gridClass="md:grid md:grid-cols-3 xl:grid-cols-6"
      metrics={metricsFor(HOME_METRIC_KEYS)}
      renderCard={(m, info) => {
        const descId = `${uid}-${m.key}`;
        return (
          <CardShell key={m.key} metric={m} summary={summary} descId={descId} infoOpen={info.open} onInfo={info.toggle} className={`${CARD_BASE} border-slate-200 hover:bg-slate-50`}>
            {(body) => (
              <Link href={m.href} aria-describedby={descId} className="block rounded-t-2xl p-3 pb-2 md:p-4 md:pb-2">
                {body}
              </Link>
            )}
          </CardShell>
        );
      }}
    />
  );
}
