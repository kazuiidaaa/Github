// 画像の拡大表示（components/ImageZoom.tsx）の動きの計算（Issue #392 PR-10、設計書 3章B-6）。
// 画面の部品から切り離し、ばね・ゴム引き・勢いの射影・移動の範囲を、純粋な関数として持つ（テストのため）。
// CSS の transition は速度を引き継げないため、直接操作のある ImageZoom だけは JS のばねを使う（設計書 3章C）。

/** 拡大率の範囲 */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 5;
/** ボタン・ホイール・キーの1回あたりの拡大率の変化 */
export const ZOOM_STEP = 0.5;
/** 矢印キー1回で動かす量（枠の幅・高さに対する割合） */
export const KEY_PAN_RATIO = 0.1;

/** ばねの設定。減衰 1.0（跳ねない）・応答 0.4 秒（globals.css の --ease-spring-move と同じ値） */
export const SPRING = { damping: 1, response: 0.4 } as const;

export type SpringState = { value: number; velocity: number };

/**
 * ばねを dt 秒だけ進める。現在の値と速度から目標へ向かうため、途中で目標が変わっても滑らかに向きを変える。
 * 刻みが大きいと発散するため、1/240 秒ずつに分けて計算する。タブが裏にあった後などの長い間隔は 1/15 秒で打ち切る。
 */
export function stepSpring(s: SpringState, target: number, dt: number, spring: { damping: number; response: number } = SPRING): SpringState {
  const omega = (2 * Math.PI) / spring.response;
  const stiffness = omega * omega;
  const friction = 2 * spring.damping * omega;
  let { value, velocity } = s;
  let rest = Math.min(Math.max(dt, 0), 1 / 15);
  while (rest > 0) {
    const h = Math.min(rest, 1 / 240);
    const accel = -stiffness * (value - target) - friction * velocity;
    velocity += accel * h;
    value += velocity * h;
    rest -= h;
  }
  return { value, velocity };
}

/** 目標に十分近く、速度も十分小さいか（ばねを止めてよいか） */
export function isSettled(s: SpringState, target: number, epsilon: number): boolean {
  return Math.abs(s.value - target) < epsilon && Math.abs(s.velocity) < epsilon * 10;
}

/**
 * ゴム引き：範囲を超えた分に抵抗をかける。超えるほど動きにくくなり、超過は dimension 未満にとどまる。
 * 範囲内の値は、そのまま返す。
 */
export function rubberband(value: number, min: number, max: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return Math.min(max, Math.max(min, value));
  const band = (over: number) => (1 - 1 / ((over * constant) / dimension + 1)) * dimension;
  if (value < min) return min - band(min - value);
  if (value > max) return max + band(value - max);
  return value;
}

/**
 * 勢いの射影：指を離したときの速度（1 秒あたりの量）から、そのまま滑らせたときに止まる位置を求める。
 * 減速の率は 1 ミリ秒あたりの残り（0.998 は標準的なスクロールの止まり方）。
 */
export function projectMomentum(position: number, velocity: number, decelerationRate = 0.998): number {
  return position + ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampScale(scale: number): number {
  return clamp(scale, ZOOM_MIN, ZOOM_MAX);
}

/**
 * 移動できる範囲（中心からの最大のずれ）。拡大した画像の端が、枠の内側に入らない範囲とする。
 * 画像は枠の中心を起点に拡大するため、はみ出した分の半分ずつを上下・左右に動かせる。
 */
export function panLimit(scale: number, width: number, height: number): { x: number; y: number } {
  const over = Math.max(scale - 1, 0);
  return { x: (over * width) / 2, y: (over * height) / 2 };
}

/** キー操作の割り当て。対象外のキーは null（ページのスクロールなど、ブラウザの既定の動作に任せる） */
export type ZoomKeyAction =
  | { kind: "zoom"; delta: number }
  | { kind: "reset" }
  | { kind: "pan"; dx: -1 | 0 | 1; dy: -1 | 0 | 1 };

export function zoomKeyAction(key: string): ZoomKeyAction | null {
  switch (key) {
    case "+":
    case "=":
      return { kind: "zoom", delta: ZOOM_STEP };
    case "-":
    case "_":
      return { kind: "zoom", delta: -ZOOM_STEP };
    case "0":
      return { kind: "reset" };
    // 矢印の向きに、画像の見える範囲を動かす（右矢印で右側が見える＝画像は左へ動く）
    case "ArrowLeft":
      return { kind: "pan", dx: 1, dy: 0 };
    case "ArrowRight":
      return { kind: "pan", dx: -1, dy: 0 };
    case "ArrowUp":
      return { kind: "pan", dx: 0, dy: 1 };
    case "ArrowDown":
      return { kind: "pan", dx: 0, dy: -1 };
    default:
      return null;
  }
}
