"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

/**
 * 検索欄（SwiftUI の .searchable 風）。角丸の灰色の欄に、虫眼鏡と、入力があるときだけ消去ボタンを出す。
 * 文字は 16px 以上（iPhone の Safari が、入力時に拡大しないため）。
 *
 * props:
 * - value        現在の入力文字（制御コンポーネント）
 * - onChange     入力が変わったときに、新しい文字列を渡す（消去ボタンでは "" を渡す）
 * - label        欄の読み上げ名（必須。placeholder は読み上げ名の代わりにならないため）
 * - placeholder  薄く表示する案内。省略時は label と同じ
 * - clearLabel   消去ボタンの読み上げ名。省略時は「入力を消す」（多言語）
 * - onSubmit     Enter（検索）を押したとき。任意
 * - cancelLabel  「キャンセル」ボタンの文字。省略時は「キャンセル」（多言語）
 *
 * 入力欄にフォーカスがある間だけ、欄の右に「キャンセル」を出す（SwiftUI の .searchable と同じ）。
 * 押すと入力を消してフォーカスを外す。
 */
export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  clearLabel,
  onSubmit,
  cancelLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  clearLabel?: string;
  onSubmit?: () => void;
  cancelLabel?: string;
}) {
  const t = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  // iOS の Safari は、ボタンを押した瞬間に入力欄の blur が先に起きる。ボタンが消えて押せなくならないよう、隠すのを少し遅らせる
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };
  useEffect(() => clearHide, []);
  return (
    <div className="flex items-center gap-1">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
        className="m-search flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-slate-100 px-3"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-slate-500">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" />
        </svg>
        <input
          ref={input}
          id={id}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          aria-label={label}
          placeholder={placeholder ?? label}
          value={value}
          onFocus={() => {
            clearHide();
            setFocused(true);
          }}
          onBlur={() => {
            clearHide();
            hideTimer.current = setTimeout(() => setFocused(false), 200);
          }}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-foreground outline-none placeholder:text-slate-500"
        />
        {value !== "" && (
          <button
            type="button"
            aria-label={clearLabel ?? t("mobile.searchClear")}
            onClick={() => {
              onChange("");
              input.current?.focus();
            }}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-slate-500"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
              <circle cx="10" cy="10" r="8.5" fill="currentColor" />
              <path d="m7 7 6 6M13 7l-6 6" stroke="var(--color-white)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </form>
      {focused && (
        <button
          type="button"
          onClick={() => {
            clearHide();
            onChange("");
            input.current?.blur();
            setFocused(false);
          }}
          className="min-h-[44px] shrink-0 px-2 text-base text-accent"
        >
          {cancelLabel ?? t("mobile.searchCancel")}
        </button>
      )}
    </div>
  );
}
