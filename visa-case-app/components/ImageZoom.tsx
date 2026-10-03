"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

const MIN = 1;
const MAX = 5;
const STEP = 0.5;

const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

function zoomed(v: { scale: number; x: number; y: number }, next: number) {
  const scale = clamp(next);
  return scale === MIN ? { scale, x: 0, y: 0 } : { ...v, scale };
}

// 画像を拡大・縮小し、拡大時はドラッグで移動できる表示部品。初期表示は枠内に収める（object-contain）。
export function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const { scale } = view;
  const box = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  // 拡大率を変える。元の大きさに戻るときは移動量も初期化する。
  function zoomBy(delta: number) {
    setView((v) => zoomed(v, v.scale + delta));
  }

  function zoomTo(next: number) {
    setView((v) => zoomed(v, next));
  }

  function reset() {
    setView({ scale: 1, x: 0, y: 0 });
  }

  // ホイール操作でスクロールではなく拡大縮小を行うため、passive でないリスナーを直接登録する。
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => zoomed(v, v.scale + (e.deltaY < 0 ? STEP : -STEP)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart.current.dist > 0) zoomTo(pinchStart.current.scale * (dist / pinchStart.current.dist));
    } else if (pointers.current.size === 1 && scale > MIN) {
      setView((v) => ({ ...v, x: v.x + e.clientX - prev.x, y: v.y + e.clientY - prev.y }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2" role="group" aria-label="画像の拡大縮小">
        <Button variant="secondary" onClick={() => zoomBy(-STEP)} disabled={scale <= MIN} aria-label="縮小">
          －
        </Button>
        <span className="w-14 text-center text-sm tabular-nums" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="secondary" onClick={() => zoomBy(STEP)} disabled={scale >= MAX} aria-label="拡大">
          ＋
        </Button>
        <Button variant="secondary" onClick={reset} disabled={scale === MIN}>
          元のサイズに戻す
        </Button>
      </div>
      <div
        ref={box}
        className={`h-[32rem] w-full touch-none select-none overflow-hidden rounded border border-slate-200 ${
          scale > MIN ? "cursor-grab active:cursor-grabbing" : ""
        }`}
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
          className="h-full w-full object-contain"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${scale})`, transformOrigin: "center" }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">ホイールまたはピンチ操作で拡大縮小、拡大中はドラッグで移動できます。</p>
    </div>
  );
}
