"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const ORDER: ThemePreference[] = ["system", "light", "dark"];
const LABELS: Record<ThemePreference, string> = { system: "自動", light: "明るい", dark: "暗い" };

/** layout.tsx の先頭で実行するスクリプト。描画前に data-theme を決め、表示のちらつきを防ぐ。 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${STORAGE_KEY}");if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;

function readPreference(): ThemePreference {
  try {
    const p = localStorage.getItem(STORAGE_KEY);
    return p === "light" || p === "dark" ? p : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePreference) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

/** 明暗の切り替え。自動（OS の設定に従う）、明るい、暗いの順に切り替わる。 */
export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, readPreference, () => "system" as ThemePreference);

  // 開発時の再描画で属性が消えた場合も、描画前に再適用する
  useLayoutEffect(() => {
    apply(pref);
  }, [pref]);

  useEffect(() => {
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  function next() {
    const n = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    try {
      if (n === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, n);
    } catch {
      // 保存できない環境でも、このページの表示は切り替える
    }
    listeners.forEach((l) => l());
  }

  const label = LABELS[pref];
  return (
    <button
      type="button"
      onClick={next}
      aria-label={`表示の明暗：${label}。押すと切り替わります`}
      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor" />
      </svg>
      表示：{label}
    </button>
  );
}
