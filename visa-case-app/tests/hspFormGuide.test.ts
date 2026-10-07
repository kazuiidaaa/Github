import { describe, expect, it } from "vitest";
import { resolveChangeForm, resolveRenewalForm } from "@/lib/hspForm";
import { describeHspForm, hspActivityHintKey, hspStatusOf } from "@/lib/hspFormGuide";
import { translate } from "@/lib/i18n/translate";

describe("describeHspForm（手続ごとの案内文）", () => {
  const tFor = (lang: "ja" | "en" | "ko") => (k: Parameters<typeof translate>[1], p?: Record<string, string | number>) => translate(lang, k, p);

  it("日本語：手続ごとに、使う様式の案内が変わる", () => {
    expect(describeHspForm({ kind: "resolved", form: "U" }, "coe")).toBe("使う様式：様式 U");
    expect(describeHspForm({ kind: "resolved", form: "U" }, "change")).toBe("変更許可申請書で使う様式：様式 U");
    expect(describeHspForm({ kind: "resolved", form: "U" }, "renewal")).toBe("更新許可申請書で使う様式：様式 U");
    expect(describeHspForm({ kind: "no_renewal", grade: "高度専門職（2号）" }, "renewal")).toBe("2号に更新はありません。");
    expect(describeHspForm({ kind: "not_applicable" }, "change")).toBe("");
  });

  it("更新の号の未選択は、「現在の在留資格」を案内する", () => {
    expect(describeHspForm(resolveRenewalForm("高度専門職", "教授"), "renewal")).toContain("現在の在留資格");
    expect(describeHspForm(resolveChangeForm("高度専門職", "教授"), "change")).toContain("希望する在留資格");
  });

  it("英語・韓国語は、日本語の文言を返さない", () => {
    const res = [
      resolveChangeForm("高度専門職（1号イ）", "教授"),
      resolveRenewalForm("高度専門職（2号）", ""),
      resolveRenewalForm("高度専門職", ""),
      resolveChangeForm("高度専門職（1号ロ）", ""),
      resolveChangeForm("高度専門職（1号イ）", "医療"),
    ];
    for (const lang of ["en", "ko"] as const) {
      for (const r of res)
        for (const p of ["coe", "change", "renewal"] as const) {
          // 号・行う活動の値は、法令用語のため訳さずそのまま差し込む（文言の部分だけを確認する）
          const text = r.kind === "unknown" ? describeHspForm(r, p, tFor(lang)).replace(r.grade, "").replace(r.activity, "") : describeHspForm(r, p, tFor(lang));
          expect(text, `${lang} ${r.kind} ${p}`).not.toMatch(/[぀-ヿ一-鿿]/);
        }
      for (const p of ["coe", "change", "renewal"] as const) expect(tFor(lang)(hspActivityHintKey(p))).not.toMatch(/[぀-ヿ]/);
    }
  });

  it("号を取る欄は、更新が現在の在留資格、他が希望（変更後）の在留資格", () => {
    const c = { currentStatus: "現", targetStatus: "後" };
    expect([hspStatusOf("renewal", c), hspStatusOf("change", c), hspStatusOf("coe", c)]).toEqual(["現", "後", "後"]);
  });
});
