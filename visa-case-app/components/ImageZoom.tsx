"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { prefersReducedMotion } from "@/lib/motion";
import {
  KEY_PAN_RATIO,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  clamp,
  clampScale,
  isSettled,
  panLimit,
  projectMomentum,
  rubberband,
  stepSpring,
  zoomKeyAction,
  type SpringState,
} from "@/lib/zoomPhysics";

const CHANNELS = ["s", "x", "y"] as const;
type Channel = (typeof CHANNELS)[number];
type View = Record<Channel, number>;

/** ばねを止める目安（拡大率は 0.001、移動は 0.5px） */
const EPSILON: View = { s: 0.001, x: 0.5, y: 0.5 };
/** 拡大率のゴム引きの大きさ（範囲の外へは、最大でこの量の手前までしか伸びない） */
const SCALE_BAND = 0.5;
/** 指を止めてから離すまでがこれより長いときは、勢いを付けない（ミリ秒） */
const STILL_MS = 100;

/**
 * 拡大率（s）と位置（x, y）の3つのばねと、指の操作を持つ。描画は React を通さず、img の transform を直接書き換える。
 * 1 つの ImageZoom につき 1 つ作る。
 */
class ZoomEngine {
  private springs: Record<Channel, SpringState & { target: number }> = {
    s: { value: 1, velocity: 0, target: 1 },
    x: { value: 0, velocity: 0, target: 0 },
    y: { value: 0, velocity: 0, target: 0 },
  };
  private raf: number | null = null;
  private lastTime: number | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  /** ピンチの開始時の指の間隔と拡大率 */
  private pinch: { dist: number; scale: number } | null = null;
  /** ドラッグ中の、ゴム引きをかける前の位置と、直近の速度（1 秒あたりの px） */
  private drag: { rawX: number; rawY: number; vx: number; vy: number; time: number } | null = null;

  /**
   * @param imgRef 描画先の img
   * @param onTarget 拡大率の行き先が変わったとき（ボタンの無効化・％表示に使う）
   */
  constructor(
    private imgRef: { readonly current: HTMLImageElement | null },
    private onTarget: (scale: number) => void,
  ) {}

  private get img() {
    return this.imgRef.current;
  }

  /** 行き先の拡大率 */
  get targetScale() {
    return this.springs.s.target;
  }

  private apply() {
    const { s, x, y } = this.springs;
    if (this.img) this.img.style.transform = `translate(${x.value}px, ${y.value}px) scale(${s.value})`;
  }

