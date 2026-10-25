"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

/** メニューの 1 項目 */
export type MenuOption = {
  /** 識別する値 */
  value: string;
  /** 表示する文字 */
  label: string;
  disabled?: boolean;
};

/**
 * メニュー内のキー操作で、次にフォーカスする項目の位置を返す純粋な関数。
 * 矢印の上下は端で回り込み、Home / End は先頭 / 末尾。無効な項目は飛ばす。対象キー以外は null。
 */
export function nextMenuIndex(key: string, current: number, options: MenuOption[]): number | null {
  const n = options.length;
  if (n === 0) return null;
  const enabled = (i: number) => !options[i].disabled;
  const step = (from: number, dir: 1 | -1) => {
    for (let k = 1; k <= n; k++) {
      const i = (((from + dir * k) % n) + n) % n;
      if (enabled(i)) return i;
    }
    return null;
  };
  if (key === "ArrowDown") return step(current, 1);
  if (key === "ArrowUp") return step(current < 0 ? 0 : current, -1);
  if (key === "Home") return enabled(0) ? 0 : step(0, 1);
  if (key === "End") return enabled(n - 1) ? n - 1 : step(n - 1, -1);
  return null;
}

/**
 * ボタンで開くメニュー（SwiftUI の Menu）。並び替え・絞り込みの選択などに使う。
 * ボタンの形は 3 通り：「…」（icon="more"、既定）、並び替え記号の上下矢印（icon="sort"）、文字つきの丸いボタン（buttonText を渡す。絞り込みの現在値を示すのに使う）。
 * 丸い記号のボタンは 44pt 四方、文字つきは高さ 44pt 以上。aria-haspopup="menu"・aria-expanded。メニューは role="menu"。
 * value を渡すと、単一選択式（menuitemradio＋aria-checked）になり、選択中の項目にチェックの印を出す。
 * checked（選択中の value の配列）を渡すと、複数選択式（menuitemcheckbox＋aria-checked）になる。どちらも選んだらメニューは閉じる。
 * キー操作：ボタンで Enter / Space / ↓ で開く。開いたら選択中（無ければ先頭）へフォーカス。
 * ↑↓ で移動、Home / End で端へ、Enter / Space で決定、Esc でボタンへ戻って閉じる、Tab で閉じる。外側を押しても閉じる。
 *
 * props:
 * - options   項目の一覧
 * - onSelect  項目を選んだときに、その value を渡す。選んだらメニューは閉じる
 * - value     単一選択の選択中の value。value も checked も省略すると、ふつうの操作メニュー（menuitem）になる
 * - checked    複数選択の選択中の value の配列
 * - icon       記号ボタンの絵柄。"more"（…、既定）または "sort"（上下矢印）
 * - buttonText 渡すと、記号でなく文字（と ▾ の印）のボタンになる。読み上げ名は label（無ければこの文字）
 * - align      メニューを開く向き。"end"（右端そろえ、既定）または "start"（左端そろえ）
 * - label     ボタンの読み上げ名（例：「並び替え」）。省略時は「その他の操作」（多言語）
 * - title     メニューの先頭に出す小さな見出し（例：「並び順」）。任意。メニューの読み上げ名にもなる
 */
export function MenuButton({
  options,
  onSelect,
  value,
  checked,
  icon = "more",
  buttonText,
  align = "end",
  label,
  title,
}: {
  options: MenuOption[];
  onSelect: (value: string) => void;
  value?: string;
  checked?: string[];
  icon?: "more" | "sort";
  buttonText?: string;
  align?: "start" | "end";
  label?: string;
  title?: string;
}) {
  const t = useT();
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  // 開いた直後にフォーカスする位置。矢印の上で開いたときは末尾
  const [focusAt, setFocusAt] = useState(0);
  const multi = checked !== undefined;
  const selectable = value !== undefined || multi;
  const isOn = (v: string) => (multi ? checked.includes(v) : v === value);

  function openAt(index: number) {
    setFocusAt(index);
    setOpen(true);
  }
  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  useEffect(() => {
    if (open) items.current[focusAt]?.focus();
  }, [open, focusAt]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const firstIndex = () => {
    const sel = options.findIndex((o) => isOn(o.value) && !o.disabled);
    if (sel >= 0) return sel;
    const f = options.findIndex((o) => !o.disabled);
    return f < 0 ? 0 : f;
  };

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label ?? buttonText ?? t("mobile.menuDefaultLabel")}
        onClick={() => (open ? close(false) : openAt(firstIndex()))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            openAt(firstIndex());
          } else if (e.key === "ArrowUp" && !open) {
            e.preventDefault();
            openAt(Math.max(0, options.length - 1));
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            close(true);
          }
        }}
        className={
          buttonText !== undefined
            ? "flex min-h-[44px] items-center"
            : "flex h-11 w-11 items-center justify-center rounded-full text-accent"
        }
      >
        {buttonText !== undefined ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 py-1.5 text-sm font-bold text-slate-700">
            {buttonText}
            <svg aria-hidden="true" viewBox="0 0 12 8" width="10" height="7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m1.5 1.5 4.5 4.5 4.5-4.5" />
            </svg>
          </span>
        ) : icon === "sort" ? (
          // 並び替え（上下の矢印）。「…」は「その他の操作」を連想させ、並び替えと分からないため
          <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 20V5M4.5 8.5 8 5l3.5 3.5" />
            <path d="M16 4v15M12.5 15.5 16 19l3.5-3.5" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9.5" />
            <circle cx="7.8" cy="12" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="16.2" cy="12" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={title ?? label ?? t("mobile.menuDefaultLabel")}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close(true);
              return;
            }
            if (e.key === "Tab") {
              setOpen(false);
              return;
            }
            const cur = items.current.findIndex((el) => el === document.activeElement);
            const next = nextMenuIndex(e.key, cur, options);
            if (next !== null) {
              e.preventDefault();
              items.current[next]?.focus();
            }
          }}
          className={`motion-panel absolute top-full z-50 mt-1 min-w-[13rem] overflow-hidden ${align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left"} rounded-[14px] border border-slate-200 bg-white py-1 shadow-overlay`}
        >
          {title && (
            <p aria-hidden="true" className="px-4 pb-1 pt-2 text-xs font-bold text-slate-600">
              {title}
            </p>
          )}
          {options.map((o, i) => {
            const on = selectable && isOn(o.value);
            return (
              <button
                key={o.value}
                ref={(el) => {
                  items.current[i] = el;
                }}
                type="button"
                role={multi ? "menuitemcheckbox" : selectable ? "menuitemradio" : "menuitem"}
                aria-checked={selectable ? on : undefined}
                disabled={o.disabled}
                tabIndex={-1}
                onClick={() => {
                  onSelect(o.value);
                  close(true);
                }}
                className="flex min-h-[44px] w-full items-center gap-2 px-4 text-left text-base disabled:text-slate-400"
              >
                {selectable && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-accent">
                    {on && (
                      <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 8.5 3.2 3.2L13 4.5" />
                      </svg>
                    )}
                  </span>
                )}
                <span className={on ? "font-bold" : undefined}>{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
