"use client";

import { useId, type ReactNode } from "react";
import { Badge, ToneIcon } from "@/components/ui";
import { useT } from "@/lib/i18n/LanguageProvider";

/**
 * 入力用の行（SwiftUI の Form の行）。GroupedList の中に置く。区切り線は mobile.css の .m-row が引く。
 * 入力欄の文字は 16px 以上（iOS が拡大しない）、行の高さは 44pt 以上。
 * 必須は色だけでなく「必須」の文字（Badge）で、誤りは図形（ToneIcon）と文で示し、aria-describedby で入力欄に結び付ける。
 */

/** 行の見出し（必須の印つき） */
function RowLabel({ htmlFor, id, label, required }: { htmlFor: string; id: string; label: string; required?: boolean }) {
  const t = useT();
  return (
    <label htmlFor={htmlFor} id={id} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 break-words text-base font-medium">
      {label}
      {required && <Badge tone="blue">{t("input.field_required")}</Badge>}
    </label>
  );
}

/** 行の下に出す、誤りの文（赤系の色に頼らず、ひし形の図形と文で示す） */
function RowError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 px-4 pb-2.5 text-xs font-bold text-danger-text">
      <span className="mt-0.5 shrink-0">
        <ToneIcon tone="red" />
      </span>
      <span>{children}</span>
    </p>
  );
}

/** 選択肢。group を付けると、同じ名前の項目が見出し（optgroup）にまとまる */
export type PickerOption = { value: string; label: string; group?: string; disabled?: boolean };

/**
 * 選択の行（SwiftUI の Picker）。端末標準の選択画面（iOS のホイール）を使う。
 * 値は右側に出し、右端にシェブロンを置く。未選択は placeholder の項目（value が空）。
 *
 * props:
 * - id        select の id（外からフォーカスを移すため）
 * - label     行の見出し
 * - options   選択肢
 * - value     選択中の値（未選択は空文字）
 * - onChange  選んだ値を渡す
 * - placeholder 未選択のときの文字
 * - required  必須の印を出す
 * - error     誤りの文
 * - hint      補足の文
 */
export function SelectRow({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  required,
  error,
  hint,
}: {
  id: string;
  label: string;
  options: readonly PickerOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  const labelId = useId();
  const noteId = useId();
  const groups = [...new Set(options.map((o) => o.group).filter((g): g is string => !!g))];
  const plain = options.filter((o) => !o.group);
  const opt = (o: PickerOption) => (
    <option key={o.value} value={o.value} disabled={o.disabled}>
      {o.label}
    </option>
  );
  const note = error ?? hint;
  return (
    <li className="m-row relative">
      <div className="flex min-h-[44px] items-center gap-3 px-4 py-1.5">
        <div className="min-w-0 flex-1">
          <RowLabel htmlFor={id} id={labelId} label={label} required={required} />
        </div>
        <div className="relative flex min-w-0 max-w-[55%] items-center">
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={note ? noteId : undefined}
            className="min-h-[44px] min-w-0 max-w-full cursor-pointer appearance-none truncate bg-transparent py-2 pl-2 pr-5 text-right text-base text-slate-600 outline-none [text-align-last:right] focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <option value="">{placeholder}</option>
            {plain.map(opt)}
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {options.filter((o) => o.group === g).map(opt)}
              </optgroup>
            ))}
          </select>
          <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-0 text-slate-400">
            <path d="m1 1 6 6-6 6" />
          </svg>
        </div>
      </div>
      {error ? (
        <RowError id={noteId}>{error}</RowError>
      ) : hint ? (
        <p id={noteId} className="px-4 pb-2.5 text-xs text-slate-600">
          {hint}
        </p>
      ) : null}
    </li>
  );
}

/**
 * 文字入力の行。見出しを上、入力欄を下に置く（案件名のように長い文字向け）。
 * multiline を付けると複数行（textarea）になる。
 */
export function TextRow({
  id,
  label,
  value,
  onChange,
  required,
  error,
  hint,
  placeholder,
  multiline,
  ariaLabel,
  trailing,
  inputProps,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  /** label を出さない行（繰り返しの行）の読み上げ名 */
  ariaLabel?: string;
  /** 入力欄の右に置く操作（削除ボタンなど。44pt 以上にすること） */
  trailing?: ReactNode;
  /** 追加の属性（全角→半角の変換ハンドラなど） */
  inputProps?: object;
}) {
  const labelId = useId();
  const noteId = useId();
  const note = error ?? hint;
  const common = {
    id,
    value,
    placeholder,
    "aria-label": label ? undefined : ariaLabel,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": note ? noteId : undefined,
    // text-base（16px）：iOS Safari がフォーカス時に拡大しない
    className: "min-h-[44px] w-full min-w-0 bg-transparent py-2 text-base outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-accent/40",
    ...inputProps,
  };
  return (
    <li className="m-row relative">
      <div className="px-4 pt-2">
        {label && <RowLabel htmlFor={id} id={labelId} label={label} required={required} />}
        <div className="flex items-center gap-2">
          {multiline ? (
            <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <input {...common} type="text" enterKeyHint="next" onChange={(e) => onChange(e.target.value)} />
          )}
          {trailing}
        </div>
      </div>
      {error ? (
        <RowError id={noteId}>{error}</RowError>
      ) : hint ? (
        <p id={noteId} className="px-4 pb-2.5 text-xs text-slate-600">
          {hint}
        </p>
      ) : (
        <div className="pb-1" />
      )}
    </li>
  );
}
