"use client";

import { useEffect, useRef, useState } from "react";
import { countActiveFilters, type CaseFilter, type SortKey } from "@/lib/caseMetrics";
import { PROCEDURE_TYPES, WORKFLOW_LABELS } from "@/lib/types";

/** 入力が止まってから、検索語を URL（一覧）へ反映するまでの時間 */
const SEARCH_DEBOUNCE_MS = 300;

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

  // 検索欄は入力欄自身の状態で表示し、URL への反映は、変換の確定・入力の停止・Enter のときに行う（変換中は反映しない）。
  const [text, setText] = useState(filter.query);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushed = useRef(filter.query); // 最後に URL へ反映した（または URL から受け取った）検索語
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const cancelTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const push = (value: string) => {
    cancelTimer();
    if (value === pushed.current) return;
    pushed.current = value;
    onChangeRef.current({ query: value });
  };
  // 戻る・進む、「条件をリセット」、カードの選択などによる URL 側の変更を入力欄へ反映する。
  // 自分が反映した値の戻りは無視する（入力途中の文字を巻き戻さない）。
  useEffect(() => {
    if (filter.query === pushed.current) return;
    pushed.current = filter.query;
    cancelTimer();
    composing.current = false;
    setText(filter.query);
  }, [filter.query]);
  useEffect(() => cancelTimer, []);
  // 他の条件を変えたときは、未反映の検索語も同時に反映する。
  const change = (patch: Partial<CaseFilter>) => {
    cancelTimer();
    if (composing.current || text === pushed.current) return onChange(patch);
    pushed.current = text;
    onChange({ ...patch, query: text });
  };
  const reset = () => {
    cancelTimer();
    composing.current = false;
    pushed.current = "";
    setText("");
    onReset();
  };
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <input
          className="w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-sm md:w-72"
          placeholder="案件名・氏名・在留資格で検索"
          aria-label="案件名・氏名・在留資格で検索"
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            if (composing.current || (e.nativeEvent as InputEvent).isComposing) return;
            cancelTimer();
            timer.current = setTimeout(() => push(v), SEARCH_DEBOUNCE_MS);
          }}
          onCompositionStart={() => {
            composing.current = true;
            cancelTimer();
          }}
          onCompositionEnd={(e) => {
            composing.current = false;
            push(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !composing.current && !e.nativeEvent.isComposing) push(e.currentTarget.value);
          }}
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
        <select className={select} aria-label="手続種別" value={filter.procedure} onChange={(e) => change({ procedure: e.target.value })}>
          <option value="all">手続種別：すべて</option>
          {PROCEDURE_TYPES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select className={select} aria-label="状態" value={filter.status} onChange={(e) => change({ status: e.target.value })}>
          <option value="all">状態：すべて</option>
          {Object.entries(WORKFLOW_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className={select} aria-label="並び順" value={filter.sort} onChange={(e) => change({ sort: e.target.value as SortKey })}>
          <option value="updated">並び順：最終更新が新しい順</option>
          <option value="updatedAsc">並び順：最終更新が古い順</option>
          <option value="expiry">並び順：在留期限が近い順</option>
          <option value="expiryDesc">並び順：在留期限が遠い順</option>
          <option value="name">並び順：案件名（昇順）</option>
          <option value="nameDesc">並び順：案件名（降順）</option>
          <option value="applicant">並び順：申請人氏名（昇順）</option>
          <option value="applicantDesc">並び順：申請人氏名（降順）</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div role="group" aria-label="絞り込み条件" className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filter.within30} onChange={(e) => change({ within30: e.target.checked })} />
          期限30日以内（超過を含む）
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filter.missingDocs} onChange={(e) => change({ missingDocs: e.target.checked })} />
          未受領書類あり
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filter.noCard} onChange={(e) => change({ noCard: e.target.checked })} />
          在留カード未登録（まとめてアップロード）
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filter.unconfirmed} onChange={(e) => change({ unconfirmed: e.target.checked })} />
          申請人情報の確認未了
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filter.checksPending} onChange={(e) => change({ checksPending: e.target.checked })} />
          申請前チェック未完了
        </label>
        </div>
        {active && (
          <button onClick={reset} className="text-blue-700 hover:underline">
            条件をリセット
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
