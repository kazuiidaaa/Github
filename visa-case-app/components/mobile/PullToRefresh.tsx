"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { prefersReducedMotion } from "@/lib/motion";

/** この距離（px）まで引いて離すと、更新を始める */
export const PULL_THRESHOLD = 64;
/** 引ける最大の距離（px） */
export const PULL_MAX = 96;

/** 指の移動量 dy（px）を、表示する引き量にする純粋な関数。引くほど重くなる（0.5 倍、上限 PULL_MAX）。負の値は 0 */
export function pullDistance(dy: number): number {
  if (!(dy > 0)) return 0;
  return Math.min(PULL_MAX, dy * 0.5);
}

/** 離したときに更新を始めるか */
export function shouldRefresh(distance: number): boolean {
  return distance >= PULL_THRESHOLD;
}

function subscribeReducedMotion(cb: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

type Phase = "idle" | "pulling" | "ready" | "refreshing" | "done";

/**
 * 下に引いて再読み込みする枠（SwiftUI の .refreshable）。画面の先頭にいるときだけ、下向きの引きに反応する。
 * 動きを減らす設定（prefers-reduced-motion）では、内容を動かさず、引き量の表示もしない。引いて離せば更新はでき、
 * 状態は文字（role="status"）で伝える。
 * 指で引けない人のために、キーボードで届く「再読み込み」ボタンも、フォーカス時に表示する。
 *
 * props:
 * - onRefresh 更新の処理。Promise を返すと、完了まで「更新中」を出す。失敗（reject）しても枠は元に戻る（エラーの通知は呼び出し側で行う）
 * - children  引いて更新したい内容
 * - disabled  true で引きを無効にする（読み込み中など）。任意
 */
export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: {
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [distance, setDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const busy = useRef(false);
  // 引いた距離の実測値（動きを減らす設定では、表示の distance は 0 のまま、判定にはこちらを使う）
  const pulled = useRef(0);
  // サーバー側の描画（false）と一致させるため useSyncExternalStore で読む
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);

  async function run() {
    if (busy.current) return;
    busy.current = true;
    setPhase("refreshing");
    setDistance(PULL_THRESHOLD * 0.75);
    pulled.current = 0;
    try {
      await onRefresh();
      setPhase("done");
    } catch {
      setPhase("idle");
    } finally {
      busy.current = false;
      setDistance(0);
      // 完了の文言を少しだけ残してから戻す
      window.setTimeout(() => setPhase((p) => (p === "done" ? "idle" : p)), 1200);
    }
  }

  // 動きを減らす設定：引いている間は高さを変えず、更新中・完了の文字だけを固定の高さで出す
  const shown = reduced ? (phase === "refreshing" || phase === "done" ? 40 : 0) : distance;
  const message =
    phase === "refreshing"
      ? t("mobile.refreshing")
      : phase === "done"
        ? t("mobile.refreshDone")
        : phase === "ready"
          ? t("mobile.refreshRelease")
          : phase === "pulling"
            ? t("mobile.refreshPull")
            : "";

  return (
    <div
      onTouchStart={(e) => {
        if (disabled || busy.current || window.scrollY > 0) {
          startY.current = null;
          return;
        }
        startY.current = e.touches[0].clientY;
      }}
      onTouchMove={(e) => {
        if (startY.current === null) return;
        const d = pullDistance(e.touches[0].clientY - startY.current);
        pulled.current = d;
        setDistance(reduced ? 0 : d);
        setPhase(d <= 0 ? "idle" : shouldRefresh(d) ? "ready" : "pulling");
      }}
      onTouchEnd={() => {
        if (startY.current === null) return;
        startY.current = null;
        if (shouldRefresh(pulled.current)) void run();
        else {
          pulled.current = 0;
          setDistance(0);
          setPhase("idle");
        }
      }}
      onTouchCancel={() => {
        startY.current = null;
        pulled.current = 0;
        setDistance(0);
        setPhase("idle");
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => void run()}
        className="sr-only focus:not-sr-only focus:mx-4 focus:my-2 focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-full focus:border focus:border-line-strong focus:bg-white focus:px-4 focus:text-sm focus:font-bold"
      >
        {t("mobile.refreshButton")}
      </button>
      <div
        role="status"
        aria-live="polite"
        style={{ height: shown }}
        className="m-ptr flex items-end justify-center overflow-hidden text-sm text-slate-600"
      >
        {message && (
          <span className="flex items-center gap-2 pb-2">
            {phase === "refreshing" && (
              <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin motion-reduce:animate-none">
                <path d="M10 2a8 8 0 1 0 8 8" />
              </svg>
            )}
            {message}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
