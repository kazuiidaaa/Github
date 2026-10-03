"use client";

import { useSyncExternalStore } from "react";

// デモモード：Supabase 設定済みの環境で、ログインせずにブラウザ内の仮データで試す。
// 状態はタブ単位（sessionStorage）で持ち、タブを閉じると解除される。サーバーへは一切書き込まない。

const KEY = "visa-case-app:demo";
const listeners = new Set<() => void>();

export function isDemo(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemo(on: boolean) {
  try {
    if (on) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    // 保存できない環境ではデモモードを開始しない
  }
  listeners.forEach((l) => l());
}

export function useDemo(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    isDemo,
    () => false,
  );
}

/** 仮データの保存先。通常の仮データ方式とは分け、デモ終了時に消せるようにする */
export function localKey(base: string): string {
  return isDemo() ? `${base}:demo` : base;
}

export function clearDemoData(bases: string[]) {
  try {
    bases.forEach((b) => localStorage.removeItem(`${b}:demo`));
  } catch {
    // 無視する
  }
}
