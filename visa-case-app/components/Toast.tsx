"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error";
type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  /** 成功の通知。数秒で自動的に消える */
  success: (message: string) => void;
  /** 失敗の通知。利用者が閉じるまで消えない */
  error: (message: string) => void;
};

const SUCCESS_MS = 5000;

const ToastContext = createContext<ToastApi | null>(null);

/**
 * 操作の完了を知らせる通知（トースト）を提供する。app/layout.tsx で1か所だけ配置する。
 * 画面遷移をまたいで表示するため、画面の切り替え（PageTransition）の外に置く。
 * 通知の文言に、氏名・案件名などの個人情報を含めないこと。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, kind, message }]);
      if (kind === "success") window.setTimeout(() => dismiss(id), SUCCESS_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ success: (m) => push("success", m), error: (m) => push("error", m) }), [push]);

  const successes = items.filter((t) => t.kind === "success");
  const errors = items.filter((t) => t.kind === "error");

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* 読み上げが確実に働くよう、領域は常に配置しておき、中身だけを入れ替える */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-4">
        <div role="status" className="flex w-full flex-col items-center gap-2">
          {successes.map((t) => (
            <ToastCard key={t.id} item={t} onClose={dismiss} />
          ))}
        </div>
        <div role="alert" className="flex w-full flex-col items-center gap-2">
          {errors.map((t) => (
            <ToastCard key={t.id} item={t} onClose={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  const isError = item.kind === "error";
  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose(item.id);
      }}
      className={`anim-pop-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border p-4 text-sm shadow-lg ${
        isError ? "border-red-800 bg-red-50 text-red-900" : "border-line-strong bg-white text-foreground"
      }`}
    >
      {/* 色だけに頼らず、図形でも種類を示す（成功＝丸に印、失敗＝ひし形） */}
      <svg aria-hidden="true" viewBox="0 0 20 20" className={`mt-0.5 h-5 w-5 shrink-0 ${isError ? "text-red-800" : "text-accent"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {isError ? (
          <>
            <path d="M10 1.5 18.5 10 10 18.5 1.5 10Z" />
            <path d="M10 6v5M10 13.8v.2" />
          </>
        ) : (
          <>
            <circle cx="10" cy="10" r="8.5" />
            <path d="m6.5 10.2 2.4 2.4 4.6-5" />
          </>
        )}
      </svg>
      <p className="flex-1 font-bold leading-relaxed">{item.message}</p>
      <button
        type="button"
        onClick={() => onClose(item.id)}
        aria-label={isError ? "エラーの通知を閉じる" : "通知を閉じる"}
        className="-m-1 rounded-full p-1 hover:bg-slate-100"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
    </div>
  );
}

/** 通知を出す。ToastProvider の外では、何も表示しない。 */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}

const NOOP: ToastApi = { success: () => {}, error: () => {} };
