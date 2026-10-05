"use client";

import { useState } from "react";
import { countActiveFilters, type CaseFilter, type SortKey } from "@/lib/caseMetrics";
import { PROCEDURE_TYPES, WORKFLOW_LABELS } from "@/lib/types";

const select = "rounded-xl border border-line-strong bg-white px-3 py-2 text-sm";

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
  // スマートフォン幅では既定で折りたたみ、条件が有効なときは展開して開始する。md 以上は常時展開。
  const [open, setOpen] = useState(() => active || countActiveFilters(filter) > 0);
  const count = countActiveFilters(filter);
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <input
          className="w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-sm md:w-72"
          placeholder="案件名・氏名・在留資格で検索"
          aria-label="案件名・氏名・在留資格で検索"
          value={filter.query}
          onChange={(e) => onChange({ query: e.target.value })}
        />
        <button
          type="button"
          className="rounded-xl border border-line-strong bg-white px-3 py-2 text-sm md:hidden"
          aria-expanded={open}
          aria-controls="case-filter-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "絞り込みを閉じる" : "絞り込み"}
          {count > 0 && `（${count}件有効）`}
        </button>
      </div>
      <div id="case-filter-panel" className={`space-y-3 ${open ? "block" : "hidden md:block"}`}>
      <div className="flex flex-wrap gap-3">
        <select className={select} aria-label="手続種別" value={filter.procedure} onChange={(e) => onChange({ procedure: e.target.value })}>
          <option value="all">手続種別：すべて</option>
          {PROCEDURE_TYPES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select className={select} aria-label="状態" value={filter.status} onChange={(e) => onChange({ status: e.target.value })}>
          <option value="all">状態：すべて</option>
          {Object.entries(WORKFLOW_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className={select} aria-label="並び順" value={filter.sort} onChange={(e) => onChange({ sort: e.target.value as SortKey })}>
          <option value="updated">並び順：最終更新が新しい順</option>
          <option value="expiry">並び順：在留期限が近い順</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div role="group" aria-label="絞り込み条件" className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filter.within30} onChange={(e) => onChange({ within30: e.target.checked })} />
          期限30日以内（超過を含む）
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filter.missingDocs} onChange={(e) => onChange({ missingDocs: e.target.checked })} />
          未受領書類あり
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filter.noCard} onChange={(e) => onChange({ noCard: e.target.checked })} />
          在留カード未登録（まとめてアップロード）
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filter.unconfirmed} onChange={(e) => onChange({ unconfirmed: e.target.checked })} />
          申請人情報の確認未了
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filter.checksPending} onChange={(e) => onChange({ checksPending: e.target.checked })} />
          申請前チェック未完了
        </label>
        </div>
        {active && (
          <button onClick={onReset} className="text-blue-700 hover:underline">
            条件をリセット
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
