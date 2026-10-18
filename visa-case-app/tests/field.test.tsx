import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DateField } from "../components/DateField";
import { Field, inputClass, mergeDescribedBy } from "../components/ui";
import { translate } from "../lib/i18n/translate";

// Issue #392（人の決定）：必須は文字のラベルで示し、誤りの文は aria-describedby で入力欄に結び付ける
describe("Field", () => {
  it("必須は「*」ではなく「必須」の文字で示す（英語・韓国語の訳もある）", () => {
    const m = renderToStaticMarkup(
      <Field label="氏名" required>
        <input className={inputClass} />
      </Field>,
    );
    expect(m).toContain("必須");
    expect(m).not.toContain(">*<");
    expect(translate("en", "input.field_required")).toBe("Required");
    expect(translate("ko", "input.field_required")).toBe("필수");
  });

  it("必須でなければ、ラベルを出さない", () => {
    const m = renderToStaticMarkup(
      <Field label="メモ">
        <textarea />
      </Field>,
    );
    expect(m).not.toContain("必須");
  });

  it("誤りがあれば、誤りの文の id を aria-describedby に入れ、aria-invalid を付ける（子の id から作る）", () => {
    const m = renderToStaticMarkup(
      <Field label="氏名" required error="入力してください" hint="説明">
        <input id="applicant-name" />
      </Field>,
    );
    expect(m).toContain('id="applicant-name"');
    expect(m).toContain('aria-describedby="applicant-name-error"');
    expect(m).toContain('aria-invalid="true"');
    expect(m).toContain('<span id="applicant-name-error"');
    expect(m).not.toContain("説明");
  });

  it("子に id が無くても、Field の中で安定した id を作って結び付ける", () => {
    const m = renderToStaticMarkup(
      <Field label="氏名" error="入力してください">
        <input />
      </Field>,
    );
    const ref = m.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(ref).toMatch(/-error$/);
    expect(m).toContain(`id="${ref}"`);
  });

  it("説明だけのときは、説明の文を結び付け、aria-invalid は付けない", () => {
    const m = renderToStaticMarkup(
      <Field label="案件名" hint="例：山田様">
        <input id="case-name" />
      </Field>,
    );
    expect(m).toContain('aria-describedby="case-name-hint"');
    expect(m).toContain('id="case-name-hint"');
    expect(m).not.toContain("aria-invalid");
  });

  it("呼び出し側の aria-describedby は残し、後ろに加える（上書きしない）", () => {
    const m = renderToStaticMarkup(
      <Field label="氏名" error="入力してください">
        <input id="x" aria-describedby="own-note" />
      </Field>,
    );
    expect(m).toContain('aria-describedby="own-note x-error"');
  });

  it("誤りも説明も無ければ、aria-describedby・aria-invalid を足さない", () => {
    const m = renderToStaticMarkup(
      <Field label="氏名">
        <input id="x" />
      </Field>,
    );
    expect(m).not.toContain("aria-describedby");
    expect(m).not.toContain("aria-invalid");
  });

  it("DateField など独自の部品には触らない（自分で結び付ける）", () => {
    const m = renderToStaticMarkup(
      <Field label="生年月日" required hint="説明">
        <DateField id="dob" value="" onChange={() => {}} />
      </Field>,
    );
    expect(m).not.toContain("dob-hint\"");
    expect(m).toContain("説明");
  });

  it("mergeDescribedBy は空を除き、重複をまとめる", () => {
    expect(mergeDescribedBy(undefined, "")).toBeUndefined();
    expect(mergeDescribedBy("a b", "b", "c")).toBe("a b c");
  });
});
