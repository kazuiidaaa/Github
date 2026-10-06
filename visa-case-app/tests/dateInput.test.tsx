import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DateField } from "../components/DateField";
import { dateValueToText, normalizeDateText, parseDateText } from "../lib/dateInput";

describe("normalizeDateText", () => {
  it("数字だけの入力に、区切りを自動で入れる", () => {
    expect(normalizeDateText("2000")).toBe("2000");
    expect(normalizeDateText("20000")).toBe("2000/0");
    expect(normalizeDateText("200001")).toBe("2000/01");
    expect(normalizeDateText("2000013")).toBe("2000/01/3");
    expect(normalizeDateText("20000131")).toBe("2000/01/31");
    expect(normalizeDateText("200001319")).toBe("2000/01/31");
  });
  it("全角数字・全角の区切りを半角に直す", () => {
    expect(normalizeDateText("２０００／０１／３１")).toBe("2000/01/31");
    expect(normalizeDateText("２０００１２３１")).toBe("2000/12/31");
    expect(normalizeDateText("2000-01-31")).toBe("2000/01/31");
    expect(normalizeDateText("2000年1月3日")).toBe("2000/1/3");
  });
  it("自動で入れた区切りのあとに続けた数字を失わない", () => {
    expect(normalizeDateText("2000/013")).toBe("2000/01/3");
    expect(normalizeDateText("2000/01/313")).toBe("2000/01/31");
  });
  it("文字や余分な区切りは取り除く", () => {
    expect(normalizeDateText("abc")).toBe("");
    expect(normalizeDateText("//2000//01")).toBe("2000/01");
  });
});

describe("parseDateText", () => {
  it("空欄・途中・完成を区別する", () => {
    expect(parseDateText("")).toEqual({ kind: "empty" });
    expect(parseDateText("2000/01")).toEqual({ kind: "incomplete" });
    expect(parseDateText("2000/01/")).toEqual({ kind: "incomplete" });
    expect(parseDateText("2000/01/31")).toEqual({ kind: "complete", iso: "2000-01-31", valid: true });
  });
  it("月・日が1桁でも、YYYY-MM-DD にそろえる", () => {
    expect(parseDateText("2000/1/3")).toEqual({ kind: "complete", iso: "2000-01-03", valid: true });
  });
  it("うるう年を判定する", () => {
    expect(parseDateText("2024/02/29")).toMatchObject({ valid: true });
    expect(parseDateText("2023/02/29")).toMatchObject({ valid: false });
    expect(parseDateText("2000/02/29")).toMatchObject({ valid: true });
    expect(parseDateText("1900/02/29")).toMatchObject({ valid: false });
  });
  it("月末と、存在しない日付を判定する", () => {
    expect(parseDateText("2025/04/30")).toMatchObject({ valid: true });
    expect(parseDateText("2025/04/31")).toMatchObject({ valid: false });
    expect(parseDateText("2025/02/30")).toMatchObject({ valid: false });
    expect(parseDateText("2025/13/01")).toMatchObject({ valid: false });
    expect(parseDateText("2025/00/10")).toMatchObject({ valid: false });
  });
  it("全角数字を受け付ける", () => {
    expect(parseDateText("２０２５／０４／３０")).toEqual({ kind: "complete", iso: "2025-04-30", valid: true });
  });
});

describe("dateValueToText", () => {
  it("保存形式を、スラッシュ区切りで出す", () => {
    expect(dateValueToText("2000-01-31")).toBe("2000/01/31");
    expect(dateValueToText("")).toBe("");
  });
});

describe("DateField の表示", () => {
  it("数字キーボード用の属性と、保存済みの値を出す", () => {
    const m = renderToStaticMarkup(<DateField id="d" value="2000-01-31" onChange={() => {}} />);
    expect(m).toContain('inputMode="numeric"');
    expect(m).toContain('value="2000/01/31"');
    expect(m).toContain('type="text"');
    expect(m).not.toContain("role=\"alert\"");
  });
  it("存在しない日付が入っているときは、案内を出す", () => {
    const m = renderToStaticMarkup(<DateField value="2025-02-30" onChange={() => {}} />);
    expect(m).toContain('role="alert"');
    expect(m).toContain('aria-invalid="true"');
  });
  it("呼び出し側の誤りの文言を、優先して出す", () => {
    const m = renderToStaticMarkup(<DateField value="" error="生年月日を入力してください。" onChange={() => {}} />);
    expect(m).toContain("生年月日を入力してください。");
  });
  it("無効化と aria-label を引き継ぐ", () => {
    const m = renderToStaticMarkup(<DateField value="" disabled aria-label="期限" onChange={() => {}} />);
    expect(m).toContain("disabled");
    expect(m).toContain('aria-label="期限"');
  });
});