  stop() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.lastTime = null;
  }

  private tick = (now: number) => {
    const dt = this.lastTime === null ? 1 / 60 : (now - this.lastTime) / 1000;
    this.lastTime = now;
    let moving = false;
    for (const ch of CHANNELS) {
      const sp = this.springs[ch];
      const next = stepSpring(sp, sp.target, dt);
      if (isSettled(next, sp.target, EPSILON[ch])) {
        sp.value = sp.target;
        sp.velocity = 0;
      } else {
        sp.value = next.value;
        sp.velocity = next.velocity;
        moving = true;
      }
    }
    this.apply();
    if (moving) {
      this.raf = requestAnimationFrame(this.tick);
    } else {
      this.raf = null;
      this.lastTime = null;
    }
  };

  /** 行き先を決めて、現在の値と速度からばねで動かす。動きを減らす設定では即時に移る */
  private animateTo(target: View) {
    for (const ch of CHANNELS) this.springs[ch].target = target[ch];
    this.onTarget(target.s);
    if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
      this.stop();
      for (const ch of CHANNELS) {
        this.springs[ch].value = target[ch];
        this.springs[ch].velocity = 0;
      }
      this.apply();
      return;
    }
    if (this.raf === null) this.raf = requestAnimationFrame(this.tick);
  }

  /** 拡大前の画像の大きさ。測れない環境では 0（移動しない） */
  private size() {
    return { w: this.img?.offsetWidth ?? 0, h: this.img?.offsetHeight ?? 0 };
  }

  /** 拡大率 scale のときの、範囲内の位置（画像の端が枠の内側に入らない） */
  private clampPan(scale: number, x: number, y: number) {
    const { w, h } = this.size();
    const lim = panLimit(scale, w, h);
    return { x: clamp(x, -lim.x, lim.x), y: clamp(y, -lim.y, lim.y) };
  }

  /** 拡大率の行き先を変える（ボタン・ホイール・キー）。等倍に戻るときは中央へ、それ以外は位置を範囲内へ収める */
  zoomTo(next: number) {
    const s = clampScale(next);
    const { x, y } = this.springs;
    const pos = s === ZOOM_MIN ? { x: 0, y: 0 } : this.clampPan(s, x.target, y.target);
    this.animateTo({ s, ...pos });
  }

  /** 枠の大きさの割合で動かす（矢印キー）。等倍では動かす先がないため false */
  panBy(dx: number, dy: number): boolean {
    const { s, x, y } = this.springs;
    if (s.target <= ZOOM_MIN) return false;
    const { w, h } = this.size();
    const pos = this.clampPan(s.target, x.target + dx * w * KEY_PAN_RATIO, y.target + dy * h * KEY_PAN_RATIO);
    this.animateTo({ s: s.target, ...pos });
    return true;
  }

  private distance() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private startDrag(time: number) {
    const { x, y } = this.springs;
    this.drag = { rawX: x.value, rawY: y.value, vx: 0, vy: 0, time };
  }

  /** 指（またはマウス）を置いたら、ばねを止めて、いまの位置から指に従わせる */
  pointerDown(id: number, clientX: number, clientY: number, time: number) {
    this.stop();
    for (const ch of CHANNELS) {
      const sp = this.springs[ch];
      sp.velocity = 0;
      sp.target = sp.value;
    }
    this.pointers.set(id, { x: clientX, y: clientY });
    if (this.pointers.size === 2) {
      this.drag = null;
      this.pinch = { dist: this.distance(), scale: this.springs.s.value };
    } else if (this.pointers.size === 1) {
      this.startDrag(time);
    }
  }

  pointerMove(id: number, clientX: number, clientY: number, time: number) {
    const prev = this.pointers.get(id);
    if (!prev) return;
    this.pointers.set(id, { x: clientX, y: clientY });
    const { s, x, y } = this.springs;
    if (this.pointers.size === 2 && this.pinch) {
      // 範囲の外は、ゴム引きで抵抗をかける。離したときに範囲内へ戻す
      const raw = (this.pinch.scale * this.distance()) / this.pinch.dist;
      s.value = s.target = rubberband(raw, ZOOM_MIN, ZOOM_MAX, SCALE_BAND);
      const pos = this.clampPan(Math.max(s.value, ZOOM_MIN), x.value, y.value);
      x.value = x.target = pos.x;
      y.value = y.target = pos.y;
      this.apply();
    } else if (this.pointers.size === 1 && this.drag && s.value > ZOOM_MIN) {
      const d = this.drag;
      const dx = clientX - prev.x;
      const dy = clientY - prev.y;
      d.rawX += dx;
      d.rawY += dy;
      const dt = Math.max((time - d.time) / 1000, 1 / 1000);
      // 速度は、直近の動きを重く見た平均
      d.vx = 0.8 * (dx / dt) + 0.2 * d.vx;
      d.vy = 0.8 * (dy / dt) + 0.2 * d.vy;
      d.time = time;
      // 指には1:1で従い、範囲の外だけ抵抗をかける
      const { w, h } = this.size();
      const lim = panLimit(s.value, w, h);
      x.value = x.target = rubberband(d.rawX, -lim.x, lim.x, w);
      y.value = y.target = rubberband(d.rawY, -lim.y, lim.y, h);
      this.apply();
    }
  }

  pointerUp(id: number, time: number) {
    if (!this.pointers.delete(id)) return;
    const { s, x, y } = this.springs;
    if (this.pointers.size === 1) {
      // ピンチから1本指に戻ったら、残った指でドラッグを続ける（拡大率は範囲内へ戻す）
      this.pinch = null;
      const next = clampScale(s.value);
      if (next !== s.value) this.animateTo({ s: next, ...this.clampPan(next, x.value, y.value) });
      this.startDrag(time);
      return;
    }
    if (this.pointers.size > 0) return;
    this.pinch = null;
    // 離したら、範囲の外は範囲内へ、移動は勢いの射影の先（範囲内の最寄り）へ、ばねで動かす
    const next = clampScale(s.value);
    let toX = x.value;
    let toY = y.value;
    const d = this.drag;
    this.drag = null;
    if (d && !prefersReducedMotion()) {
      const still = time - d.time > STILL_MS;
      x.velocity = still ? 0 : d.vx;
      y.velocity = still ? 0 : d.vy;
      toX = projectMomentum(toX, x.velocity);
      toY = projectMomentum(toY, y.velocity);
    }
    const pos = next === ZOOM_MIN ? { x: 0, y: 0 } : this.clampPan(next, toX, toY);
    this.animateTo({ s: next, ...pos });
  }
}

