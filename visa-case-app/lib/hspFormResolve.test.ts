import { describe, expect, it } from "vitest";
import { HSP_ACTIVITIES, HSP_CHANGE_FORM_TABLE, resolveChangeForm, resolveRenewalForm } from "./hspForm";

// 変更・更新の様式の決定（Issue #212）。変更は変更後の在留資格、更新は現在の在留資格で号を決める。

const ENTRIES = Object.entries(HSP_CHANGE_FORM_TABLE).map(([key, form]) => {
  const [grade, activity] = key.split("|");
  return { grade, activity, form };
});

describe("1号（表の8組）", () => {
  it("表は、1号の8つの組み合わせである", () => {
    expect(ENTRIES).toHaveLength(8);
  });

  it.each(ENTRIES)("$grade・$activity は、変更も更新も様式 $form", ({ grade, activity, form }) => {
    expect(resolveChangeForm(grade, activity)).toEqual({ kind: "resolved", form });
    expect(resolveRenewalForm(grade, activity)).toEqual({ kind: "resolved", form });
  });

  it("前後の空白は無視する", () => {
    expect(resolveChangeForm(" 高度専門職（1号イ） ", " 教授 ")).toEqual({ kind: "resolved", form: "I" });
    expect(resolveRenewalForm(" 高度専門職（1号ハ） ", " 経営・管理 ")).toEqual({ kind: "resolved", form: "M" });
  });
});

describe("2号", () => {
  it.each(HSP_ACTIVITIES)("変更は、活動だけで様式を引く（%s）", (activity) => {
    const r = resolveChangeForm("高度専門職（2号）", activity);
    expect(r.kind).toBe("resolved");
  });

  it("変更の2号は、活動が1号の表のどの組にもあれば、その様式（教授→I・研究→N・企業内転勤→L・技人国→N・法律・会計／医療→U・経営・管理→M）", () => {
    const g2 = (a: string) => resolveChangeForm("高度専門職（2号）", a);
    expect(g2("教授")).toEqual({ kind: "resolved", form: "I" });
    expect(g2("研究")).toEqual({ kind: "resolved", form: "N" });
    expect(g2("企業内転勤")).toEqual({ kind: "resolved", form: "L" });
    expect(g2("技術・人文知識・国際業務")).toEqual({ kind: "resolved", form: "N" });
    expect(g2("法律・会計業務")).toEqual({ kind: "resolved", form: "U" });
    expect(g2("医療")).toEqual({ kind: "resolved", form: "U" });
    expect(g2("経営・管理")).toEqual({ kind: "resolved", form: "M" });
  });

  it("変更の2号で、活動が未選択なら activity_missing、表にない活動なら unknown", () => {
    expect(resolveChangeForm("高度専門職（2号）", "")).toEqual({ kind: "activity_missing" });
    expect(resolveChangeForm("高度専門職（2号）", "芸術")).toEqual({ kind: "unknown", grade: "高度専門職（2号）", activity: "芸術" });
  });

  it("更新の2号は、活動にかかわらず no_renewal", () => {
    for (const activity of ["", "教授", "芸術"]) {
      expect(resolveRenewalForm("高度専門職（2号）", activity)).toEqual({ kind: "no_renewal", grade: "高度専門職（2号）" });
    }
  });
});

describe("未選択・表にない組み合わせ・対象外", () => {
  it.each([resolveChangeForm, resolveRenewalForm])("号が未選択（号なしの高度専門職）は grade_missing", (resolve) => {
    expect(resolve("高度専門職", "教授")).toEqual({ kind: "grade_missing" });
  });

  it.each([resolveChangeForm, resolveRenewalForm])("活動が未選択は activity_missing", (resolve) => {
    expect(resolve("高度専門職（1号イ）", "")).toEqual({ kind: "activity_missing" });
    expect(resolve("高度専門職（1号イ）", "  ")).toEqual({ kind: "activity_missing" });
  });

  it.each([resolveChangeForm, resolveRenewalForm])("表にない組み合わせは unknown（他の様式を推測しない）", (resolve) => {
    expect(resolve("高度専門職（1号イ）", "医療")).toEqual({ kind: "unknown", grade: "高度専門職（1号イ）", activity: "医療" });
    expect(resolve("高度専門職（1号ハ）", "教授")).toEqual({ kind: "unknown", grade: "高度専門職（1号ハ）", activity: "教授" });
  });

  it.each([resolveChangeForm, resolveRenewalForm])("高度専門職ではない在留資格は、活動にかかわらず not_applicable", (resolve) => {
    expect(resolve("技術・人文知識・国際業務", "教授")).toEqual({ kind: "not_applicable" });
    expect(resolve("経営・管理", "経営・管理")).toEqual({ kind: "not_applicable" });
    expect(resolve("", "")).toEqual({ kind: "not_applicable" });
  });
});
