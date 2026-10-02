"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { messageOf } from "@/lib/errors";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { Button } from "@/components/ui";
import { changeStatus, useGeneratedDocuments } from "@/lib/documents/store";
import { getConfirmerName, useCase } from "@/lib/store";

export default function DocumentPreviewPage() {
  const { id, docId } = useParams<{ id: string; docId: string }>();
  const record = useCase(id);
  const { documents, loaded } = useGeneratedDocuments(id);
  const doc = documents.find((d) => d.id === docId);
  const [message, setMessage] = useState("");

  if (!doc) {
    return loaded ? (
      <div>
        <p className="mb-4">文書が見つかりません。</p>
        <Link href={`/cases/${id}/documents`} className="text-blue-700 hover:underline">
          ← 申請書類作成
        </Link>
      </div>
    ) : (
      <p className="text-sm text-slate-500">読み込み中……</p>
    );
  }

  const stale = !!record && record.updatedAt > doc.content.source.caseUpdatedAt;
  const latest = documents.filter((d) => d.documentType === doc.documentType).reduce((m, d) => Math.max(m, d.version), 0);

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
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            生成後に案件情報が更新されています。この版は生成時点の内容です。最新の内容で確認する場合は、再生成してください。
          </p>
        )}
        {doc.version < latest && (
          <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-700">これより新しい版（v{latest}）があります。</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {doc.status === "draft" && (
            <Button onClick={() => void run("reviewed", "内容を確認し、行政書士確認済みにします。よろしいですか。")}>
              行政書士確認済みにする
            </Button>
          )}
          {doc.status === "reviewed" && (
            <Button onClick={() => void run("final", "この版を最終版にします。よろしいですか。")}>最終版にする</Button>
          )}
          {doc.status !== "archived" && (
            <Button variant="secondary" onClick={() => void run("archived", "この版を保管にします。よろしいですか。")}>
              保管にする
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            印刷
          </Button>
          {message && <span className="text-sm text-red-700">{message}</span>}
        </div>
      </div>
      <DocumentSheet doc={doc} />
    </div>
  );
}
