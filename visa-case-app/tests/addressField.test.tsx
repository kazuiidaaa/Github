import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AddressField } from "../components/AddressField";

const html = (props: Partial<React.ComponentProps<typeof AddressField>> = {}) =>
  renderToStaticMarkup(<AddressField label="住居地" value="" onChange={() => {}} {...props} />);

describe("AddressField の表示", () => {
  it("郵便番号欄は、数字のキーボードと郵便番号の自動補完を指定する", () => {
    const m = html();
    expect(m).toContain('inputMode="numeric"');
    expect(m).toContain('autoComplete="postal-code"');
    expect(m).toContain("住所を入れる");
    expect(m).toContain("郵便番号は保存しません");
  });
  it("住所の欄に id を渡せる。通知欄は role=status", () => {
    const m = html({ id: "address-x" });
    expect(m).toContain('id="address-x"');
    expect(m).toContain('role="status"');
  });
  it("無効のとき、郵便番号欄・ボタン・住所欄を無効にする", () => {
    const m = html({ disabled: true });
    expect(m.match(/disabled=""/g)?.length).toBe(3);
  });
});
