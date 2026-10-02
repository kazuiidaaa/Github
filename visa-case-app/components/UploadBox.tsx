"use client";

import { useRef, useState } from "react";
import { runMockOcr } from "@/lib/ocr";
import { messageOf } from "@/lib/errors";
import { logAudit, newId, updateCase, uploadDocumentFile } from "@/lib/store";
import type { DocumentRecord } from "@/lib/types";

const MAX_INLINE_BYTES = 1_000_000;
const ACCEPT = ["image/jpeg", "image/png", "application/pdf"];

function readAsDataUrl(file: File): Promise<string | undefined> {
  if (file.size > MAX_INLINE_BYTES) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => resolve(undefined);
    r.readAsDataURL(file);
  });
}

export function UploadBox({ caseId, onUploaded }: { caseId: string; onUploaded: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      setError("対応形式は JPG / PNG / PDF です。");
      return;
    }
    setError("");
    const docId = newId();
    let storagePath: string | undefined;
    try {
      storagePath = await uploadDocumentFile(caseId, docId, file);
    } catch (e) {
      setError(`ファイルの保存に失敗しました：${messageOf(e)}`);
      return;
    }
    const base: DocumentRecord = {
      id: docId,
      documentType: "residence_card",
      fileName: file.name,
      mimeType: file.type,
      dataUrl: storagePath ? undefined : await readAsDataUrl(file),
      storagePath,
      status: "processing",
      uploadedAt: new Date().toISOString(),
      extractions: [],
    };
    updateCase(caseId, (c) => ({ ...c, workflowStatus: "processing", documents: [base] }));
    logAudit(caseId, "document_uploaded", { fileName: file.name });
    onUploaded();
    try {
      const extractions = await runMockOcr(file);
      updateCase(caseId, (c) => ({
        ...c,
        workflowStatus: "review",
        documents: c.documents.map((d) => (d.id === docId ? { ...d, status: "processed", extractions } : d)),
      }));
    } catch {
      updateCase(caseId, (c) => ({
        ...c,
        workflowStatus: "preparing",
        documents: c.documents.map((d) => (d.id === docId ? { ...d, status: "failed" } : d)),
      }));
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="mb-1 font-semibold">在留カードをアップロード</h2>
      <p className="mb-4 text-xs text-slate-500">
        試作版のため、実際のOCRは行わず仮の抽出結果を表示します。実在の個人情報はアップロードしないでください。
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handle(e.dataTransfer.files[0]);
        }}
        className={`rounded-lg border-2 border-dashed p-10 text-center text-sm ${
          dragging ? "border-slate-700 bg-slate-50" : "border-slate-300"
        }`}
      >
        <p className="mb-3 text-slate-600">ファイルをここにドロップ、または</p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50"
        >
          ファイルを選択
        </button>
        <input
          ref={input}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={(e) => {
            void handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="mt-3 text-xs text-slate-500">対応形式：JPG / PNG / PDF</p>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
