import { describe, expect, it } from "vitest";
import { PHOTO_ASPECT_WARNING, isPhotoAspectOutOfRange } from "../lib/photoAspect";

describe("証明写真の縦横比チェック", () => {
  it("4:3（縦4×横3）に近い画像は注意しない", () => {
    expect(isPhotoAspectOutOfRange(300, 400)).toBe(false);
    expect(isPhotoAspectOutOfRange(3000, 4100)).toBe(false);
    expect(isPhotoAspectOutOfRange(300, 450)).toBe(false);
  });
  it("正方形・横長・極端な縦長は注意する", () => {
    expect(isPhotoAspectOutOfRange(400, 400)).toBe(true);
    expect(isPhotoAspectOutOfRange(400, 300)).toBe(true);
    expect(isPhotoAspectOutOfRange(100, 500)).toBe(true);
  });
  it("許容範囲（±15%）の境界を守る", () => {
    expect(isPhotoAspectOutOfRange(1000, 1130)).toBe(true);
    expect(isPhotoAspectOutOfRange(1000, 1140)).toBe(false);
    expect(isPhotoAspectOutOfRange(1000, 1520)).toBe(false);
    expect(isPhotoAspectOutOfRange(1000, 1540)).toBe(true);
  });
  it("寸法が不正な場合は判定しない", () => {
    expect(isPhotoAspectOutOfRange(0, 400)).toBe(false);
    expect(isPhotoAspectOutOfRange(300, NaN)).toBe(false);
  });
  it("注意文に、縦横比以外は目視確認が必要である旨を含む", () => {
    expect(PHOTO_ASPECT_WARNING).toContain("目視");
    expect(PHOTO_ASPECT_WARNING).toContain("背景・無帽");
  });
});
