import { describe, expect, it } from "vitest";
import { checkFullName, FULL_NAME_MAX, readFullName } from "../lib/accountName";
import { CATALOG } from "../lib/i18n/messages";

describe("氏名の読み取りと検査", () => {
  it("user_metadata.full_name を取り出す。未登録・文字以外・空白のみは空文字", () => {
    expect(readFullName({ full_name: "  試験 太郎 " })).toBe("試験 太郎");
    expect(readFullName({})).toBe("");
    expect(readFullName(undefined)).toBe("");
    expect(readFullName(null)).toBe("");
    expect(readFullName({ full_name: 5 })).toBe("");
    expect(readFullName({ full_name: "　 " })).toBe("");
  });
  it("前後の空白（全角を含む）を取り除く", () => {
    expect(checkFullName("　Test User ")).toEqual({ ok: true, value: "Test User" });
  });
  it("空・制御文字・長すぎる入力は受け付けない", () => {
    expect(checkFullName("  ")).toEqual({ ok: false, reason: "empty" });
    expect(checkFullName("a\nb")).toEqual({ ok: false, reason: "control" });
    expect(checkFullName("a".repeat(FULL_NAME_MAX))).toMatchObject({ ok: true });
    expect(checkFullName("a".repeat(FULL_NAME_MAX + 1))).toEqual({ ok: false, reason: "tooLong" });
  });
  it("mobileAccount の文言は ja/en/ko でキーが揃う", () => {
    const ja = Object.keys(CATALOG.mobileAccount.ja).sort();
    expect(Object.keys(CATALOG.mobileAccount.en).sort()).toEqual(ja);
    expect(Object.keys(CATALOG.mobileAccount.ko).sort()).toEqual(ja);
  });
});
