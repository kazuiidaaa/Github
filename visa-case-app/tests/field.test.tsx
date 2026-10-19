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

  it("DateField は、Field の説明の文を aria-describedby で結び付ける（呼び出し側の値も残す）", () => {
    const m = renderToStaticMarkup(
      <Field label="生年月日" required hint="説明">
        <DateField id="dob" value="" onChange={() => {}} aria-describedby="note" />
      </Field>,
    );
    expect(m).toContain('id="dob-hint"');
    expect(m).toContain('aria-describedby="note dob-hint"');
    expect(m).toContain("説明");
    expect(m).not.toContain("aria-invalid");
  });

  it("DateField は、説明の文と自分の誤りの文の両方を結び付ける", () => {
    const m = renderToStaticMarkup(
      <Field label="生年月日" hint="説明">
        <DateField id="dob" value="" onChange={() => {}} error="日付が正しくありません" />
      </Field>,
    );
    const describedBy = m.match(/aria-describedby="([^"]+)"/)?.[1].split(" ") ?? [];
    expect(describedBy[0]).toBe("dob-hint");
    expect(describedBy).toHaveLength(2);
    expect(m).toContain(`id="${describedBy[1]}"`);
    expect(m).toContain('aria-invalid="true"');
  });

  it("印の無い独自の部品には触らない", () => {
    const Custom = (p: { id?: string; "aria-describedby"?: string }) => <input id={p.id} aria-describedby={p["aria-describedby"]} />;
    const m = renderToStaticMarkup(
      <Field label="名前" hint="説明">
        <Custom id="c" />
      </Field>,
    );
    expect(m).not.toContain("aria-describedby");
  });

  it("mergeDescribedBy は空を除き、重複をまとめる", () => {
    expect(mergeDescribedBy(undefined, "")).toBeUndefined();
    expect(mergeDescribedBy("a b", "b", "c")).toBe("a b c");
  });
});
