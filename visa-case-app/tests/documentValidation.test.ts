import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, storageExtension, validateDocumentFile } from "../lib/documentValidation";

const f = (name: string, type: string, size = 1000) => ({ name, type, size });

describe("書類ファイルの検証", () => {
  it("JPEG・PNG・PDFを許可する", () => {
    expect(validateDocumentFile(f("a.jpg", "image/jpeg"))).toBeNull();
    expect(validateDocumentFile(f("a.JPEG", "image/jpeg"))).toBeNull();
    expect(validateDocumentFile(f("a.png", "image/png"))).toBeNull();
    expect(validateDocumentFile(f("a.pdf", "application/pdf"))).toBeNull();
  });
  it("TXT・ZIPなどを拒否する", () => {
    expect(validateDocumentFile(f("a.txt", "text/plain"))).not.toBeNull();
    expect(validateDocumentFile(f("a.zip", "application/zip"))).not.toBeNull();
  });
  it("拡張子とMIMEタイプが食い違うものを拒否する", () => {
    expect(validateDocumentFile(f("a.exe", "image/png"))).not.toBeNull();
    expect(validateDocumentFile(f("noext", "image/png"))).not.toBeNull();
  });
  it("20MBを超えるファイルと空ファイルを拒否する", () => {
    expect(validateDocumentFile(f("a.pdf", "application/pdf", MAX_FILE_BYTES))).toBeNull();
    expect(validateDocumentFile(f("a.pdf", "application/pdf", MAX_FILE_BYTES + 1))).not.toBeNull();
    expect(validateDocumentFile(f("a.pdf", "application/pdf", 0))).not.toBeNull();
  });
  it("保存用の拡張子はMIMEタイプから決める", () => {
    expect(storageExtension("image/jpeg")).toBe("jpg");
    expect(storageExtension("application/pdf")).toBe("pdf");
  });
});

describe("証明写真ファイルの検証", () => {
  it("JPEG・PNGを許可し、PDFを拒否する", () => {
    expect(validateDocumentFile(f("p.jpg", "image/jpeg"), "photo")).toBeNull();
    expect(validateDocumentFile(f("p.png", "image/png"), "photo")).toBeNull();
    expect(validateDocumentFile(f("p.pdf", "application/pdf"), "photo")).not.toBeNull();
  });
  it("在留カードは従来どおりPDFを許可する", () => {
    expect(validateDocumentFile(f("a.pdf", "application/pdf"), "residence_card")).toBeNull();
  });
});