/**
 * 画像の拡大・縮小とドラッグ移動ができるビューアー（設計書 3章B-6）。
 * ボタン・マウスホイール・2本指のピンチ・キーボード（＋／−／0／矢印）に対応する。初期表示は枠内に収まる大きさ。
 * - ドラッグ・ピンチは指に1:1で追従し、範囲の外へはゴム引き（抵抗）で少しだけ伸びる。離すと範囲内へばねで戻る。
 * - 移動は、離したときの勢いから止まる位置を求め（勢いの射影）、画像の端が枠の内側に入らない最寄りの位置で止める。
 * - ボタン・ホイール・キーの拡大はばねで補間し、連打しても現在の値と速度から次の行き先へ動かし直す。
 * - 動きを減らす設定では、ばねを使わず即時に移る（勢いの射影もしない）。
 */
export function ImageZoom({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const t = useT();
  const hintId = useId();
  const frame = useRef<HTMLDivElement>(null);
  // 画面に出す拡大率（ボタンの無効化・％表示）。動きの途中の値ではなく、行き先の値を出す
  const [shownScale, setShownScale] = useState(1);
  const img = useRef<HTMLImageElement>(null);
  const [engine] = useState(() => new ZoomEngine(img, setShownScale));

  // ホイール操作で、ページをスクロールさせずに拡大・縮小する（passive でない購読が必要）。段階値は従来どおり
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      engine.zoomTo(engine.targetScale + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      engine.stop();
    };
  }, [engine]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const action = zoomKeyAction(e.key);
    if (!action) return;
    if (action.kind === "zoom") engine.zoomTo(engine.targetScale + action.delta);
    else if (action.kind === "reset") engine.zoomTo(ZOOM_MIN);
    // 等倍では、矢印キーはページのスクロールに任せる
    else if (!engine.panBy(action.dx, action.dy)) return;
    e.preventDefault();
  }

  const btn =
    "mac-button inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-line-strong bg-white px-4 text-sm font-bold hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40";
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => engine.zoomTo(engine.targetScale - ZOOM_STEP)} disabled={shownScale <= ZOOM_MIN} aria-label={t("display.zoomOut")}>
          −
        </button>
        <button type="button" className={btn} onClick={() => engine.zoomTo(engine.targetScale + ZOOM_STEP)} disabled={shownScale >= ZOOM_MAX} aria-label={t("display.zoomIn")}>
          ＋
        </button>
        <button type="button" className={btn} onClick={() => engine.zoomTo(ZOOM_MIN)} disabled={shownScale === ZOOM_MIN}>
          {t("display.zoomReset")}
        </button>
        <span className="text-xs text-muted" aria-live="polite">
          {Math.round(shownScale * 100)}%
        </span>
      </div>
      <div
        ref={frame}
        tabIndex={0}
        role="group"
        aria-roledescription={t("display.zoomViewerRole")}
        aria-label={alt}
        aria-describedby={hintId}
        className={`overflow-hidden rounded border border-slate-200 bg-slate-50 ${shownScale > ZOOM_MIN ? "cursor-grab active:cursor-grabbing" : ""} ${className}`}
        style={{ touchAction: "none" }}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          engine.pointerDown(e.pointerId, e.clientX, e.clientY, e.timeStamp);
        }}
        onPointerMove={(e) => engine.pointerMove(e.pointerId, e.clientX, e.clientY, e.timeStamp)}
        onPointerUp={(e) => engine.pointerUp(e.pointerId, e.timeStamp)}
        onPointerCancel={(e) => engine.pointerUp(e.pointerId, e.timeStamp)}
      >
        {/* transform は描画のたびに上書きしないよう、JSX では指定せず ZoomEngine が書き込む */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={img}
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-[32rem] w-full select-none object-contain will-change-transform"
          style={{ transformOrigin: "center" }}
        />
      </div>
      <p id={hintId} className="mt-1 text-xs text-muted">
        {t("display.zoomHint")}
      </p>
    </div>
  );
}
