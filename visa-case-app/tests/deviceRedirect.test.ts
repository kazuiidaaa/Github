import { describe, expect, it } from "vitest";
import {
  clearViewCookie,
  decideDeviceRedirect,
  desktopViewCookie,
  isIphoneUserAgent,
  isRedirectablePath,
} from "../lib/deviceRedirect";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
const PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function decide(over: Partial<Parameters<typeof decideDeviceRedirect>[0]> = {}) {
  return decideDeviceRedirect({ method: "GET", pathname: "/", userAgent: IPHONE, viewCookie: undefined, ...over });
}

describe("isIphoneUserAgent", () => {
  it("iPhone（Safari・Chrome）は true", () => {
    expect(isIphoneUserAgent(IPHONE)).toBe(true);
    expect(isIphoneUserAgent(IPHONE_CHROME)).toBe(true);
  });
  it("iPad・iPad のデスクトップ表示・Android・PC は false", () => {
    for (const ua of [IPAD, IPAD_DESKTOP, ANDROID, PC]) expect(isIphoneUserAgent(ua)).toBe(false);
  });
  it("UA 無し・空は false", () => {
    expect(isIphoneUserAgent(null)).toBe(false);
    expect(isIphoneUserAgent(undefined)).toBe(false);
    expect(isIphoneUserAgent("")).toBe(false);
  });
  it("偽装らしい極端に長い UA は false", () => {
    expect(isIphoneUserAgent(`iPhone ${"a".repeat(600)}`)).toBe(false);
  });
  it("Android を併記する UA は false", () => {
    expect(isIphoneUserAgent("iPhone Android")).toBe(false);
  });
});

describe("decideDeviceRedirect（対応表）", () => {
  it.each([
    ["/", "/m/cases"],
    ["/cases", "/m/cases"],
    ["/cases/", "/m/cases"],
    ["/cases/new", "/m/cases/new"],
  ])("iPhone で %s は %s へ", (pathname, to) => {
    expect(decide({ pathname })).toBe(to);
  });
  it.each([
    "/cases/abc/documents",
    "/cases/abc/edit",
    "/cases/abc/edit/",
    "/cases/a.b",
    "/cases/a%2Fb",
    "/cases/a b",
    `/cases/${"a".repeat(65)}`,
    "/account",
    "/login",
    "/reset-password",
    "/about",
    "/api/documents/official-form",
    "/m",
    "/m/cases",
    "/m/cases/new",
    "/_next/static/x.js",
    "/favicon.ico",
    "/cases/new/extra",
  ])("対象外の %s は振り分けない", (pathname) => {
    expect(decide({ pathname })).toBeNull();
  });
  it("/cases/<id> は /m/cases/<id> へ（末尾スラッシュ可）", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(decide({ pathname: `/cases/${uuid}` })).toBe(`/m/cases/${uuid}`);
    expect(decide({ pathname: "/cases/abc_DEF-1/" })).toBe("/m/cases/abc_DEF-1");
    expect(decide({ pathname: "/cases/abc", method: "HEAD" })).toBe("/m/cases/abc");
  });
  it("/cases/new は従来どおり /m/cases/new（詳細の id としては扱わない）", () => {
    expect(decide({ pathname: "/cases/new" })).toBe("/m/cases/new");
  });
  it("/cases/<id> も view=pc・非 iPhone・POST では振り分けない", () => {
    const pathname = "/cases/abc";
    expect(decide({ pathname, viewCookie: "pc" })).toBeNull();
    for (const userAgent of [IPAD, ANDROID, PC, null, undefined]) expect(decide({ pathname, userAgent })).toBeNull();
    expect(decide({ pathname, method: "POST" })).toBeNull();
  });
  it("/m 配下へは決して振り分けない（ループしない）", () => {
    for (const p of ["/", "/cases", "/cases/new", "/cases/abc"]) {
      const to = decide({ pathname: p });
      expect(to).not.toBeNull();
      expect(decide({ pathname: to! })).toBeNull();
    }
  });
});

describe("decideDeviceRedirect（端末・Cookie・メソッド）", () => {
  it("iPad・Android・PC・UA 無しは振り分けない", () => {
    for (const userAgent of [IPAD, ANDROID, PC, null, undefined]) expect(decide({ userAgent })).toBeNull();
  });
  it("Cookie view=pc があれば振り分けない。他の値・無しなら振り分ける", () => {
    expect(decide({ viewCookie: "pc" })).toBeNull();
    expect(decide({ viewCookie: "m" })).toBe("/m/cases");
    expect(decide({ viewCookie: "" })).toBe("/m/cases");
    expect(decide({ viewCookie: undefined })).toBe("/m/cases");
  });
  it("GET・HEAD のみ。POST などは触らない", () => {
    expect(decide({ method: "HEAD" })).toBe("/m/cases");
    expect(decide({ method: "POST" })).toBeNull();
    expect(decide({ method: "OPTIONS" })).toBeNull();
  });
  it("行き先は固定値のみ（パスに行き先らしい文字列を混ぜても連結されない）", () => {
    expect(decide({ pathname: "//evil.example" })).toBeNull();
    expect(decide({ pathname: "/cases//evil.example" })).toBeNull();
    expect(decide({ pathname: "/__proto__" })).toBeNull();
    expect(decide({ pathname: "/constructor" })).toBeNull();
  });
});

describe("isRedirectablePath", () => {
  it("対応表のパスのみ true", () => {
    expect(isRedirectablePath("/")).toBe(true);
    expect(isRedirectablePath("/cases/new/")).toBe(true);
    expect(isRedirectablePath("/cases/1")).toBe(true);
    expect(isRedirectablePath("/cases/1/edit")).toBe(false);
    expect(isRedirectablePath("/m/cases")).toBe(false);
  });
});

describe("Cookie 文字列", () => {
  it("PC 版を選んだ Cookie は path=/・lax・1 年。secure は https のときのみ。httpOnly は付けない", () => {
    const http = desktopViewCookie(false);
    expect(http).toBe("view=pc; path=/; max-age=31536000; samesite=lax");
    expect(desktopViewCookie(true)).toBe(`${http}; secure`);
    expect(http).not.toMatch(/httponly/i);
  });
  it("消す Cookie は同じ path で max-age=0", () => {
    expect(clearViewCookie(false)).toBe("view=; path=/; max-age=0; samesite=lax");
    expect(clearViewCookie(true)).toContain("; secure");
  });
});
