import { describe, expect, it } from "vitest";
import { splitHistory } from "../lib/documents/history";
import type { GeneratedDocument } from "../lib/documents/types";

const doc = (id: string, status: GeneratedDocument["status"]) => ({ id, status }) as GeneratedDocument;

describe("生成履歴の保管の振り分け", () => {
  it("保管の版を通常の一覧から分け、順序を保つ", () => {
    const out = splitHistory([doc("a", "draft"), doc("b", "archived"), doc("c", "final"), doc("d", "archived")]);
    expect(out.active.map((d) => d.id)).toEqual(["a", "c"]);
    expect(out.archived.map((d) => d.id)).toEqual(["b", "d"]);
  });
  it("空でも動く", () => {
    expect(splitHistory([])).toEqual({ active: [], archived: [] });
  });
});
