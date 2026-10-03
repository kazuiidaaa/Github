"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * 複数項目を持つフォームの入力内容を、入力が止まってから一定時間後に自動で保存する。
 * 画面（タブ）が取り除かれる時点で未保存の内容があれば、その時点でも保存する。
 * useAutoSave（1つの文字列項目用）と同じ考え方を、フォーム全体の値に適用したもの。
 *
 * - save は保存できたら true、保存しなかった（検証エラーなど）場合は false を返す。
 *   false の間は「未保存」のまま残り、内容が変わるたびに再度試す。
 * - enabled が false の間（確認済みで入力欄が無効など）は自動保存しない。
 * - 戻り値の markSaved は、保存ボタンなど手動で保存したときに呼ぶ（同じ内容を重ねて保存しない）。
 */
export function useAutoSaveForm<T>(
  form: T,
  save: (value: T) => boolean | void,
  options: { enabled?: boolean; delay?: number } = {},
) {
  const { enabled = true, delay = 1000 } = options;
  const lastSaved = useRef(JSON.stringify(form));
  const latest = useRef({ form, save, enabled });

  useEffect(() => {
    latest.current = { form, save, enabled };
  });

  const flush = useCallback(() => {
    const { form: f, save: s, enabled: on } = latest.current;
    if (!on) return;
    const json = JSON.stringify(f);
    if (json === lastSaved.current) return;
    if (s(f) === false) return;
    lastSaved.current = json;
  }, []);

  const markSaved = useCallback((value: T) => {
    lastSaved.current = JSON.stringify(value);
  }, []);

  const json = JSON.stringify(form);
  useEffect(() => {
    if (!enabled || json === lastSaved.current) return;
    const timer = setTimeout(flush, delay);
    return () => clearTimeout(timer);
  }, [json, enabled, delay, flush]);

  // 画面が取り除かれるとき（タブ切替など）に、未保存の内容を保存する
  useEffect(() => flush, [flush]);

  return { flush, markSaved };
}
