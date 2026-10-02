"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { ReviewPanel } from "@/components/ReviewPanel";
import { UploadBox } from "@/components/UploadBox";
import { Badge, Button } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { deleteCase, useCase } from "@/lib/store";
import {
  DOCUMENT_STATUS_LABELS,
  PROCEDURE_TYPES,
  REQUIRED_FIELDS,
  WORKFLOW_LABELS,
} from "@/lib/types";

type Tab = "overview" | "documents" | "extractions";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "概要" },
  { key: "documents", label: "書類" },
  { key: "extractions", label: "抽出結果" },
];

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const record = useCase(id);
  const [tab, setTab] = useState<Tab>("overview");

  if (!record) {
    return (
      <div>
        <p className="mb-4">案件が見つかりません。</p>
        <Link href="/cases" className="text-blue-700 hover:underline">
          ← 案件一覧
        </Link>
      </div>
    );
  }

  const doc = record.documents[0];
  const a = record.applicant;
  const procedure = PROCEDURE_TYPES.find((p) => p.value === record.procedureType)?.label;

  return (
    <div>
      <Link href="/cases" className="text-sm text-blue-700 hover:underline">
        ← 案件一覧
      </Link>
      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{record.caseName}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            {procedure}
            <Badge tone={record.workflowStatus === "confirmed" ? "green" : "gray"}>
              {WORKFLOW_LABELS[record.workflowStatus]}
            </Badge>
          </p>
        </div>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm("この案件を削除します。よろしいですか。")) {
              deleteCase(record.id);
              router.push("/cases");
            }
          }}
        >
          削除
        </Button>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.key ? "border-b-2 border-slate-900" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">申請人情報</h2>
            <dl className="grid grid-cols-[10rem_1fr] gap-y-3 text-sm">
              <dt className="text-slate-500">氏名</dt>
              <dd>{a.legalName || <span className="text-slate-400">未確認</span>}</dd>
              <dt className="text-slate-500">国籍・地域</dt>
              <dd>{a.nationality || <span className="text-slate-400">未確認</span>}</dd>
              <dt className="text-slate-500">生年月日</dt>
              <dd>{formatDate(a.dateOfBirth)}</dd>
              <dt className="text-slate-500">在留資格</dt>
              <dd>{a.residenceStatus || <span className="text-slate-400">未確認</span>}</dd>
              <dt className="text-slate-500">在留期間の満了日</dt>
              <dd>
                <ExpiryBadge date={a.residenceExpiryDate} />
              </dd>
            </dl>
            {a.confirmationStatus === "confirmed" && (
              <p className="mt-4 text-sm text-green-700">
                ✓ 行政書士確認済み（確認者：{a.confirmedBy}／{formatDateTime(a.confirmedAt)}）
              </p>
            )}
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm">
            <h2 className="mb-4 font-semibold">案件情報</h2>
            <dl className="grid grid-cols-[10rem_1fr] gap-y-3">
              <dt className="text-slate-500">現在の在留資格</dt>
              <dd>{record.currentStatus || "-"}</dd>
              {record.targetStatus && (
                <>
                  <dt className="text-slate-500">希望する在留資格</dt>
                  <dd>{record.targetStatus}</dd>
                </>
              )}
              <dt className="text-slate-500">メモ</dt>
              <dd className="whitespace-pre-wrap">{record.memo || "-"}</dd>
            </dl>
          </section>
          {!doc && (
            <p className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
              次に行うこと：「書類」タブから在留カードをアップロードしてください。
            </p>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-6">
          <UploadBox caseId={record.id} onUploaded={() => setTab("extractions")} />
          <section className="rounded-lg border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-6 py-3 font-semibold">登録書類</h2>
            {record.documents.length === 0 && <p className="px-6 py-6 text-sm text-slate-500">登録された書類はありません。</p>}
            {record.documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-6 py-3 text-sm">
                <span>在留カード：{d.fileName}</span>
                <span className="flex items-center gap-3">
                  <Badge tone={d.status === "processed" ? "green" : d.status === "failed" ? "red" : "blue"}>
                    {DOCUMENT_STATUS_LABELS[d.status]}
                  </Badge>
                  <span className="text-slate-500">{formatDateTime(d.uploadedAt)}</span>
                </span>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === "extractions" && (
        <>
          {!doc && <p className="text-sm text-slate-500">在留カードが未登録です。「書類」タブからアップロードしてください。</p>}
          {doc && doc.status === "processing" && <p className="text-sm text-slate-600">OCR処理中です。しばらくお待ちください……</p>}
          {doc && doc.status === "failed" && <p className="text-sm text-red-700">OCR処理に失敗しました。再度アップロードしてください。</p>}
          {doc && doc.status === "processed" && <ReviewPanel record={record} doc={doc} fields={REQUIRED_FIELDS} />}
        </>
      )}
    </div>
  );
}
