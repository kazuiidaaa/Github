"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { messageOf } from "@/lib/errors";
import { Badge, Button } from "@/components/ui";
import { generateDocuments, useGeneratedDocuments } from "@/lib/documents/store";
import {
  DOCUMENT_TYPE_LABELS,
  GENERATED_STATUS_LABELS,
  INTERNAL_DOCUMENT_TYPES,
  OUTPUT_FORMAT_LABELS,
  type InternalDocumentType,
} from "@/lib/documents/types";
import { unresolvedCount } from "@/lib/checks/definitions";
import { formatDateTime } from "@/lib/format";
import { evaluate } from "@/lib/requirements/evaluate";
import { useCan, useCase, useStoreLoaded } from "@/lib/store";

export default function DocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const record = useCase(id);
  const storeLoaded = useStoreLoaded();
  const canEdit = useCan("edit");
  const { documents, loaded, error } = useGeneratedDocuments(id);
  const [selected, setSelected] = useState<InternalDocumentType[]>(INTERNAL_DOCUMENT_TYPES.filter((t) => t !== "transcription_aid"));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!record && !storeLoaded) return <p className="text-sm text-slate-500">読み込み中……</p>;
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

  const ev = evaluate(record);
  const checksDone = record.checks.length > 0 ? `${unresolvedCount(record.checks)}件が未解決` : "未実施";

  async function generate() {
    if (!record || selected.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      await generateDocuments(record, selected);
      setMessage("新しい版として生成しました。内容を確認してください。");
    } catch (e) {
      setMessage(`生成に失敗しました：${messageOf(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href={`/cases/${record.id}`} className="text-sm text-blue-700 hover:underline">
        ← 案件に戻る
      </Link>
      <h1 className="text-2xl font-semibold">申請書類作成：{record.caseName}</h1>

      <p className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
        この文書は、現在保存されている案件情報から生成されます。出力後、行政書士が内容を確認してください。
        生成した文書は内部確認用であり、公式の申請様式ではありません。
      </p>

      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm">
        <h2 className="mb-3 font-semibold">データ状態</h2>
        <dl className="grid grid-cols-[10rem_1fr] gap-y-2">
          <dt className="text-slate-500">申請人情報</dt>
          <dd>{record.applicant.confirmationStatus === "confirmed" ? "確認済み" : "下書き（未確認）"}</dd>
          <dt className="text-slate-500">必要書類</dt>
          <dd>
            {ev.ruleSet ? `必要 ${ev.requiredCount} 件中 ${ev.receivedCount} 件が収集済み` : "規則の対象外（追加した書類のみ）"}
          </dd>
          <dt className="text-slate-500">申請前チェック</dt>
          <dd>{checksDone}</dd>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">出力内容</h2>
        <div className="space-y-2 text-sm">
          {INTERNAL_DOCUMENT_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(t)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, t] : s.filter((x) => x !== t)))}
              />
              {DOCUMENT_TYPE_LABELS[t]}
            </label>
          ))}
          <label className="flex items-center gap-2 text-slate-400">
            <input type="checkbox" disabled />
            {DOCUMENT_TYPE_LABELS.reason_statement}（今後対応）
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => void generate()} disabled={busy || selected.length === 0 || !canEdit}>
            {busy ? "生成中……" : "生成して保存"}
          </Button>
          {!canEdit && <span className="text-sm text-slate-600">閲覧のみの権限のため、生成できません。</span>}
          {message && <span className="text-sm text-slate-600">{message}</span>}
        </div>
        <p className="mt-3 text-xs text-slate-500">再生成しても過去の版は上書きされず、新しい版として保存されます。</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-6 py-3 font-semibold">生成履歴</h2>
        {error && <p className="px-6 py-3 text-sm text-red-700">{error}</p>}
        {loaded && documents.length === 0 && <p className="px-6 py-6 text-sm text-slate-500">生成された文書はありません。</p>}
        {documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between border-b border-slate-100 px-6 py-3 text-sm last:border-b-0">
            <span>
              <Link href={`/cases/${record.id}/documents/${d.id}`} className="text-blue-700 hover:underline">
                {DOCUMENT_TYPE_LABELS[d.documentType]} v{d.version}
              </Link>
              {d.outputFormat !== "html" && (
                <span className="ml-2 text-xs text-slate-500">（{OUTPUT_FORMAT_LABELS[d.outputFormat]}）</span>
              )}
            </span>
            <span className="flex items-center gap-3">
              <Badge tone={d.status === "draft" ? "yellow" : d.status === "archived" ? "gray" : "green"}>
                {GENERATED_STATUS_LABELS[d.status]}
              </Badge>
              <span className="text-slate-500">{formatDateTime(d.createdAt)}</span>
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
