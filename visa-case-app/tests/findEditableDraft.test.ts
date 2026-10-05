import { describe, expect, it } from "vitest";
import { findEditableDraft, mergeCreated } from "../lib/documents/merge";
import type { GeneratedDocument } from "../lib/documents/types";

// 値はすべてダミー
function doc(p: Partial<GeneratedDocument>): GeneratedDocument {
  return {
    id: "a",
    caseId: "c1",
    outputFormat: "html",
    documentType: "case_summary",
    title: "t",
    version: 1,
    status: "draft",
    createdAt: "",
    content: {} as GeneratedDocument["content"],
    ...p,
  };
}

describe("findEditableDraft", () => {
  it("最新の版が確認前なら、その版を返す", () => {
    const list = [doc({ id: "a", version: 1, status: "reviewed" }), doc({ id: "b", version: 2 })];
    expect(findEditableDraft(list, "c1", "case_summary", "html")?.id).toBe("b");
  });
  it("最新の版が確認済み以降なら、より古い確認前の版があっても返さない", () => {
    const list = [doc({ id: "a", version: 1 }), doc({ id: "b", version: 2, status: "submitted" })];
    expect(findEditableDraft(list, "c1", "case_summary", "html")).toBeUndefined();
  });
  it("案件・種類・出力形式が違う版は対象にしない", () => {
    const list = [doc({ id: "a", caseId: "c2" }), doc({ id: "b", documentType: "reason_statement" }), doc({ id: "c", outputFormat: "pdf" })];
    expect(findEditableDraft(list, "c1", "case_summary", "html")).toBeUndefined();
  });
});

describe("mergeCreated", () => {
  it("id が同じ版は置き換え、新しい版は足す", () => {
    const merged = mergeCreated([doc({ id: "a", version: 1 })], [doc({ id: "a", version: 2 }), doc({ id: "b", version: 3 })]);
    expect(merged.map((d) => [d.id, d.version])).toEqual([["b", 3], ["a", 2]]);
  });
});
