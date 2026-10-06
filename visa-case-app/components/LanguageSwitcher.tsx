"use client";

import { useId } from "react";
import { LANGS, LANG_LABELS, isLang } from "@/lib/documents/lang";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import { hasDraft } from "@/lib/i18n/reviewStatus";

/** 画面の表示言語の切り替え。訳文が確認前の言語では、短い注記を添える */
export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const t = useT();
  const noteId = useId();
  const draft = hasDraft(lang);
  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={lang}
        onChange={(e) => {
          if (isLang(e.target.value)) setLang(e.target.value);
        }}
        aria-label={t("common.languageLabel")}
        aria-describedby={draft ? noteId : undefined}
        className="rounded-full border border-line-strong bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
      >
        {LANGS.map((l) => (
          <option key={l} value={l} lang={l}>
            {LANG_LABELS[l]}
          </option>
        ))}
      </select>
      {draft && (
        <span id={noteId} role="note" title={t("common.languageDraftNote")} className="max-w-[9rem] text-[0.65rem] leading-tight font-normal text-slate-500 max-md:hidden">
          {t("common.languageDraftNote")}
        </span>
      )}
    </span>
  );
}
