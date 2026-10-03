"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * 入力中の値を、入力が止まってから一定時間後に自動で保存する。
 * onBlur に頼らないため、入力直後にタブを切り替えて入力欄が取り除かれても、
 * 取り除かれる時点で未保存の内容があれば保存する。
 * 戻り値の flush は、onBlur など即時に保存したい場面で呼ぶ（保存済みなら何もしない）。
 */
export function useAutoSave(value: string, saved: string, save: (v: string) => void, delay = 1000) {
  const latest = useRef({ value, save });
  const lastSaved = useRef(saved);

  useEffect(() => {
    latest.current = { value, save };
  });
  useEffect(() => {
    lastSaved.current = saved;
  }, [saved]);

  const flush = useCallback(() => {
    const { value: v, save: s } = latest.current;
    if (v === lastSaved.current) return;
    lastSaved.current = v;
    s(v);
  }, []);

  useEffect(() => {
    if (value === lastSaved.current) return;
    const timer = setTimeout(flush, delay);
    return () => clearTimeout(timer);
  }, [value, delay, flush]);

  // 入力欄が取り除かれるとき（タブ切替など）に、未保存の内容を保存する
  useEffect(() => flush, [flush]);

  return flush;
}
