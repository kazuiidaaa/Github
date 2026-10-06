"use client";

import { useRef, useState } from "react";
import { messageOf } from "@/lib/errors";
import { Button } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { ConfirmDocumentReplaceDialog } from "@/components/ConfirmDocumentReplaceDialog";
import { FORMAT_LABEL_BY_DOCUMENT_TYPE, MAX_FILE_BYTES, validateDocumentFile } from "@/lib/documentValidation";
import { logAudit, newId, updateCase, uploadDocumentFile } from "@/lib/store";
import { PHOTO_GUIDANCE, replaceDocumentOfType } from "@/lib/documentKinds";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { photoAspectWarning } from "@/lib/photoAspect";
import type { DocumentRecord } from "@/lib/types";

const MAX_INLINE_BYTES = 1_000_000;

const DOCUMENT_NAME_KEYS: Record<DocumentRecord["documentType"], MessageKey> = {
  residence_card: "display.docResidenceCard",
  photo: "display.docPhoto",
};

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
  currentFileName,
  onUploaded,
  compact = false,
  documentType = "residence_card",
}: {
  caseId: string;
  /** アップロードする書類の種別。省略時は在留カード */
  documentType?: DocumentRecord["documentType"];
  /** 登録済みの同じ種別の書類のファイル名。登録済みの場合は、差し替えとして扱う */
  currentFileName?: string;
  onUploaded: (replaced: boolean) => void;
  /** 一覧の行内に置く、簡略表示（見出し・説明を省き、余白を小さくする） */
  compact?: boolean;
}) {
  const toast = useToast();
  const t = useT();
  const { lang } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<File | null>(null);
  const [failed, setFailed] = useState<File | null>(null);
  const [replacing, setReplacing] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const hasDocument = currentFileName !== undefined;
  const isPhoto = documentType === "photo";
  const label = t(DOCUMENT_NAME_KEYS[documentType]);
  const accept = isPhoto ? ".jpg,.jpeg,.png" : ".jpg,.jpeg,.png,.pdf";

  async function upload(file: File) {
    setError("");
    setFailed(null);
    setNotice("");
    setUploading(file);
    // 証明写真のみ、縦横比を確認する（警告のみで、保存は妨げない）
    const aspectWarning = isPhoto ? await photoAspectWarning(file) : "";
    const docId = newId();
    try {
      const storagePath = await uploadDocumentFile(caseId, docId, file);
      const record: DocumentRecord = {
        id: docId,
        documentType,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        dataUrl: storagePath ? undefined : await readAsDataUrl(file),
        storagePath,
        status: "uploaded",
        uploadedAt: new Date().toISOString(),
      };
      // 差し替えは、新しいファイルの保存に成功してから置き換える（失敗時は元の書類を残す）
      updateCase(caseId, (c) => ({
        ...c,
        documents: replaceDocumentOfType(c.documents, record),
        // 申請人情報の元になる在留カードを差し替えたときだけ、作成中に戻す
        workflowStatus: hasDocument && !isPhoto ? "preparing" : c.workflowStatus,
      }));
      logAudit(caseId, hasDocument ? "document_replaced" : "document_uploaded", { documentType });
      setNotice(aspectWarning);
      toast.success(t(hasDocument ? "display.replacedToast" : "display.uploadedToast", { label }));
      onUploaded(hasDocument);
    } catch (e) {
      logAudit(caseId, "document_upload_failed", undefined, "failure");
      setError(t("display.uploadFailed", { reason: messageOf(e) }));
      toast.error(t("display.uploadFailedToast", { label }));
      setFailed(file);
    } finally {
      setUploading(null);
    }
  }

  function handle(file: File | undefined) {
    if (!file || uploading) return;
    const problem = validateDocumentFile(file, documentType);
    if (problem) {
      setFailed(null);
      setError(problem);
      return;
    }
    setError("");
    if (hasDocument) setReplacing(file);
    else void upload(file);
  }

  return (
    <section className={compact ? "" : "rounded-2xl border border-slate-200 bg-white p-6"}>
      {!compact && (
        <>
          <h2 className="mb-1 font-semibold">{t(hasDocument ? "display.uploadReplaceTitle" : "display.uploadNewTitle", { label })}</h2>
          <p className="mb-4 text-xs text-slate-500">
            {isPhoto ? PHOTO_GUIDANCE : t("display.uploadNoteCard")}
            {lang === "ja" ? "" : " "}
            {t("display.uploadNotePrototype")}
          </p>
        </>
      )}
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
        className={`rounded-2xl border-2 border-dashed text-center text-sm ${compact ? "p-4" : "p-10"} ${
          dragging ? "border-slate-700 bg-slate-50" : "border-line-strong"
        }`}
      >
        {uploading ? (
          <p className="text-slate-700">{t("display.uploading", { name: uploading.name })}</p>
        ) : (
          <>
            <p className={`${compact ? "mb-2" : "mb-3"} text-slate-600`}>{t("display.dropHere")}</p>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="rounded-full border border-line-strong bg-white px-4 py-2 font-bold hover:bg-slate-50"
            >
              {t(hasDocument ? "display.chooseReplaceFile" : "display.chooseFile")}
            </button>
            <input
              ref={input}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                handle(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {!compact && (
              <p className="mt-3 text-xs text-slate-500">
                {t("display.formatAndSize", { formats: FORMAT_LABEL_BY_DOCUMENT_TYPE[documentType], size: MAX_FILE_BYTES / 1024 / 1024 })}
              </p>
            )}
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {notice && !error && (
        <p role="status" className="mt-2 text-sm text-amber-700">
          {notice}
        </p>
      )}
      {replacing && currentFileName !== undefined && (
        <ConfirmDocumentReplaceDialog
          currentFileName={currentFileName}
          newFileName={replacing.name}
          onCancel={() => setReplacing(null)}
          onConfirm={() => {
            const file = replacing;
            setReplacing(null);
            void upload(file);
          }}
        />
      )}
      {failed && !uploading && (
        <div className="mt-2 flex gap-2">
          <Button onClick={() => void upload(failed)}>{t("display.retry")}</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFailed(null);
              setError("");
            }}
          >
            {t("display.cancel")}
          </Button>
        </div>
      )}
    </section>
  );
}
