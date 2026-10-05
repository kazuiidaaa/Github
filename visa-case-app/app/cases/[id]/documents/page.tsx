"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { messageOf } from "@/lib/errors";
import { OfficialFormNotice } from "@/components/documents/OfficialFormNotice";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge, Button } from "@/components/ui";
import { changeStatus, generateDocuments, useGeneratedDocuments } from "@/lib/documents/store";
import { OFFICIAL_FORM_LOGIN_REQUIRED, officialFormNeedsLogin } from "@/lib/documents/officialFormAccess";
import { useDemo } from "@/lib/demo";
import { splitHistory } from "@/lib/documents/history";
import { officialFormScopeWarnings } from "@/lib/documents/officialForms";
import { precheckRows, precheckWarnings } from "@/lib/documents/precheck";
import {
  DOCUMENT_TYPE_LABELS,
  GENERATED_STATUS_LABELS,
  INTERNAL_DOCUMENT_TYPES,
  OUTPUT_FORMAT_LABELS,
  type GeneratedDocument,
  isOfficialForm,
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
  const needsLogin = officialFormNeedsLogin(useDemo());
  const { documents, loaded, error } = useGeneratedDocuments(id);
  const [selected, setSelected] = useState<InternalDocumentType[]>(INTERNAL_DOCUMENT_TYPES.filter((t) => !isOfficialForm(t)));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [newIds, setNewIds] = useState<string[]>([]);
  const [archiving, setArchiving] = useState<GeneratedDocument | null>(null);
  const historyRef = useRef<HTMLElement>(null);
  const knownIds = useRef<Set<string> | null>(null);

  // 生成で追加された版（生成前に存在しなかった版）を特定する。
  useEffect(() => {
    const before = knownIds.current;
    if (!before) return;
    const added = documents.filter((d) => !before.has(d.id)).map((d) => d.id);
    if (added.length === 0) return;
    knownIds.current = null;
    setNewIds(added);
  }, [documents]);

  // 生成直後に、追加された版を強調して生成履歴へスクロールする。数秒後に強調を外す。
  useEffect(() => {
    if (newIds.length === 0) return;
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const timer = setTimeout(() => setNewIds([]), 6000);
    return () => clearTimeout(timer);
  }, [newIds]);

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
  const officialSelected = selected.some(isOfficialForm);
  const scopeWarnings = officialFormScopeWarnings({
    procedureType: record.procedureType,
    currentStatus: record.currentStatus,
    residenceStatus: record.applicant.residenceStatus,
  });
  const rows = precheckRows({
    applicantConfirmed: record.applicant.confirmationStatus === "confirmed",
    hasRuleSet: !!ev.ruleSet,
    requiredCount: ev.requiredCount,
    receivedCount: ev.receivedCount,
    checksTotal: record.checks.length,
    checksUnresolved: unresolvedCount(record.checks),
  });
  const precheckNotes = precheckWarnings(rows);

  async function generate() {
    if (!record || selected.length === 0) return;
    setBusy(true);
    setMessage("");
    knownIds.current = new Set(documents.map((d) => d.id));
    try {
      await generateDocuments(record, selected);
      setMessage("新しい版として生成しました。内容を確認してください。");
    } catch (e) {
      knownIds.current = null;
      setMessage(`生成に失敗しました：${messageOf(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function archive(d: GeneratedDocument) {
    setArchiving(null);
    setMessage("");
    try {
      await changeStatus(d, "archived", "");
    } catch (e) {
      setMessage(`保管への変更に失敗しました：${messageOf(e)}`);
    }
  }

  const { active, archived } = splitHistory(documents);
  const visible = showArchived ? documents : active;

  return (
    <div className="space-y-6">
      <Link href={`/cases/${record.id}`} className="text-sm text-blue-700 hover:underline">
        ← 案件に戻る
      </Link>
      <h1 className="text-2xl font-semibold">申請書類作成：{record.caseName}</h1>

      <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
        この文書は、現在保存されている案件情報から生成されます。出力後、行政書士が内容を確認してください。
        生成した文書は内部確認用であり、公式の申請様式ではありません（「公式申請様式」は、公式のエクセル様式へ案件情報を差し込んだ下書きです）。
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <h2 className="mb-3 font-semibold">データ状態</h2>
        <dl className="grid grid-cols-[9rem_1fr] items-center gap-y-3">
          {rows.map((r) => (
            <Fragment key={r.key}>
              <dt className="text-slate-500">{r.label}</dt>
              <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Badge tone={r.tone === "done" ? "green" : r.tone === "warn" ? "yellow" : "gray"}>{r.status}</Badge>
                {r.detail && <span>{r.detail}</span>}
                <Link href={`/cases/${record.id}?tab=${r.tab}`} className="text-blue-700 hover:underline">
                  {r.unresolved ? "確認・対応する" : "開く"}
                </Link>
              </dd>
            </Fragment>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">出力内容</h2>
        <div className="space-y-2 text-sm">
          {INTERNAL_DOCUMENT_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={isOfficialForm(t) && needsLogin}
                checked={selected.includes(t)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, t] : s.filter((x) => x !== t)))}
              />
              {DOCUMENT_TYPE_LABELS[t]}
              {isOfficialForm(t) && <span className="text-xs text-slate-500">（エクセル）</span>}
              {isOfficialForm(t) && needsLogin && <span className="text-xs text-amber-900">{OFFICIAL_FORM_LOGIN_REQUIRED}</span>}
            </label>
          ))}
          <label className="flex items-center gap-2 text-slate-400">
            <input type="checkbox" disabled />
            {DOCUMENT_TYPE_LABELS.reason_statement}（今後対応）
          </label>
        </div>
        {officialSelected && (
          <div className="mt-4 space-y-2">
            {scopeWarnings.map((w) => (
              <p key={w} role="alert" className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">
                注意：{w}（生成はできます）
              </p>
            ))}
            <OfficialFormNotice />
          </div>
        )}
        {precheckNotes.length > 0 && (
          <div role="note" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">
            <p>注意：次の事項が未解決です（生成はできます）。生成した書類は、行政書士が内容を確認してから使用してください。</p>
            <ul className="mt-1 list-disc pl-5">
              {precheckNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => void generate()} disabled={busy || selected.length === 0 || !canEdit}>
            {busy ? "生成中……" : "生成して保存"}
          </Button>
          {!canEdit && <span className="text-sm text-slate-600">閲覧のみの権限のため、生成できません。</span>}
          {message && <span className="text-sm text-slate-600">{message}</span>}
        </div>
        <p className="mt-3 text-xs text-slate-500">再生成しても過去の版は上書きされず、新しい版として保存されます。</p>
      </section>

      <section ref={historyRef} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
          <h2 className="font-semibold">生成履歴</h2>
          {archived.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              保管済みを表示（{archived.length}件）
            </label>
          )}
        </div>
        {error && <p className="px-6 py-3 text-sm text-red-700">{error}</p>}
        {loaded && documents.length === 0 && <p className="px-6 py-6 text-sm text-slate-500">生成された文書はありません。</p>}
        {loaded && documents.length > 0 && visible.length === 0 && (
          <p className="px-6 py-6 text-sm text-slate-500">表示する版はありません。保管済みの版は、上の選択で表示できます。</p>
        )}
        {visible.map((d) => (
          <div
            key={d.id}
            className={`flex items-center justify-between border-b border-slate-100 px-6 py-3 text-sm transition-colors last:border-b-0 ${
              newIds.includes(d.id) ? "bg-yellow-50" : ""
            }`}
          >
            <span>
              <Link href={`/cases/${record.id}/documents/${d.id}`} className="text-blue-700 hover:underline">
                {DOCUMENT_TYPE_LABELS[d.documentType]} v{d.version}
              </Link>
              {d.outputFormat !== "html" && (
                <span className="ml-2 text-xs text-slate-500">（{OUTPUT_FORMAT_LABELS[d.outputFormat]}）</span>
              )}
            </span>
            <span className="flex items-center gap-3">
              {newIds.includes(d.id) && <Badge tone="green">新規</Badge>}
              <Badge tone={d.status === "draft" ? "yellow" : d.status === "archived" ? "gray" : "green"}>
                {GENERATED_STATUS_LABELS[d.status]}
              </Badge>
              <span className="text-slate-500">{formatDateTime(d.createdAt)}</span>
              {canEdit && d.status !== "archived" && (
                <Button variant="secondary" onClick={() => setArchiving(d)}>
                  保管にする
                </Button>
              )}
            </span>
          </div>
        ))}
      </section>
      {archiving && (
        <ConfirmDialog
          title="書類を保管にする"
          message={`${DOCUMENT_TYPE_LABELS[archiving.documentType]} v${archiving.version} を保管にします。一覧では初期状態で非表示になります。`}
          note="「保管済みを表示」にすると、保管した版を見られます。画面から保管を取り消す操作はありません。操作の記録（監査ログ）が残ります。"
          confirmLabel="保管にする"
          onCancel={() => setArchiving(null)}
          onConfirm={() => void archive(archiving)}
        />
      )}
    </div>
  );
}
