import { useCallback, useEffect, useRef } from "react";

/**
 * 入力欄の値を、入力が止まってから一定時間後に自動保存する。
 * 欄が画面から外れる（タブ切替など）ときは、未保存の値をその場で保存する。
 * 戻り値の `flush` は、onBlur など確定操作の保存に使う（同じ値は二重に保存しない）。
 */
export function useAutoSave(value: string, savedValue: string, onSave: (v: string) => void, delay = 1000) {
  const latest = useRef({ value, onSave });
  const lastSaved = useRef(savedValue);

  useEffect(() => {
    latest.current = { value, onSave };
  });
  useEffect(() => {
    lastSaved.current = savedValue;
  }, [savedValue]);

  const flush = useCallback((v: string) => {
    if (v === lastSaved.current) return;
    lastSaved.current = v;
    latest.current.onSave(v);
  }, []);

  useEffect(() => {
    if (value === savedValue) return;
    const timer = setTimeout(() => flush(value), delay);
    return () => clearTimeout(timer);
  }, [value, savedValue, delay, flush]);

  useEffect(
    () => () => flush(latest.current.value),
    [flush],
  );

  return flush;
}
