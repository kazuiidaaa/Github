"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { messageOf } from "@/lib/errors";
import { ClientGuideSheet } from "@/components/documents/ClientGuideSheet";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { OfficialFormNotice } from "@/components/documents/OfficialFormNotice";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui";
import { LoadingNotice } from "@/components/LoadingNotice";
import { changeStatus, downloadFile, exportFile, useGeneratedDocuments } from "@/lib/documents/store";
import { OFFICIAL_FORM_LOGIN_REQUIRED, officialFormNeedsLogin } from "@/lib/documents/officialFormAccess";
import { OUTPUT_FORMAT_LABELS, isOfficialForm } from "@/lib/documents/types";
import { useDemo } from "@/lib/demo";
import { getConfirmerName, useCan, useCase } from "@/lib/store";

type StatusChange = "reviewed" | "submitted" | "archived";

/** 状態変更の確認ダイアログの内容。影響は changeStatus（lib/documents/store.ts）の実際の処理に即して書く */
const STATUS_CONFIRM: Record<StatusChange, { title: string; message: string; note: string; label: string }> = {
  reviewed: {
    title: "行政書士確認済みにする",
    message: "この版を、行政書士が内容を確認した版として記録します。確認者の名前と確認日時が、書類に表示されます。",
    note: "操作の記録（監査ログ）が残ります。",
    label: "確認済みにする",
  },
  submitted: {
    title: "提出済みにする",
    message: "この版を、入管へ提出した版として記録します。",
    note: "操作の記録（監査ログ）が残ります。",
    label: "提出済みにする",
  },
  archived: {
    title: "書類を保管にする",
    message: "この版を保管にします。書類の一覧では初期状態で非表示になります。",
    note: "「保管済みを表示」にすると見られます。画面から保管を取り消す操作はありません。操作の記録（監査ログ）が残ります。",
    label: "保管にする",
  },
};

export default function DocumentPreviewPage() {
  const { id, docId } = useParams<{ id: string; docId: string }>();
  const record = useCase(id);
  const canEdit = useCan("edit");
  const needsLogin = officialFormNeedsLogin(useDemo());
  const { documents, loaded, error } = useGeneratedDocuments(id);
  const doc = documents.find((d) => d.id === docId);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<StatusChange | null>(null);
  const router = useRouter();

  if (!doc) {
    return loaded ? (
      <div>
        <p className="mb-4">文書が見つかりません。</p>
        <Link href={`/cases/${id}/documents`} className="text-blue-700 hover:underline">
          ← 申請書類作成
        </Link>
      </div>
    ) : (
      <LoadingNotice error={error} />
    );
  }

  const stale = !!record && record.updatedAt > doc.content.source.caseUpdatedAt;
  const latest = documents.filter((d) => d.documentType === doc.documentType).reduce((m, d) => Math.max(m, d.version), 0);

  async function file(mode: "docx" | "pdf" | "xlsx" | "download") {
    if (!doc) return;
    setBusy(true);
    setMessage("");
    try {
      if (mode === "download") {
        await downloadFile(doc);
      } else {
        // 保存済みの内容から、新しい版として出力する。元の版は変更しない
        const created = await exportFile(doc, mode);
        await downloadFile(created);
        router.push(`/cases/${id}/documents/${created.id}`);
      }
    } catch (e) {
      setMessage(`ファイルの出力に失敗しました：${messageOf(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function run(status: StatusChange) {
    setAsking(null);
    if (!doc) return;
    try {
      await changeStatus(doc, status, status === "reviewed" ? await getConfirmerName() : "");
      setMessage("");
    } catch (e) {
      setMessage(`変更に失敗しました：${messageOf(e)}`);
    }
  }

  return (
    <div>
      {/* 印刷時は、画面上部のヘッダーと操作部を隠す */}
      <style>{`@media print { header { display: none; } }`}</style>
      <div className="mb-4 space-y-3 print:hidden">
        <Link href={`/cases/${id}/documents`} className="text-sm text-blue-700 hover:underline">
          ← 申請書類作成
        </Link>
        {stale && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            生成後に案件情報が更新されています。この版は生成時点の内容です。最新の内容で確認する場合は、再生成してください。
          </p>
        )}
        {doc.outputFormat !== "html" && (
          <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
            この版は{OUTPUT_FORMAT_LABELS[doc.outputFormat]}として出力・保存された版です。内容は変更できません。
          </p>
        )}
        {isOfficialForm(doc.documentType) && <OfficialFormNotice />}
        {doc.version < latest && (
          <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">これより新しい版（v{latest}）があります。</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && doc.status === "draft" && (
            <Button onClick={() => setAsking("reviewed")}>
              行政書士確認済みにする
            </Button>
          )}
          {canEdit && doc.status === "reviewed" && (
            <Button onClick={() => setAsking("submitted")}>提出済みにする</Button>
          )}
          {canEdit && doc.status !== "archived" && (
            <Button variant="secondary" onClick={() => setAsking("archived")}>
              保管にする
            </Button>
          )}
          {doc.outputFormat !== "html" ? (
            <Button variant="secondary" disabled={busy} onClick={() => void file("download")}>
              {OUTPUT_FORMAT_LABELS[doc.outputFormat]}をダウンロード
            </Button>
          ) : isOfficialForm(doc.documentType) ? (
            <Button variant="secondary" disabled={busy || !canEdit || needsLogin} onClick={() => void file("xlsx")}>
              {busy ? "出力中……" : "エクセル出力"}
            </Button>
          ) : (
            <>
              <Button variant="secondary" disabled={busy || !canEdit} onClick={() => void file("docx")}>
                {busy ? "出力中……" : "Word出力"}
              </Button>
              <Button variant="secondary" disabled={busy || !canEdit} onClick={() => void file("pdf")}>
                {busy ? "出力中……" : "PDF出力"}
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            印刷
          </Button>
          {needsLogin && isOfficialForm(doc.documentType) && (
            <span className="text-sm text-amber-900">{OFFICIAL_FORM_LOGIN_REQUIRED}</span>
          )}
          <span role="alert" className="text-sm text-red-700">
            {message}
          </span>
        </div>
      </div>
      {doc.documentType === "client_guide" ? <ClientGuideSheet doc={doc} /> : <DocumentSheet doc={doc} />}
      {asking && (
        <ConfirmDialog
          title={STATUS_CONFIRM[asking].title}
          message={STATUS_CONFIRM[asking].message}
          note={STATUS_CONFIRM[asking].note}
          confirmLabel={STATUS_CONFIRM[asking].label}
          onCancel={() => setAsking(null)}
          onConfirm={() => void run(asking)}
        />
      )}
    </div>
  );
}
