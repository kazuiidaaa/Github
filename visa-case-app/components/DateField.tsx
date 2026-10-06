"use client";

import { useId, useState } from "react";
import { inputClass } from "@/components/ui";
import { dateValueToText, normalizeDateText, parseDateText } from "@/lib/dateInput";
import { useT } from "@/lib/i18n/LanguageProvider";

/** 表示言語に合わせた、日付が正しくないときの案内。呼び出し元の検証（error に渡す文言）で使う */
export function useDateInvalidMessage(): string {
  return useT()("input.dateField_invalid");
}

/**
 * 日付の入力欄。数字のキーボードで「年（4桁）・月・日」を直接入力する。
 * - 値（value・onChange）は、従来の type="date" と同じ YYYY-MM-DD の文字列。未入力は空文字。
 * - 全角数字も受け付け、半角に直す。数字だけを入力すると「/」を自動で入れる（20000131 → 2000/01/31）。
 * - 入力が途中のとき、onChange には空文字を渡す。存在しない日付（2月30日など）は、
 *   YYYY-MM-DD の形のまま渡すため、呼び出し側の検証（isValidDate）で弾ける。
 * - 欄の下に出す誤りの案内は、この部品が出す。呼び出し側の検証の文言を出したいときは error に渡す（優先して表示）。
 * ラベルは、Field で包むか、aria-label で付ける。
 */
export function DateField({
  value,
  onChange,
  id,
  className = inputClass,
  error,
  disabled,
  required,
  onBlur,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  /** 入力欄の class。既定は inputClass */
  className?: string;
  /** 呼び出し側の検証の文言。指定があれば、この部品の案内より優先する */
  error?: string;
  disabled?: boolean;
  required?: boolean;
  /** 入力欄から外れたとき。入力が途中（incomplete）のときは、保存を控える判断に使う */
  onBlur?: (kind: "empty" | "incomplete" | "complete") => void;
  "aria-label"?: string;
}) {
  const t = useT();
  const errorId = useId();
  const [text, setText] = useState(() => dateValueToText(value));
  const [touched, setTouched] = useState(false);
  // 外から来た値が、いま入力中の内容と違うとき（読み込み・取り消しなど）だけ、表示を差し替える
  const current = parseDateText(text);
  const currentValue = current.kind === "complete" ? current.iso : "";
  const external = dateValueToText(value);
  if (value !== currentValue && external !== text) setText(external);

  const state = parseDateText(text);
  const own =
    state.kind === "complete" && !state.valid ? t("input.dateField_invalid") : state.kind === "incomplete" && touched ? t("input.dateField_invalid") : undefined;
  const message = error ?? own;

  function handleChange(raw: string) {
    const next = normalizeDateText(raw);
    setText(next);
    const s = parseDateText(next);
    const out = s.kind === "complete" ? s.iso : "";
    onChange(out);
  }

  function handleBlur() {
    setTouched(true);
    const s = parseDateText(text);
    if (s.kind === "complete") setText(dateValueToText(s.iso));
    onBlur?.(s.kind);
  }

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={t("input.dateField_placeholder")}
        maxLength={10}
        className={className}
        value={text}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
      />
      {message && !error && (
        <span id={errorId} role="alert" className="mt-1 block text-xs font-bold text-red-700">
          {message}
        </span>
      )}
      {error && (
        <span id={errorId} className="mt-1 block text-xs font-bold text-red-700">
          {error}
        </span>
      )}
    </>
  );
}
