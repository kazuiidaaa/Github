import { describe, expect, it } from "vitest";
import { describeCoeForm, resolveCoeForm } from "./hspForm";

describe("resolveCoeForm", () => {
  it.each([
    ["高度専門職（1号イ）", "教授", "I"],
    ["高度専門職（1号イ）", "研究", "N"],
    ["高度専門職（1号ロ）", "企業内転勤", "L"],
    ["高度専門職（1号ロ）", "技術・人文知識・国際業務", "N"],
    ["高度専門職（1号ロ）", "法律・会計業務", "U"],
    ["高度専門職（1号ロ）", "医療", "U"],
    ["高度専門職（1号ハ）", "経営・管理", "M"],
    ["高度専門職（1号ハ）", "法律・会計業務", "U"],
  ])("%s × %s は様式 %s", (grade, activity, form) => {
    expect(resolveCoeForm(grade, activity)).toEqual({ kind: "resolved", form });
  });

  it("表にない組み合わせは、推測せず、特定できないとする", () => {
    const r = resolveCoeForm("高度専門職（1号ハ）", "医療");
    expect(r.kind).toBe("unknown");
    expect(describeCoeForm(r)).toContain("様式を特定できません");
  });

  it("号が未選択、行う活動が未選択、高度専門職以外を区別する", () => {
    expect(resolveCoeForm("高度専門職", "教授").kind).toBe("grade_missing");
    expect(resolveCoeForm("高度専門職（1号イ）", "").kind).toBe("activity_missing");
    expect(resolveCoeForm("技術・人文知識・国際業務", "教授").kind).toBe("not_applicable");
    expect(describeCoeForm({ kind: "not_applicable" })).toBe("");
  });
});
