import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusPickerBody, StatusPickerRow } from "../components/mobile/StatusPickerRow";
import { FEATURED_RESIDENCE_STATUSES, residenceStatusOptions } from "../components/StatusSelect";
import { RESIDENCE_STATUSES } from "../lib/types";

const noop = () => {};
const options = residenceStatusOptions();

const row = (props: Partial<React.ComponentProps<typeof StatusPickerRow>> = {}) =>
  renderToStaticMarkup(
    <ul>
      <StatusPickerRow id="x" label="現在の在留資格" options={options} value="" onChange={noop} placeholder="選択してください" {...props} />
    </ul>,
  );
const body = (props: Partial<React.ComponentProps<typeof StatusPickerBody>> = {}) =>
  renderToStaticMarkup(<StatusPickerBody label="現在の在留資格" options={options} value="" query="" onQuery={noop} onPick={noop} {...props} />);

describe("StatusPickerRow（iPhone 版の在留資格の行）", () => {
  it("未選択は案内の文字、選択後は在留資格名を右に出す。押せる範囲は 44pt 以上", () => {
    expect(row()).toContain("選択してください");
    const m = row({ value: "留学" });
    expect(m).toContain("留学");
    expect(m).toContain("min-h-[44px]");
    expect(m).toContain('aria-haspopup="dialog"');
  });
  it("見出しで現在と変更後を区別し、必須の印と説明を出す", () => {
    const m = row({ label: "変更後の在留資格", required: true, hint: "変更後の説明" });
    expect(m).toContain("変更後の在留資格");
    expect(m).toContain("必須");
    expect(m).toContain("変更後の説明");
  });
  it("閉じている間はシートを出さない。長い値は切り詰めず折り返す", () => {
    const m = row({ value: "技術・人文知識・国際業務" });
    expect(m).not.toContain('role="dialog"');
    expect(m).toContain("break-words");
    expect(m).not.toContain("truncate");
  });
});

describe("StatusPickerBody（シートの中身）", () => {
  it("絞り込み欄と、よく使う項目、2つのまとまりの見出しを順に出す", () => {
    const m = body();
    expect(m).toContain('type="search"');
    const at = ["よく使う項目", "活動内容に応じた在留資格", "身分や地位に応じた在留資格"].map((h) => m.indexOf(h));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(m).toContain(`${RESIDENCE_STATUSES.length}件から選べます`);
    // 行は、よく使う項目の分も含めて、すべて44pt以上のボタン
    expect(m.match(/<button/g)).toHaveLength(FEATURED_RESIDENCE_STATUSES.length + RESIDENCE_STATUSES.length);
    expect(m.match(/min-h-\[44px\]/g)!.length).toBeGreaterThanOrEqual(RESIDENCE_STATUSES.length);
  });
  it("選択中は、チェックの図形と「選択中」の文字、aria-pressed で示す", () => {
    const m = body({ value: "永住者" });
    // 永住者は、よく使う項目と身分や地位の両方にある
    expect(m.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(m.match(/選択中/g)).toHaveLength(2);
    expect(m).toMatch(/<svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>選択中/);
  });
  it("文字を入れると絞り込み、近道は出さず、件数を示す", () => {
    const m = body({ query: "配偶者" });
    expect(m).toContain("2件が見つかりました");
    expect(m).not.toContain("よく使う項目");
    expect(m).toContain("日本人の配偶者等");
    expect(m).not.toContain("留学");
    expect(m).toContain("身分や地位に応じた在留資格");
    expect(m).not.toContain("活動内容に応じた在留資格");
  });
  it("見出しの名前でも絞り込める。該当なしは案内を出す", () => {
    expect(body({ query: "身分" })).toContain("4件が見つかりました");
    expect(body({ query: "存在しない在留資格" })).toContain("該当する項目がありません");
  });
  it("過去の自由入力の値（legacy）は、登録済みの入力の見出しに残り、選択中として示す", () => {
    const m = body({ options: residenceStatusOptions("旧・自由入力の値"), value: "旧・自由入力の値" });
    expect(m).toContain("登録済みの入力");
    expect(m).toContain("旧・自由入力の値（登録済みの入力）");
    expect(m.match(/aria-pressed="true"/g)).toHaveLength(1);
  });
});
