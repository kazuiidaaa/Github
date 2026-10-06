import { describe, expect, it } from "vitest";
import { decideFill, normalizePostalCode, postalCodeState, toPostalDigits } from "../lib/postalCode";

// 郵便番号は、公共施設のもの（100-8924 は、千代田区の公共施設宛）を使う。

describe("郵便番号の正規化と状態", () => {
  it("ハイフン・空白・全角数字を取り除いて、半角の数字にする", () => {
    expect(normalizePostalCode("100-8924")).toBe("1008924");
    expect(normalizePostalCode("１００－８９２４")).toBe("1008924");
    expect(normalizePostalCode(" 100 8924 ")).toBe("1008924");
  });
  it("各種のハイフン・長音記号を取り除く", () => {
    for (const dash of ["-", "‐", "‑", "–", "—", "−", "－", "ー", "ｰ", "―"]) {
      expect(normalizePostalCode(`100${dash}0004`)).toBe("1000004");
    }
    expect(normalizePostalCode("1000004")).toBe("1000004");
  });
  it("6桁・8桁・空・数字以外を含む入力は、7桁として扱わない（API を呼ばない）", () => {
    expect(toPostalDigits("100000")).toBeNull();
    expect(toPostalDigits("100-00045")).toBeNull();
    expect(toPostalDigits("")).toBeNull();
    expect(toPostalDigits("100-000a")).toBeNull();
    expect(toPostalDigits("１００ー０００４")).toBe("1000004");
  });
  it("空・入力途中・7桁・不正を区別する", () => {
    expect(postalCodeState("")).toBe("empty");
    expect(postalCodeState("100")).toBe("partial");
    expect(postalCodeState("100-89")).toBe("partial");
    expect(postalCodeState("100-8924")).toBe("complete");
    expect(postalCodeState("10089245")).toBe("invalid");
    expect(postalCodeState("100a924")).toBe("invalid");
  });
  it("7桁のときだけ、数字を返す", () => {
    expect(toPostalDigits("100-8924")).toBe("1008924");
    expect(toPostalDigits("100-89")).toBeNull();
    expect(toPostalDigits("abc")).toBeNull();
  });
});

describe("見つかった住所の扱い", () => {
  it("未入力なら入れる", () => {
    expect(decideFill("", "東京都千代田区千代田")).toBe("fill");
    expect(decideFill("   ", "東京都千代田区千代田")).toBe("fill");
  });
  it("入力済みなら、確認を挟む", () => {
    expect(decideFill("大阪府大阪市", "東京都千代田区千代田")).toBe("confirm");
  });
  it("すでに含まれていれば、何もしない", () => {
    expect(decideFill("東京都千代田区千代田1-1", "東京都千代田区千代田")).toBe("same");
  });
});
