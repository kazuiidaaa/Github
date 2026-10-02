"use client";

import { useRef, useState } from "react";
import { messageOf } from "@/lib/errors";
import { Button } from "@/components/ui";
import { MAX_FILE_BYTES, validateDocumentFile } from "@/lib/documentValidation";
import { logAudit, newId, updateCase, uploadDocumentFile } from "@/lib/store";
import type { DocumentRecord } from "@/lib/types";

const MAX_INLINE_BYTES = 1_000_000;

function readAsDataUrl(file: File): Promise<string | undefined> {
  if (file.size > MAX_INLINE_BYTES) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => resolve(undefined);
    r.readAsDataURL(file);
  });
}

export function UploadBox({
  caseId,
  hasDocument,
  onUploaded,
}: {
  caseId: string;
  hasDocument: boolean;
  onUploaded: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<File | null>(null);
  const [failed, setFailed] = useState<File | null>(null);

  async function upload(file: File) {
    setError("");
    setFailed(null);
    setUploading(file);
    const docId = newId();
    try {
      const storagePath = await uploadDocumentFile(caseId, docId, file);
      const record: DocumentRecord = {
        id: docId,
        documentType: "residence_card",
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        dataUrl: storagePath ? undefined : await readAsDataUrl(file),
        storagePath,
        status: "uploaded",
        uploadedAt: new Date().toISOString(),
      };
      updateCase(caseId, (c) => ({ ...c, documents: [record] }));
      logAudit(caseId, "document_uploaded", { fileName: file.name });
      onUploaded();
    } catch (e) {
      setError(`アップロードに失敗しました：${messageOf(e)}`);
      setFailed(file);
    } finally {
      setUploading(null);
    }
  }

  function handle(file: File | undefined) {
    if (!file || uploading) return;
    if (hasDocument) {
      setError("在留カードは登録済みです。差し替える場合は、先に登録済みの書類を削除してください。");
      return;
    }
    const problem = validateDocumentFile(file);
    if (problem) {
      setFailed(null);
      setError(problem);
      return;
    }
    void upload(file);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="mb-1 font-semibold">在留カードをアップロード</h2>
      <p className="mb-4 text-xs text-slate-500">
        OCRは行いません。アップロード後、原本を見ながら申請人情報を入力します。試作版のため、実在の個人情報はアップロードしないでください。
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
          handle(e.dataTransfer.files[0]);
        }}
        className={`rounded-lg border-2 border-dashed p-10 text-center text-sm ${
          dragging ? "border-slate-700 bg-slate-50" : "border-slate-300"
        }`}
      >
        {uploading ? (
          <p className="text-slate-700">{uploading.name}　アップロード中……</p>
        ) : (
          <>
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
                handle(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <p className="mt-3 text-xs text-slate-500">
              対応形式：JPG / PNG / PDF　最大サイズ：{MAX_FILE_BYTES / 1024 / 1024}MB
            </p>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {failed && !uploading && (
        <div className="mt-2 flex gap-2">
          <Button onClick={() => void upload(failed)}>再試行</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFailed(null);
              setError("");
            }}
          >
            キャンセル
          </Button>
        </div>
      )}
    </section>
  );
}
