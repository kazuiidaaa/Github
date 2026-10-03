import { describe, expect, it } from "vitest";
import { hasResidenceCard, removeDocumentOfType, replaceDocumentOfType } from "../lib/documentKinds";
import type { DocumentRecord } from "../lib/types";

const rec = (id: string, documentType: DocumentRecord["documentType"]): DocumentRecord => ({
  id,
  documentType,
  fileName: `${id}.png`,
  mimeType: "image/png",
  status: "uploaded",
  uploadedAt: "2026-01-01T00:00:00Z",
});

describe("書類種別ごとの置き換え・削除", () => {
  it("証明写真を追加しても在留カードが残る", () => {
    const out = replaceDocumentOfType([rec("c1", "residence_card")], rec("p1", "photo"));
    expect(out.map((d) => d.id).sort()).toEqual(["c1", "p1"]);
  });
  it("同じ種別は置き換え、他の種別は保持する", () => {
    const out = replaceDocumentOfType([rec("c1", "residence_card"), rec("p1", "photo")], rec("p2", "photo"));
    expect(out.map((d) => d.id).sort()).toEqual(["c1", "p2"]);
  });
  it("一方を削除しても他方が残る", () => {
    const docs = [rec("c1", "residence_card"), rec("p1", "photo")];
    expect(removeDocumentOfType(docs, "photo").map((d) => d.id)).toEqual(["c1"]);
    expect(removeDocumentOfType(docs, "residence_card").map((d) => d.id)).toEqual(["p1"]);
  });
  it("証明写真だけでは在留カード登録済みにならない", () => {
    expect(hasResidenceCard({ documents: [rec("p1", "photo")] })).toBe(false);
    expect(hasResidenceCard({ documents: [rec("c1", "residence_card")] })).toBe(true);
  });
});
