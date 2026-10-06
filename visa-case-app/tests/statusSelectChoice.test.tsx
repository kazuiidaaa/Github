import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FEATURED_RESIDENCE_STATUSES, gradeOptions, PROCEDURE_OPTIONS, procedureDescription, residenceStatusOptions, StatusSelect } from "../components/StatusSelect";
import { buildSections } from "../components/ChoiceGroup";
import { ADVANCED_PROFESSIONAL_GRADE_2, PROCEDURE_TYPES, RESIDENCE_STATUSES } from "../lib/types";

function html(props: Partial<React.ComponentProps<typeof StatusSelect>> = {}): string {
  return renderToStaticMarkup(<StatusSelect value="" onChange={() => {}} {...props} />);
}

describe("在留資格の選択肢（Issue #214）", () => {
  it("よく使う項目が先頭に並び、残りは「その他」にまとまり、全29項目が1度ずつ出る", () => {
    const sections = buildSections(residenceStatusOptions());
    expect(sections.map((s) => s.heading)).toEqual(["よく使う項目", "その他"]);
    expect(sections[0].options.map((o) => o.value)).toEqual(FEATURED_RESIDENCE_STATUSES);
    const all = sections.flatMap((s) => s.options.map((o) => o.value));
    expect([...all].sort()).toEqual([...RESIDENCE_STATUSES].sort());
  });

  it("よく使う項目は、実在する在留資格だけである", () => {
    for (const s of FEATURED_RESIDENCE_STATUSES) expect(RESIDENCE_STATUSES as readonly string[]).toContain(s);
  });

  it("保存値は、在留資格の文字列そのままである", () => {
    expect(residenceStatusOptions().every((o) => o.value === o.label)).toBe(true);
  });

  it("画面は、絞り込み欄と選択ボタンを出し、プルダウンは出さない", () => {
    const m = html();
    expect(m).toContain('type="search"');
    expect(m).not.toContain("<select");
    expect(m.match(/role="radio"/g)).toHaveLength(RESIDENCE_STATUSES.length);
  });
});

describe("過去の自由入力の値（legacy）", () => {
  it("選択肢に残し、選択中として表示する", () => {
    const m = html({ value: "旧・自由入力の値" });
    expect(m).toContain("旧・自由入力の値（登録済みの入力）");
    expect(m.match(/aria-checked="true"/g)).toHaveLength(1);
  });
  it("現在の在留資格のときは、出さない", () => {
    expect(html({ value: "留学" })).not.toContain("登録済みの入力");
  });
});

describe("無効化（disabled）", () => {
  it("すべてのボタンと絞り込み欄を無効にする", () => {
    const m = html({ value: "留学", disabled: true });
    expect(m.match(/<button[^>]*disabled=""/g)).toHaveLength(RESIDENCE_STATUSES.length);
    expect(m).toMatch(/<input[^>]*disabled=""/);
  });
  it("号の選択も無効にする", () => {
    const m = html({ value: "高度専門職", withGrade: true, disabled: true });
    expect(m.match(/<button[^>]*disabled=""/g)).toHaveLength(RESIDENCE_STATUSES.length + 3);
  });
});

describe("高度専門職の号の表示条件", () => {
  const gradeLegend = "高度専門職の号";
  it("withGrade でないときは、高度専門職でも出さない", () => {
    expect(html({ value: "高度専門職" })).not.toContain(gradeLegend);
  });
  it("withGrade でも、高度専門職以外では出さない", () => {
    expect(html({ value: "留学", withGrade: true })).not.toContain(gradeLegend);
  });
  it("高度専門職を選ぶと、1号イ・ロ・ハを出し、未選択でも保存できる旨を示す", () => {
    const m = html({ value: "高度専門職", withGrade: true });
    expect(m).toContain(gradeLegend);
    for (const g of ["1号イ", "1号ロ", "1号ハ"]) expect(m).toContain(`高度専門職（${g}）`);
    expect(m).not.toContain(ADVANCED_PROFESSIONAL_GRADE_2);
    expect(m).toContain("未選択でも保存できます");
  });
  it("号つきの値は、在留資格では高度専門職が選択中で、号が選択中になる", () => {
    const m = html({ value: "高度専門職（1号ロ）", withGrade: true });
    expect(m.match(/aria-checked="true"/g)).toHaveLength(2);
  });
  it("2号は、allowGrade2 のとき、または保存済みのときだけ出す", () => {
    expect(html({ value: "高度専門職", withGrade: true, allowGrade2: true })).toContain(ADVANCED_PROFESSIONAL_GRADE_2);
    expect(html({ value: ADVANCED_PROFESSIONAL_GRADE_2, withGrade: true })).toContain(ADVANCED_PROFESSIONAL_GRADE_2);
    expect(gradeOptions(false).map((o) => o.value)).not.toContain(ADVANCED_PROFESSIONAL_GRADE_2);
    expect(gradeOptions(true)).toHaveLength(4);
  });
});

describe("手続種別", () => {
  it("全種類を、値そのままの選択肢にする（横並びのボタンになる件数）", () => {
    expect(PROCEDURE_OPTIONS.map((o) => o.value)).toEqual(PROCEDURE_TYPES.map((p) => p.value));
    expect(PROCEDURE_OPTIONS.length).toBeLessThanOrEqual(6);
  });
  it("説明文は、選択後のものを返し、未選択では返さない", () => {
    expect(procedureDescription("renewal")).toBe(PROCEDURE_TYPES[0].description);
    expect(procedureDescription("")).toBeUndefined();
  });
});

describe("高度専門職の号を未選択へ戻す（Issue #214 追加対応）", () => {
  const clear = "号を未選択に戻す";
  it("号が選ばれているときだけ、「未選択に戻す」ボタンを出す", () => {
    expect(html({ value: "高度専門職（1号ロ）", withGrade: true })).toContain(clear);
    expect(html({ value: ADVANCED_PROFESSIONAL_GRADE_2, withGrade: true })).toContain(clear);
  });
  it("未選択のときは出さず、「選択してください」を示す", () => {
    const m = html({ value: "高度専門職", withGrade: true });
    expect(m).not.toContain(clear);
    expect(m).toContain("選択してください");
  });
  it("無効のときは出さない（解除できない）", () => {
    expect(html({ value: "高度専門職（1号イ）", withGrade: true, disabled: true })).not.toContain(clear);
  });
  it("号の欄がない場合（在留資格だけ）には出さない", () => {
    expect(html({ value: "留学", withGrade: true })).not.toContain(clear);
    expect(html({ value: "高度専門職（1号イ）" })).not.toContain(clear);
  });
  it("号の欄は必須ではない（必須の表示を出さない）", () => {
    const m = html({ value: "高度専門職（1号イ）", withGrade: true });
    const grade = m.slice(m.indexOf("高度専門職の号"));
    expect(grade).not.toContain("必須");
    expect(grade).not.toContain("aria-required");
  });
  it("解除は、通常のボタンである（Tab で止まり、Space・Enter で押せる）。ラジオの項目にはしない", () => {
    const m = html({ value: "高度専門職（1号イ）", withGrade: true });
    expect(m).toMatch(/<button type="button"[^>]*>号を未選択に戻す<\/button>/);
    // ラジオは、在留資格 29 件と号 3 件のまま
    expect(m.match(/role="radio"/g)).toHaveLength(RESIDENCE_STATUSES.length + 3);
  });
  it("結果を読み上げるための領域（role=status）を出す", () => {
    expect(html({ value: "高度専門職（1号イ）", withGrade: true })).toMatch(/<p role="status" class="sr-only"><\/p>/);
  });
});
