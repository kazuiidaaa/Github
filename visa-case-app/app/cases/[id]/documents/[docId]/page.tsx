"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { messageOf } from "@/lib/errors";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { OfficialFormNotice } from "@/components/documents/OfficialFormNotice";
import { Button } from "@/components/ui";
import { LoadingNotice } from "@/components/LoadingNotice";
import { changeStatus, downloadFile, exportFile, useGeneratedDocuments } from "@/lib/documents/store";
import { OFFICIAL_FORM_LOGIN_REQUIRED, officialFormNeedsLogin } from "@/lib/documents/officialFormAccess";
import { OUTPUT_FORMAT_LABELS, isOfficialForm } from "@/lib/documents/types";
import { useDemo } from "@/lib/demo";
import { getConfirmerName, useCan, useCase } from "@/lib/store";

export default function DocumentPreviewPage() {
  const { id, docId } = useParams<{ id: string; docId: string }>();
  const record = useCase(id);
  const canEdit = useCan("edit");
  const needsLogin = officialFormNeedsLogin(useDemo());
  const { documents, loaded, error } = useGeneratedDocuments(id);
  const doc = documents.find((d) => d.id === docId);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
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

  async function run(status: "reviewed" | "final" | "archived", ask: string) {
    if (!doc || !confirm(ask)) return;
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
            <Button onClick={() => void run("reviewed", "内容を確認し、行政書士確認済みにします。よろしいですか。")}>
              行政書士確認済みにする
            </Button>
          )}
          {canEdit && doc.status === "reviewed" && (
            <Button onClick={() => void run("final", "この版を最終版にします。よろしいですか。")}>最終版にする</Button>
          )}
          {canEdit && doc.status !== "archived" && (
            <Button variant="secondary" onClick={() => void run("archived", "この版を保管にします。よろしいですか。")}>
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
      <DocumentSheet doc={doc} />
    </div>
  );
}
