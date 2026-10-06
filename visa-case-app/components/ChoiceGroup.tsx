"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui";

export type ChoiceOption = {
  value: string;
  label: string;
  /** 一覧表示（多数の選択）で、見出しとしてまとめる名前。未指定は見出しなしで末尾に並ぶ */
  group?: string;
  /** 項目名の下に添える短い説明（一覧表示で使う） */
  hint?: string;
  /** true にすると、一覧表示で先頭の「よく使う項目」にも並ぶ */
  featured?: boolean;
  disabled?: boolean;
};

export type ChoiceGroupProps = {
  /** グループの名前（`<legend>`）。画面に表示する */
  legend: string;
  options: readonly ChoiceOption[];
  /** 選択中の値。未選択は空文字 */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** 説明文（エラーがあるときは、エラーを優先して表示する） */
  hint?: string;
  error?: string;
  /**
   * 表示の形。既定の "auto" は、選択肢が 6 件以下なら横並びのボタン（"segment"）、
   * 7 件以上なら見出し付きの一覧（"list"）にする。
   */
  variant?: "auto" | "segment" | "list";
  /** 一覧表示での絞り込み入力欄。既定は、一覧表示のとき true */
  searchable?: boolean;
  /** 一覧表示で、先頭の見出しに使う名前。既定は「よく使う項目」 */
  featuredLabel?: string;
};

export const SEGMENT_MAX = 6;
const FEATURED_DEFAULT = "よく使う項目";
const NO_GROUP = "";

