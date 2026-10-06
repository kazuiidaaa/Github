import { DEFAULT_LANG, isLang, type Lang } from "@/lib/documents/lang";

/**
 * 画面の表示言語を、ブラウザ内で保持する。
 * 保存した設定（利用者ごと）が正で、ここの値は、取得前のちらつきを抑える一時的な手掛かりと、
 * 仮データの動作（Supabase 未設定・デモ）の保存先を兼ねる。
 * 依頼者向け案内書類の言語（lib/documents/lang.ts の LANG_STORAGE_KEY）とは、別のキーにする。
 */
export const UI_LANG_STORAGE_KEY = "visa-case-app:ui-lang";

let override: Lang | null = null;
const listeners = new Set<() => void>();

export function readUiLang(): Lang {
  if (override) return override;
  try {
    const v = window.localStorage.getItem(UI_LANG_STORAGE_KEY);
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/** 言語を切り替え、ブラウザへ記憶する。localStorage が使えなくても、このページの表示は切り替える */
export function writeUiLang(lang: Lang): void {
  override = lang;
  try {
    window.localStorage.setItem(UI_LANG_STORAGE_KEY, lang);
    override = null;
  } catch {
    // 記憶できない環境では、メモリ上の値で表示を続ける
  }
  listeners.forEach((l) => l());
}

export function subscribeUiLang(cb: () => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
