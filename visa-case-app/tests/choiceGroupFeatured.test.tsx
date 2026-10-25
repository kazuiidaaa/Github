import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSections, ChoiceGroup, type ChoiceOption } from "../components/ChoiceGroup";

const many: ChoiceOption[] = [
  ...["技術・人文知識・国際業務", "留学", "家族滞在"].map((v) => ({ value: v, label: v, group: "就労・学び", featured: v === "留学" })),
  ...["永住者", "定住者", "特定技能1号", "特定技能2号", "技能実習"].map((v) => ({ value: v, label: v, group: "その他" })),
];

function html(props: Partial<React.ComponentProps<typeof ChoiceGroup>> = {}, options = many): string {
  return renderToStaticMarkup(<ChoiceGroup legend="在留資格" options={options} value="" onChange={() => {}} {...props} />);
}

describe("featuredInGroups（よく使う項目を近道として重ねる）", () => {
  it("既定は、よく使う項目を元の見出しに重ねない", () => {
    const s = buildSections(many);
    expect(s.map((x) => x.options.length)).toEqual([1, 2, 5]);
    expect(s[0].shortcut).toBeFalsy();
  });
  it("指定すると、近道（shortcut）として先頭に置き、見出しの中にも全項目を残す。featuredOrder で近道の並びを決める", () => {
    const opts: ChoiceOption[] = many.map((o) => (o.value === "家族滞在" ? { ...o, featured: true, featuredOrder: 0 } : o.featured ? { ...o, featuredOrder: 1 } : o));
    const s = buildSections(opts, "よく使う項目", true);
    expect(s[0].shortcut).toBe(true);
    expect(s[0].options.map((o) => o.value)).toEqual(["家族滞在", "留学"]);
    expect(s.slice(1).flatMap((x) => x.options)).toHaveLength(many.length);
  });
  it("画面では、近道はラジオに数えず（aria-pressed）、選択中はラジオ側の 1 つだけが aria-checked になる", () => {
    const m = html({ featuredInGroups: true, value: "留学" });
    expect(m.match(/role="radio"/g)).toHaveLength(8);
    expect(m.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(m.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(m).toContain("選択中：留学");
  });
});
