"use client";

import { useEffect, useRef, useState } from "react";

const MIN = 1;
const MAX = 5;
const STEP = 0.5;

const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

/**
 * 画像の拡大・縮小とドラッグ移動ができるビューアー。
 * ボタン・マウスホイール・2本指のピンチに対応する。初期表示は枠内に収まる大きさ。
 */
export function ImageZoom({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);

  function zoomTo(next: number) {
    const s = clamp(next);
    setScale(s);
    if (s === MIN) setPos({ x: 0, y: 0 });
  }

  // ホイール操作で、ページをスクロールさせずに拡大・縮小する（passive でない購読が必要）
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setScale((s) => {
        const next = clamp(s + (e.deltaY < 0 ? STEP : -STEP));
        if (next === MIN) setPos({ x: 0, y: 0 });
        return next;
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function distance() {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) pinch.current = { dist: distance(), scale };
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      zoomTo((pinch.current.scale * distance()) / pinch.current.dist);
    } else if (pointers.current.size === 1 && scale > MIN) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  const btn = "rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-40";
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <button type="button" className={btn} onClick={() => zoomTo(scale - STEP)} disabled={scale <= MIN} aria-label="縮小">
          −
        </button>
        <button type="button" className={btn} onClick={() => zoomTo(scale + STEP)} disabled={scale >= MAX} aria-label="拡大">
          ＋
        </button>
        <button type="button" className={btn} onClick={() => zoomTo(MIN)} disabled={scale === MIN}>
          元に戻す
        </button>
        <span className="text-xs text-slate-500" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
      </div>
      <div
        ref={frame}
        className={`overflow-hidden rounded border border-slate-200 bg-slate-50 ${scale > MIN ? "cursor-grab active:cursor-grabbing" : ""} ${className}`}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-[32rem] w-full select-none object-contain"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transformOrigin: "center" }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">ボタン・ホイール・ピンチで拡大し、拡大中はドラッグで移動できます。</p>
    </div>
  );
}
