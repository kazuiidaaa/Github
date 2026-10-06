import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UnresolvedNote } from "../components/documents/UnresolvedNote";

describe("UnresolvedNote（未解決事項の件数と注意）", () => {
  it("未解決がなければ何も表示しない", () => {
    expect(renderToStaticMarkup(<UnresolvedNote count={0} />)).toBe("");
  });
  it("件数と注意を示し、個別の項目は再掲しない", () => {
    const html = renderToStaticMarkup(<UnresolvedNote count={3} />);
    expect(html).toContain('role="note"');
    expect(html).toContain("3 件");
    expect(html).toContain("生成はできます");
    expect(html).toContain("行政書士が内容を確認してから使用してください");
    expect(html).not.toContain("<li");
    expect(html).not.toContain("未確認です");
  });
});