/** 絞り込み用に、全角・半角、大文字・小文字の違いをそろえる */
export function normalizeForSearch(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

/** 項目名・説明・見出しのどれかに、入力語を含む選択肢だけを返す。入力が空なら全件 */
export function filterOptions(options: readonly ChoiceOption[], query: string): ChoiceOption[] {
  const q = normalizeForSearch(query);
  if (!q) return [...options];
  return options.filter((o) => normalizeForSearch(`${o.label}${o.hint ?? ""}${o.group ?? ""}`).includes(q));
}

export type ChoiceSection = { key: string; heading: string; options: ChoiceOption[] };

/** 「よく使う項目」を先頭に置き、続けて group ごとにまとめる（group の初出順）。よく使う項目は、元の見出しには重ねて並べない */
export function buildSections(options: readonly ChoiceOption[], featuredLabel = FEATURED_DEFAULT): ChoiceSection[] {
  const sections: ChoiceSection[] = [];
  const featured = options.filter((o) => o.featured);
  if (featured.length > 0) sections.push({ key: "featured", heading: featuredLabel, options: featured });
  const byGroup = new Map<string, ChoiceOption[]>();
  for (const o of options) {
    if (o.featured) continue;
    const g = o.group ?? NO_GROUP;
    byGroup.set(g, [...(byGroup.get(g) ?? []), o]);
  }
  for (const [g, list] of byGroup) sections.push({ key: `group:${g}`, heading: g, options: list });
  return sections;
}

/** 矢印キー・Home・End で移動する先の位置。移動しないキーは null。無効な項目は飛ばし、端では反対側へ回る */
export function nextEnabledIndex(options: readonly ChoiceOption[], current: number, key: string): number | null {
  const n = options.length;
  if (n === 0) return null;
  let step = 0;
  let from = current;
  if (key === "ArrowRight" || key === "ArrowDown") step = 1;
  else if (key === "ArrowLeft" || key === "ArrowUp") step = -1;
  else if (key === "Home") {
    from = -1;
    step = 1;
  } else if (key === "End") {
    from = n;
    step = -1;
  } else return null;
  for (let i = 1; i <= n; i++) {
    const idx = (((from + step * i) % n) + n) % n;
    if (!options[idx].disabled) return idx;
  }
  return null;
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8} className="shrink-0">
      <circle cx="6" cy="6" r="5" />
      <path d="m3.5 6.2 1.7 1.7 3.3-3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * タップ・クリックで選ぶ部品（単一選択）。ブラウザ標準のプルダウン（select）の代わりに使う。
 * 少数は横並びのボタン、多数は見出し付きの一覧と絞り込み欄で表示する。
 * `<fieldset>`／`<legend>` で名前を付け、各項目は role="radio"（aria-checked）。矢印キーで移動と選択、Space・Enter で選択。
 */
export function ChoiceGroup({
  legend,
  options,
  value,
  onChange,
  disabled,
  required,
  hint,
  error,
  variant = "auto",
  searchable,
  featuredLabel,
}: ChoiceGroupProps) {
  const uid = useId();
  const [query, setQuery] = useState("");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const isList = variant === "list" || (variant === "auto" && options.length > SEGMENT_MAX);
  const showSearch = isList && (searchable ?? true);
  const visible = useMemo(() => (showSearch ? filterOptions(options, query) : [...options]), [options, query, showSearch]);
  const sections = useMemo(() => (isList ? buildSections(visible, featuredLabel) : []), [isList, visible, featuredLabel]);

  // 画面の並び順（「よく使う項目」を先頭に置いた順）。矢印キーの移動は、この順に従う。
  const flat = useMemo(() => (isList ? sections.flatMap((s) => s.options) : visible), [isList, sections, visible]);

  const selectedVisible = flat.some((o) => o.value === value && !o.disabled);
  const firstEnabled = flat.find((o) => !o.disabled)?.value;
  // 全体で 1 つだけ Tab で止まる項目（選択中。見えていなければ先頭の有効な項目）
  const tabStop = selectedVisible ? value : firstEnabled;

  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  function choose(v: string) {
    if (disabled || v === value) return;
    onChange(v);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, v: string) {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      choose(v);
      return;
    }
    const current = flat.findIndex((o) => o.value === v);
    const next = nextEnabledIndex(flat, current, e.key);
    if (next === null) return;
    e.preventDefault();
    const target = flat[next].value;
    choose(target);
    refs.current[target]?.focus();
  }

  function renderOption(o: ChoiceOption) {
    const checked = o.value === value;
    const off = disabled || o.disabled;
    const shape = isList ? "rounded-xl px-3 py-2 text-left" : "rounded-full px-4 py-2 text-center";
    const tone = checked
      ? "border-accent bg-accent text-accent-text"
      : "border-line-strong bg-white text-slate-800 hover:bg-slate-100";
    return (
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={off}
        tabIndex={o.value === tabStop ? 0 : -1}
        ref={(el) => {
          refs.current[o.value] = el;
        }}
        onClick={() => choose(o.value)}
        onKeyDown={(e) => onKeyDown(e, o.value)}
        className={`inline-flex min-h-[44px] items-center gap-2 border text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${shape} ${tone} ${isList ? "w-full" : ""}`}
      >
        {checked && <CheckIcon />}
        <span className="flex flex-col">
          <span>{o.label}</span>
          {o.hint && <span className="text-xs font-medium opacity-80">{o.hint}</span>}
        </span>
      </button>
    );
  }

  return (
    <fieldset className="min-w-0 border-0 p-0" disabled={disabled} aria-describedby={describedBy}>
      <legend className="mb-1 flex items-center gap-2 p-0 text-sm font-bold">
        {legend}
        {required && <Badge tone="red" icon={false}>必須</Badge>}
      </legend>

      {showSearch && (
        <div className="mb-2">
          <input
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={`${legend}を項目名で絞り込む`}
            placeholder="項目名で絞り込む"
            className="min-h-[44px] w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
          />
          <p role="status" className="mt-1 text-xs text-slate-500">
            {query ? `${visible.length}件が見つかりました` : `${options.length}件から選べます`}
          </p>
        </div>
      )}

      <div
        role="radiogroup"
        aria-label={legend}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-disabled={disabled || undefined}
      >
        {isList ? (
          visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong px-3 py-3 text-sm text-slate-600">該当する項目がありません</p>
          ) : (
            <div className="space-y-3">
              {sections.map((s) => (
                <div key={s.key} role="group" aria-labelledby={s.heading ? `${uid}-${s.key}` : undefined}>
                  {s.heading && (
                    <div id={`${uid}-${s.key}`} className="mb-1 text-xs font-bold text-slate-600">
                      {s.heading}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{s.options.map(renderOption)}</div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-wrap gap-2">{visible.map(renderOption)}</div>
        )}
      </div>

      {!value && !disabled && (
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-600">
          <svg aria-hidden viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.6}>
            <circle cx="6" cy="6" r="5" strokeDasharray="2 1.8" />
          </svg>
          選択してください
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-bold text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
