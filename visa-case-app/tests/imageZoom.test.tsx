import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImageZoom } from "../components/ImageZoom";
import { translate } from "../lib/i18n/translate";
import {
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  isSettled,
  panLimit,
  projectMomentum,
  rubberband,
  stepSpring,
  zoomKeyAction,
  type SpringState,
} from "../lib/zoomPhysics";

/** 目標へ向けて、1/60 秒ずつ seconds 秒だけ進める */
function run(s: SpringState, target: number, seconds: number): SpringState {
  let cur = s;
  for (let t = 0; t < seconds; t += 1 / 60) cur = stepSpring(cur, target, 1 / 60);
  return cur;
}

describe("ばね（減衰 1.0・応答 0.4 秒）", () => {
  it("0.6 秒ほどで目標に落ち着き、跳ねて目標を越えない", () => {
    let cur: SpringState = { value: 1, velocity: 0 };
    let max = 1;
    for (let i = 0; i < 60; i++) {
      cur = stepSpring(cur, 2, 1 / 60);
      max = Math.max(max, cur.value);
    }
    expect(max).toBeLessThanOrEqual(2 + 1e-6);
    expect(isSettled(cur, 2, 0.01)).toBe(true);
  });
  it("途中で目標が変わっても、現在の値と速度から動かし直す（値が飛ばない）", () => {
    const mid = run({ value: 1, velocity: 0 }, 3, 0.1);
    expect(mid.value).toBeGreaterThan(1);
    expect(mid.velocity).toBeGreaterThan(0);
    const next = stepSpring(mid, 1, 1 / 60);
    expect(Math.abs(next.value - mid.value)).toBeLessThan(0.2);
    // 速度を引き継ぐため、向きを変えた直後は、まだ前の向きへ少し進む
    expect(next.value).toBeGreaterThan(mid.value);
  });
  it("長い間隔（タブが裏にあった後など）でも発散しない", () => {
    const cur = stepSpring({ value: 0, velocity: 0 }, 100, 5);
    expect(Number.isFinite(cur.value)).toBe(true);
    expect(cur.value).toBeLessThanOrEqual(100);
  });
});

describe("ゴム引き", () => {
  it("範囲内はそのまま", () => {
    expect(rubberband(3, ZOOM_MIN, ZOOM_MAX, 0.5)).toBe(3);
  });
  it("範囲外は抵抗がかかり、超過は dimension 未満にとどまる", () => {
    const over = rubberband(ZOOM_MAX + 10, ZOOM_MIN, ZOOM_MAX, 0.5);
    expect(over).toBeGreaterThan(ZOOM_MAX);
    expect(over).toBeLessThan(ZOOM_MAX + 0.5);
    const under = rubberband(-200, -100, 100, 300);
    expect(under).toBeLessThan(-100);
    expect(under).toBeGreaterThan(-100 - 300);
    // 少し超えたときは、超えた量より小さく動く
    expect(rubberband(110, -100, 100, 300) - 100).toBeLessThan(10);
  });
  it("大きさが 0 のときは、範囲に収める", () => {
    expect(rubberband(50, 0, 0, 0)).toBe(0);
  });
});

describe("勢いの射影と移動の範囲", () => {
  it("速度 0 なら止まった位置のまま。速いほど遠くで止まる", () => {
    expect(projectMomentum(10, 0)).toBe(10);
    expect(projectMomentum(0, 1000)).toBeGreaterThan(projectMomentum(0, 500));
    expect(projectMomentum(0, -1000)).toBeLessThan(0);
  });
  it("等倍では動かせず、拡大した分の半分ずつ動かせる", () => {
    expect(panLimit(1, 400, 300)).toEqual({ x: 0, y: 0 });
    expect(panLimit(3, 400, 300)).toEqual({ x: 400, y: 300 });
  });
});

describe("キー操作の割り当て", () => {
  it("＋／−／0／矢印に対応し、ほかのキーはブラウザに任せる", () => {
    expect(zoomKeyAction("+")).toEqual({ kind: "zoom", delta: ZOOM_STEP });
    expect(zoomKeyAction("=")).toEqual({ kind: "zoom", delta: ZOOM_STEP });
    expect(zoomKeyAction("-")).toEqual({ kind: "zoom", delta: -ZOOM_STEP });
    expect(zoomKeyAction("0")).toEqual({ kind: "reset" });
    expect(zoomKeyAction("ArrowRight")).toEqual({ kind: "pan", dx: -1, dy: 0 });
    expect(zoomKeyAction("ArrowUp")).toEqual({ kind: "pan", dx: 0, dy: 1 });
    expect(zoomKeyAction("Tab")).toBeNull();
    expect(zoomKeyAction("Enter")).toBeNull();
  });
});

describe("ImageZoom の表示", () => {
  const html = renderToStaticMarkup(<ImageZoom src="/x.png" alt="在留カード" />);
  it("ボタンの名前が訳表から出る（日本語）", () => {
    expect(html).toContain('aria-label="縮小"');
    expect(html).toContain('aria-label="拡大"');
    expect(html).toContain("元に戻す");
    expect(html).toContain("矢印キー");
  });
  it("枠にキーボードで移れ、説明が結び付く", () => {
    expect(html).toMatch(/tabindex="0"/);
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toContain('aria-label="在留カード"');
  });
  it("ボタンは高さ 44px。等倍では縮小・元に戻すが押せない", () => {
    expect(html).toContain("min-h-[44px]");
    expect(html.match(/disabled=""/g)?.length).toBe(2);
    expect(html).toContain("100%");
  });
  it("英語・韓国語の訳がある", () => {
    expect(translate("en", "display.zoomIn")).toBe("Zoom in");
    expect(translate("ko", "display.zoomOut")).toBe("축소");
  });
});
