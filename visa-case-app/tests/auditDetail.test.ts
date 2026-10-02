import { describe, expect, it } from "vitest";
import { sanitizeAuditDetail } from "../lib/auditDetail";

describe("監査ログの detail", () => {
  it("メモ本文・名称・ファイル名・日付の値を保存しない", () => {
    const r = sanitizeAuditDetail({
      requirementId: "cert_employment",
      note: "山田太郎のパスポート番号 TK1234567",
      name: "山田太郎の源泉徴収票",
      fileName: "yamada_zairyu.jpg",
      dueDate: "2026-12-31",
    });
    expect(r).toEqual({ requirementId: "cert_employment", changedFields: ["dueDate", "fileName", "name", "note"] });
    expect(JSON.stringify(r)).not.toMatch(/山田|TK1234567|yamada|2026/);
  });
  it("列挙値・件数は残し、不正な形式の値は項目名のみにする", () => {
    expect(sanitizeAuditDetail({ status: "received", unresolved: 2 })).toEqual({ status: "received", unresolved: 2 });
    expect(sanitizeAuditDetail({ status: "山田太郎" })).toEqual({ changedFields: ["status"] });
  });
  it("値の消去も項目名として記録し、空なら undefined を返す", () => {
    expect(sanitizeAuditDetail({ dueDate: undefined })).toEqual({ changedFields: ["dueDate"] });
    expect(sanitizeAuditDetail(undefined)).toBeUndefined();
    expect(sanitizeAuditDetail({})).toBeUndefined();
  });
});
