import { describe, expect, it } from "vitest";
import { mergeCreated } from "../lib/documents/merge";
import type { GeneratedDocument } from "../lib/documents/types";

// 値はすべてダミー。生成の途中で失敗した場合の画面反映（M3）を、純関数として検証する。

function doc(id: string, version: number, documentType: GeneratedDocument["documentType"] = "official_application_form"): GeneratedDocument {
  return { id, caseId: "c1", documentType, version, title: "t", outputFormat: "html", status: "draft", createdAt: "2026-01-01T00:00:00Z" } as GeneratedDocument;
}

describe("mergeCreated", () => {
  it("保存済みの版だけでも、既存の一覧へ足して新しい版順に並べる（途中失敗時の反映）", () => {
    const merged = mergeCreated([doc("a", 1)], [doc("b", 2)]);
    expect(merged.map((d) => d.id)).toEqual(["b", "a"]);
  });
  it("すでに一覧にある id は、重複して足さない", () => {
    const merged = mergeCreated([doc("a", 1), doc("b", 2)], [doc("b", 2), doc("c", 3)]);
    expect(merged.map((d) => d.id)).toEqual(["c", "b", "a"]);
  });
  it("何も作れていなければ、一覧は変わらない", () => {
    expect(mergeCreated([doc("a", 1)], []).map((d) => d.id)).toEqual(["a"]);
  });
});
