"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { ChecksPanel } from "@/components/ChecksPanel";
import { EmploymentForm } from "@/components/EmploymentForm";
import { RequirementsPanel } from "@/components/RequirementsPanel";
import { ApplicantForm } from "@/components/ApplicantForm";
import { UploadBox } from "@/components/UploadBox";
import { Badge, Button } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { deleteCase, getDocumentSignedUrl, logAudit, updateCase, useCase, useStoreLoaded } from "@/lib/store";
import {
  DOCUMENT_STATUS_LABELS,
  PROCEDURE_TYPES,
  WORKFLOW_LABELS,
  type DocumentRecord,
} from "@/lib/types";

type Tab = "overview" | "documents" | "applicant" | "employment" | "requirements" | "checks";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "概要" },
  { key: "documents", label: "書類" },
  { key: "applicant", label: "申請人情報" },
  { key: "employment", label: "雇用・会社" },
  { key: "requirements", label: "必要書類" },
  { key: "checks", label: "申請前チェック" },
];

function DocumentRow({ doc, locked, onDelete }: { doc: DocumentRecord; locked: boolean; onDelete: () => void }) {
  const [error, setError] = useState("");

  async function open() {
    setError("");
    try {
      let url: string;
      if (doc.dataUrl) url = URL.createObjectURL(await (await fetch(doc.dataUrl)).blob());
      else if (doc.storagePath) url = await getDocumentSignedUrl(doc.storagePath);
      else throw new Error("ファイルを保持していません。");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(`表示できません：${e instanceof Error ? e.message : ""}`);
    }
  }

  return (
    <div className="px-6 py-3 text-sm">
      <div className="flex items-center justify-between">
        <span>在留カード：{doc.fileName}</span>
        <span className="flex items-center gap-3">
          <Badge tone="blue">
            {DOCUMENT_STATUS_LABELS[doc.status]}
          </Badge>
          <span className="text-slate-500">{formatDateTime(doc.uploadedAt)}</span>
          <Button variant="secondary" onClick={() => void open()}>
            表示
          </Button>
          <Button variant="danger" disabled={locked} onClick={onDelete}>
            削除
          </Button>
        </span>
      </div>
      {locked && <p className="mt-1 text-xs text-slate-500">申請人情報が確定済みのため、削除できません。</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const record = useCase(id);
  const loaded = useStoreLoaded();
  const [tab, setTab] = useState<Tab>("overview");

  if (!record && !loaded) return <p className="text-sm text-slate-500">読み込み中……</p>;

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

  function removeDocument(d: DocumentRecord) {
    if (!confirm(`「${d.fileName}」を削除します。よろしいですか。`)) return;
    updateCase(record!.id, (c) => ({ ...c, workflowStatus: "preparing", documents: [] }));
    logAudit(record!.id, "document_deleted", { fileName: d.fileName });
  }
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
            <Badge tone={record.workflowStatus === "applicant_confirmed" || record.workflowStatus === "application_ready" ? "green" : "gray"}>
              {WORKFLOW_LABELS[record.workflowStatus]}
            </Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Link
          href={`/cases/${record.id}/documents`}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          申請書類作成
        </Link>
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
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              申請人情報
              <Badge tone={a.confirmationStatus === "confirmed" ? "green" : "yellow"}>
                {a.confirmationStatus === "confirmed" ? "確認済み" : "下書き"}
              </Badge>
            </h2>
            <dl className="grid grid-cols-[10rem_1fr] gap-y-3 text-sm">
              <dt className="text-slate-500">氏名</dt>
              <dd>{a.legalName || <span className="text-slate-400">未入力</span>}</dd>
              <dt className="text-slate-500">国籍・地域</dt>
              <dd>{a.nationality || <span className="text-slate-400">未入力</span>}</dd>
              <dt className="text-slate-500">生年月日</dt>
              <dd>{formatDate(a.dateOfBirth)}</dd>
              <dt className="text-slate-500">性別</dt>
              <dd>{a.gender || <span className="text-slate-400">未入力</span>}</dd>
              <dt className="text-slate-500">住居地</dt>
              <dd>{a.address || <span className="text-slate-400">未入力</span>}</dd>
              <dt className="text-slate-500">在留資格</dt>
              <dd>{a.residenceStatus || <span className="text-slate-400">未入力</span>}</dd>
              <dt className="text-slate-500">在留期間の満了日</dt>
              <dd>
                <ExpiryBadge date={a.residenceExpiryDate} />
              </dd>
              <dt className="text-slate-500">在留カード番号</dt>
              <dd>{a.residenceCardNumber || <span className="text-slate-400">未入力</span>}</dd>
              <dt className="text-slate-500">就労制限</dt>
              <dd>{a.workRestriction || <span className="text-slate-400">未入力</span>}</dd>
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
              次に行うこと：「書類」タブから在留カードを登録し、「申請人情報」タブで内容を入力してください。
            </p>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-6">
          <UploadBox caseId={record.id} hasDocument={record.documents.length > 0} onUploaded={() => setTab("applicant")} />
          <section className="rounded-lg border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-6 py-3 font-semibold">登録書類</h2>
            {record.documents.length === 0 && <p className="px-6 py-6 text-sm text-slate-500">登録された書類はありません。</p>}
            {record.documents.map((d) => (
              <DocumentRow key={d.id} doc={d} locked={record.workflowStatus === "applicant_confirmed"} onDelete={() => removeDocument(d)} />
            ))}
          </section>
        </div>
      )}

      {tab === "applicant" && <ApplicantForm record={record} onGoDocuments={() => setTab("documents")} />}

      {tab === "employment" && <EmploymentForm record={record} />}

      {tab === "requirements" && <RequirementsPanel record={record} onGoEmployment={() => setTab("employment")} />}

      {tab === "checks" && <ChecksPanel record={record} />}
    </div>
  );
}
