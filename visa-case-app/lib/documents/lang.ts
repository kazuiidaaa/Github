// 文書の言語。今回は、依頼者向けのご案内書類（client_guide）の表示・出力だけで使う。
// 将来、アプリ全体の表示言語へ広げる場合は、この型と LANG_LABELS をそのまま使えるようにしておく。

export const LANGS = ["ja", "en", "ko"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "ja";

/** 言語の選択肢の表示名。どの言語を選ぶ場合でも読めるよう、その言語自身の表記にする */
export const LANG_LABELS: Record<Lang, string> = {
  ja: "日本語",
  en: "English",
  ko: "한국어",
};

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

/** 直前に選んだ言語を、ブラウザへ記憶するときの名前（案件・保存済みの書類には書き込まない） */
export const LANG_STORAGE_KEY = "visa-case-app:client-guide-lang";

/** 記憶した言語を読む。localStorage が使えない場合や、不正な値の場合は、既定（日本語）を返す */
export function readStoredLang(): Lang {
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/** 選んだ言語を記憶する。localStorage が使えない場合は、何もしない（画面は壊さない） */
export function storeLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // 記憶できなくても、表示・出力はそのまま行える
  }
}
