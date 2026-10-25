"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { buildSections, filterOptions, type ChoiceOption } from "@/components/ChoiceGroup";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { SearchField } from "@/components/mobile/SearchField";
import { Sheet } from "@/components/mobile/Sheet";
import { Badge, ToneIcon } from "@/components/ui";
import { useT } from "@/lib/i18n/LanguageProvider";

/** 選択の行の右に出す印（選択中はチェックと「選択中」の文字。色だけにしない） */
function Selected({ on }: { on: boolean }) {
  const t = useT();
  if (!on) return null;
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-accent">
      <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="m3 8.5 3.2 3.2L13 4.5" />
      </svg>
      {t("input.choiceGroup_selected")}
    </span>
  );
}

/** シートの中身（絞り込み欄、よく使う項目、見出しごとのまとまり）。表示だけを担い、状態は呼び出し側が持つ */
export function StatusPickerBody({
  label,
  hint,
  options,
  value,
  query,
  onQuery,
  onPick,
}: {
  label: string;
  hint?: string;
  options: readonly ChoiceOption[];
  value: string;
  query: string;
  onQuery: (q: string) => void;
  onPick: (v: string) => void;
}) {
  const t = useT();
  const visible = filterOptions(options, query);
  // 絞り込み中は近道（よく使う項目）を出さず、結果を見出しの中に並べる
  const sections = buildSections(visible, t("input.choiceGroup_featured"), true).filter((s) => !s.shortcut || !query);
  return (
    <>
      <div className="px-4 pt-3">
        {hint && <p className="pb-2 text-xs text-slate-600">{hint}</p>}
        <SearchField value={query} onChange={onQuery} label={t("input.choiceGroup_filterAria", { legend: label })} placeholder={t("input.choiceGroup_filterPlaceholder")} />
        <p role="status" className="px-1 pt-1 text-xs text-slate-600">
          {query ? t("input.choiceGroup_foundCount", { count: visible.length }) : t("input.choiceGroup_totalCount", { count: options.length })}
        </p>
      </div>
      {sections.length === 0 ? (
        <p className="mx-4 my-4 rounded-[10px] bg-white p-4 text-base text-slate-600">{t("input.choiceGroup_noMatch")}</p>
      ) : (
        sections.map((s) => (
          <GroupedList key={s.key} header={s.heading}>
            {s.options.map((o) => (
              <GroupedRow
                key={o.value}
                title={<span className={o.value === value ? "font-bold" : undefined}>{o.label}</span>}
                trailing={<Selected on={o.value === value} />}
                chevron={false}
                pressed={o.value === value}
                onClick={() => onPick(o.value)}
              />
            ))}
          </GroupedList>
        ))
      )}
    </>
  );
}

/**
 * 在留資格のような数の多い選択のための行（SwiftUI の Picker を、画面を開いて選ぶ形にしたもの）。
 * 項目名を左、選んだ値を右に出し、押すと下からシート（Sheet）が開く。シートは、文字入力の絞り込み欄、
 * 先頭の「よく使う項目」、見出しごとのまとまり（options の group）の順に並べる。選択中の項目は、チェックと「選択中」の文字で示す。
 * 項目を選ぶとシートを閉じる（「完了」・Escape・背景でも閉じる）。数の少ない選択は、SelectRow を使う。
 *
 * props:
 * - id          押すボタンの id（外からフォーカスを移すため）
 * - label       行の見出しと、シートの題（「現在の在留資格」と「変更後の在留資格」を区別する）
 * - options     選択肢（ChoiceGroup と同じ形。featured は「よく使う項目」にも並べる）
 * - value       選択中の値（未選択は空文字）
 * - onChange    選んだ値を渡す
 * - placeholder 未選択のときの文字
 * - required    必須の印を出す
 * - error       誤りの文
 * - hint        補足の文（行の下とシートの先頭に出す）
 */
export function StatusPickerRow({
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
  options: readonly ChoiceOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  const t = useT();
  const noteId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const note = error ?? hint;

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <li className="m-row relative">
      <button
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-describedby={note ? noteId : undefined}
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] w-full items-center gap-3 px-4 py-1.5 text-left text-base active:bg-slate-100"
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 break-words font-medium">
          {label}
          {required && <Badge tone="blue">{t("input.field_required")}</Badge>}
        </span>
        <span className="min-w-0 max-w-[55%] break-words text-right text-slate-600">
          {selected ? (
            <>
              <span className="sr-only">{t("input.choiceGroup_selected")}: </span>
              {selected.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <svg aria-hidden="true" viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
          <path d="m1 1 6 6-6 6" />
        </svg>
      </button>
      {error ? (
        <p id={noteId} className="flex items-start gap-1.5 px-4 pb-2.5 text-xs font-bold text-danger-text">
          <span className="mt-0.5 shrink-0">
            <ToneIcon tone="red" />
          </span>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={noteId} className="px-4 pb-2.5 text-xs text-slate-600">
          {hint}
        </p>
      ) : null}

      {/* 検索欄は form を含む。呼び出し元の form の中に入れ子にしないよう、.m-root の直下（form の外）へ出す。React のイベントは親の form へ伝わるので、submit は止める */}
      {open &&
        createPortal(
          <div onSubmit={(e) => e.stopPropagation()}>
            <Sheet title={label} doneLabel={t("mobile.casesFilterDone")} onClose={close}>
              <StatusPickerBody
                label={label}
                hint={hint}
                options={options}
                value={value}
                query={query}
                onQuery={setQuery}
                onPick={(v) => {
                  onChange(v);
                  close();
                }}
              />
            </Sheet>
          </div>,
          document.querySelector(".m-root") ?? document.body,
        )}
    </li>
  );
}
