"use client";

/** チップ 1 つ分の定義 */
export type ChipOption = {
  /** 識別する値（重複させない） */
  value: string;
  /** 表示する文字 */
  label: string;
  /** 件数など、文字の後ろに添える数。任意 */
  count?: number;
};

/** 選択の更新結果を返す純粋な関数。multiple=false は、押したチップだけを選ぶ。multiple=true は、押すたびに入り切りする */
export function nextSelection(selected: string[], value: string, multiple: boolean): string[] {
  if (!multiple) return [value];
  return selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
}

/**
 * 横スクロールのチップ列（絞り込み用）。選択中は、色（塗りつぶし）に加えて、チェックの印と aria-pressed で示す。
 * 押せる範囲は縦 44pt 以上（見た目の丸は小さくても、ボタンの領域を確保する）。
 *
 * props:
 * - options   チップの一覧
 * - selected  選択中の value の配列（単一選択でも配列で渡す。未選択は空配列）
 * - onChange  選択が変わったときに、新しい配列を渡す
 * - ariaLabel チップ列全体の読み上げ名（例：「状態で絞り込む」）。必須
 * - multiple  true で複数選択（押すたびに入り切り）。省略時は単一選択（「すべて」も 1 つのチップとして options に含める）
 */
export function FilterChips({
  options,
  selected,
  onChange,
  ariaLabel,
  multiple = false,
}: {
  options: ChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  ariaLabel: string;
  multiple?: boolean;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="m-chips -mx-4 flex gap-2 overflow-x-auto px-4">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(nextSelection(selected, o.value, multiple))}
            className="flex min-h-[44px] shrink-0 items-center"
          >
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold ${
                on ? "border-accent bg-accent text-accent-text" : "border-line-strong bg-white text-slate-700"
              }`}
            >
              {on && (
                <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3.5 8.5 3 3 6-7" />
                </svg>
              )}
              {o.label}
              {o.count !== undefined && <span className="font-medium opacity-80">{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
