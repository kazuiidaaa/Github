import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSections, ChoiceGroup, filterOptions, nextEnabledIndex, type ChoiceOption } from "../components/ChoiceGroup";
import { PROCEDURE_TYPES, RESIDENCE_STATUSES } from "../lib/types";

const few: ChoiceOption[] = [
  { value: "a", label: "あ" },
  { value: "b", label: "い" },
  { value: "c", label: "う", disabled: true },
];
const many: ChoiceOption[] = [
  ...["技術・人文知識・国際業務", "留学", "家族滞在"].map((v) => ({ value: v, label: v, group: "就労・学び", featured: v === "留学" })),
  ...["永住者", "定住者", "特定技能1号", "特定技能2号", "技能実習"].map((v) => ({ value: v, label: v, group: "その他" })),
];

function html(props: Partial<React.ComponentProps<typeof ChoiceGroup>> = {}, options = few): string {
  return renderToStaticMarkup(<ChoiceGroup legend="在留資格" options={options} value="" onChange={() => {}} {...props} />);
}

describe("ChoiceGroup の表示", () => {
  it("少数（6件以下）は、横並びのボタンで表示し、絞り込み欄を出さない", () => {
    const m = html();
    expect(m).toContain("<fieldset");
    expect(m).toContain("<legend");
    expect(m).toContain('role="radiogroup"');
    expect(m.match(/role="radio"/g)).toHaveLength(3);
    expect(m).not.toContain('type="search"');
    expect(m).toContain("flex flex-wrap");
  });

  it("多数（7件以上）は、見出し付きの一覧と絞り込み欄で表示し、よく使う項目を先頭に置く", () => {
    const m = html({}, many);
    expect(m).toContain('type="search"');
    expect(m.indexOf("よく使う項目")).toBeLessThan(m.indexOf("就労・学び"));
    expect(m.indexOf("就労・学び")).toBeLessThan(m.indexOf("その他"));
    expect(m).toContain("8件から選べます");
    // よく使う項目は、元の見出しに重ねて並べない
    expect(m.match(/role="radio"/g)).toHaveLength(8);
    expect(m).toContain("min-h-[44px]");
  });

  it("variant で表示の形を指定できる", () => {
    expect(html({ variant: "list" })).toContain('type="search"');
    expect(html({ variant: "segment" }, many)).not.toContain('type="search"');
    expect(html({ variant: "list", searchable: false })).not.toContain('type="search"');
  });

  it("選択中は aria-checked と図形（チェック）で示し、Tab の停止点は選択中だけにする", () => {
    const m = html({ value: "b" });
    expect(m.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(m.match(/tabindex="0"/g)).toHaveLength(1);
    expect(m).toMatch(/aria-checked="true"[^>]*tabindex="0"|tabindex="0"[^>]*aria-checked="true"/);
    expect(m.match(/<circle/g)).toHaveLength(1);
    expect(m).not.toContain("選択してください");
  });

  it("未選択は「選択してください」を示し、Tab の停止点は先頭の有効な項目にする", () => {
    const m = html();
    expect(m).toContain("選択してください");
    expect(m).not.toContain('aria-checked="true"');
    expect(m.match(/tabindex="0"/g)).toHaveLength(1);
  });

  it("無効化すると、全項目を無効にし、「選択してください」を出さない", () => {
    const m = html({ disabled: true, value: "a" });
    expect(m).toContain("<fieldset");
    expect(m).toContain("disabled");
    expect(m.match(/<button[^>]*disabled=""/g)).toHaveLength(3);
    expect(m).toContain('aria-disabled="true"');
    expect(m).not.toContain("選択してください");
  });

  it("個別に無効な項目は、押せない", () => {
    expect(html().match(/<button[^>]*disabled=""/g)).toHaveLength(1);
  });

  it("必須表示・説明文・エラー表示を出す。エラーがあるときは説明文より優先する", () => {
    const m = html({ required: true, hint: "例：留学", error: "選択してください（必須）" });
    expect(m).toContain("必須");
    expect(m).toContain('aria-required="true"');
    expect(m).toContain('aria-invalid="true"');
    expect(m).toContain("選択してください（必須）");
    expect(m).not.toContain("例：留学");
    expect(html({ hint: "例：留学" })).toContain("例：留学");
  });

  it("既存の選択肢（在留資格・手続の種類）の値をそのまま扱える", () => {
    const m = html(
      { value: RESIDENCE_STATUSES[0] },
      RESIDENCE_STATUSES.map((s) => ({ value: s, label: s })),
    );
    expect(m.match(/role="radio"/g)).toHaveLength(RESIDENCE_STATUSES.length);
    expect(m).toContain('aria-checked="true"');
    const p = html({}, PROCEDURE_TYPES.map((t) => ({ value: t.value, label: t.label })));
    expect(p.match(/role="radio"/g)).toHaveLength(PROCEDURE_TYPES.length);
  });
});

describe("ChoiceGroup のキーボード移動", () => {
  it("矢印キーで次・前へ移動し、無効な項目を飛ばし、端では反対側へ回る", () => {
    expect(nextEnabledIndex(few, 0, "ArrowRight")).toBe(1);
    expect(nextEnabledIndex(few, 1, "ArrowRight")).toBe(0);
    expect(nextEnabledIndex(few, 0, "ArrowLeft")).toBe(1);
    expect(nextEnabledIndex(few, 0, "ArrowDown")).toBe(1);
    expect(nextEnabledIndex(few, 1, "ArrowUp")).toBe(0);
  });
  it("Home・End で先頭・末尾の有効な項目へ移動する", () => {
    expect(nextEnabledIndex(few, 1, "Home")).toBe(0);
    expect(nextEnabledIndex(few, 0, "End")).toBe(1);
  });
  it("対象外のキーや、有効な項目がないときは、移動しない", () => {
    expect(nextEnabledIndex(few, 0, "a")).toBeNull();
    expect(nextEnabledIndex([], 0, "ArrowRight")).toBeNull();
    expect(nextEnabledIndex([{ value: "x", label: "x", disabled: true }], 0, "ArrowRight")).toBeNull();
  });
});

describe("ChoiceGroup の絞り込みと見出し", () => {
  it("項目名・説明・見出しで絞り込み、全角半角・大文字小文字・空白の違いを無視する", () => {
    expect(filterOptions(many, "").length).toBe(8);
    expect(filterOptions(many, "特定").map((o) => o.value)).toEqual(["特定技能1号", "特定技能2号"]);
    expect(filterOptions(many, "特定技能１号").map((o) => o.value)).toEqual(["特定技能1号"]);
    expect(filterOptions(many, " その他 ").length).toBe(5);
    expect(filterOptions(many, "存在しない語")).toEqual([]);
    expect(filterOptions([{ value: "x", label: "ABC" }], "abc")).toHaveLength(1);
  });
  it("よく使う項目を先頭にし、続けて見出しの初出順に並べる", () => {
    const s = buildSections(many);
    expect(s.map((x) => x.heading)).toEqual(["よく使う項目", "就労・学び", "その他"]);
    expect(s[0].options.map((o) => o.value)).toEqual(["留学"]);
    expect(s[1].options.map((o) => o.value)).toEqual(["技術・人文知識・国際業務", "家族滞在"]);
  });
  it("見出しのない項目は、見出しなしの組として末尾に置く", () => {
    const s = buildSections([...many, { value: "z", label: "Z" }]);
    expect(s[s.length - 1].heading).toBe("");
  });
});

describe("ChoiceGroup の「未選択に戻す」（任意の引数 onClear）", () => {
  it("onClear を指定しない既存の呼び出しは、ボタンも読み上げ領域も出さない", () => {
    const m = html({ value: "a" });
    expect(m).not.toContain("未選択に戻す");
    expect(m).not.toContain('role="status"');
  });
  it("onClear があり、選択中のときだけ、ボタンを出す。文言は変えられる", () => {
    expect(html({ value: "a", onClear: () => {} })).toContain("未選択に戻す");
    expect(html({ value: "a", onClear: () => {}, clearLabel: "解除する" })).toContain("解除する");
    expect(html({ value: "", onClear: () => {} })).not.toContain("未選択に戻す");
  });
  it("無効のときは、選択中でも出さない", () => {
    expect(html({ value: "a", disabled: true, onClear: () => {} })).not.toContain("未選択に戻す");
  });
  it("項目の選択状態（aria-checked・Tab の停止点）は変わらない", () => {
    const m = html({ value: "a", onClear: () => {} });
    expect(m.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(m.match(/role="radio"/g)).toHaveLength(3);
  });
});
