"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { messageOf } from "@/lib/errors";
import { OfficialFormNotice } from "@/components/documents/OfficialFormNotice";
import { UnresolvedNote } from "@/components/documents/UnresolvedNote";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingNotice } from "@/components/LoadingNotice";
import { Badge, Button } from "@/components/ui";
import { changeStatus, generateDocuments, useGeneratedDocuments } from "@/lib/documents/store";
import { officialFormNeedsLogin } from "@/lib/documents/officialFormAccess";
import { useDemo } from "@/lib/demo";
import { splitHistory } from "@/lib/documents/history";
import { precheckWarnings } from "@/lib/documents/precheck";
import {
  INTERNAL_DOCUMENT_TYPES,
  type GeneratedDocument,
  isOfficialForm,
  type InternalDocumentType,
} from "@/lib/documents/types";
import { unresolvedCount } from "@/lib/checks/definitions";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import { errorText, precheckRowsText, scopeWarningsText, useDocumentLabels } from "@/lib/i18n/documentsView";
import { evaluate } from "@/lib/requirements/evaluate";
import { useCan, useCase, useStoreLoaded } from "@/lib/store";

export default function DocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const docLabels = useDocumentLabels();
  const record = useCase(id);
  const storeLoaded = useStoreLoaded();
  const canEdit = useCan("edit");
  const needsLogin = officialFormNeedsLogin(useDemo());
  const { documents, loaded, error } = useGeneratedDocuments(id);
  const [selected, setSelected] = useState<InternalDocumentType[]>(INTERNAL_DOCUMENT_TYPES.filter((t) => !isOfficialForm(t) && t !== "client_guide"));
  const [includeReceived, setIncludeReceived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [newIds, setNewIds] = useState<string[]>([]);
  const [archiving, setArchiving] = useState<GeneratedDocument | null>(null);
  const historyRef = useRef<HTMLElement>(null);

  // 生成直後に、追加・更新された版を強調して生成履歴へスクロールする。数秒後に強調を外す。
  useEffect(() => {
    if (newIds.length === 0) return;
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const timer = setTimeout(() => setNewIds([]), 6000);
    return () => clearTimeout(timer);
  }, [newIds]);

  if (!record && !storeLoaded) return <LoadingNotice />;
  if (!record) {
    return (
      <div>
        <p className="mb-4">{t("documents.notFound")}</p>
        <Link href="/cases" className="text-blue-700 hover:underline">
          {t("documents.backToCases")}
        </Link>
      </div>
    );
  }

  const ev = evaluate(record);
  const officialSelected = selected.some(isOfficialForm);
  const scopeWarnings = scopeWarningsText(t, {
    procedureType: record.procedureType,
    currentStatus: record.currentStatus,
    residenceStatus: record.applicant.residenceStatus,
  });
  const rows = precheckRowsText(t, {
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
    setMessage(t("documents.generating"));
    setFailure("");
    try {
      const touched = await generateDocuments(record, selected, { includeReceived });
      setNewIds(touched.map((d) => d.id));
      setMessage(t("documents.generated"));
    } catch (e) {
      setMessage("");
      setFailure(t("documents.genFailed", { reason: errorText(t, messageOf(e)) }));
    } finally {
      setBusy(false);
    }
  }

  async function archive(d: GeneratedDocument) {
    setArchiving(null);
    setMessage("");
    setFailure("");
    try {
      await changeStatus(d, "archived", "");
    } catch (e) {
      setFailure(t("documents.archiveFailed", { reason: errorText(t, messageOf(e)) }));
    }
  }

  const { active, archived } = splitHistory(documents);
  const visible = showArchived ? documents : active;

  return (
    <div className="space-y-6">
      <Link href={`/cases/${record.id}`} className="text-sm text-blue-700 hover:underline">
        {t("documents.backToCase")}
      </Link>
      <h1 className="text-2xl font-semibold">{t("documents.title", { name: record.caseName })}</h1>

      <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
        {t("documents.intro")}
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <h2 className="mb-3 font-semibold">{t("documents.dataStatus")}</h2>
        <dl className="grid grid-cols-[9rem_1fr] items-center gap-y-3">
          {rows.map((r) => (
            <Fragment key={r.key}>
              <dt className="text-slate-500">{r.label}</dt>
              <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Badge tone={r.tone === "done" ? "green" : r.tone === "warn" ? "yellow" : "gray"}>{r.status}</Badge>
                {r.detail && <span>{r.detail}</span>}
                <Link href={`/cases/${record.id}?tab=${r.tab}`} className="text-blue-700 hover:underline">
                  {r.unresolved ? t("documents.resolve") : t("documents.open")}
                </Link>
              </dd>
            </Fragment>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">{t("documents.outputTitle")}</h2>
        <div className="space-y-2 text-sm">
          {INTERNAL_DOCUMENT_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={isOfficialForm(type) && needsLogin}
                checked={selected.includes(type)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, type] : s.filter((x) => x !== type)))}
              />
              {docLabels.documentType(type)}
              {isOfficialForm(type) && <span className="text-xs text-slate-500">{t("documents.excelSuffix")}</span>}
              {isOfficialForm(type) && needsLogin && <span className="text-xs text-amber-900">{t("documents.officialLoginRequired")}</span>}
            </label>
          ))}
          <label className="flex items-center gap-2 text-slate-400">
            <input type="checkbox" disabled />
            {t("documents.comingSoon", { label: docLabels.documentType("reason_statement") })}
          </label>
        </div>
        {selected.includes("client_guide") && (
          <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
            <p>
              {t("documents.guideNote")}
            </p>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeReceived} onChange={(e) => setIncludeReceived(e.target.checked)} />
              {t("documents.includeReceived")}
            </label>
          </div>
        )}
        {officialSelected && (
          <div className="mt-4 space-y-2">
            {scopeWarnings.map((w) => (
              <p key={w} role="alert" className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">
                {t("documents.scopeNote", { warning: w })}
              </p>
            ))}
            <OfficialFormNotice />
          </div>
        )}
        <UnresolvedNote count={precheckNotes.length} />
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => void generate()} disabled={busy || selected.length === 0 || !canEdit}>
            {busy ? t("documents.generating") : t("documents.generate")}
          </Button>
          {!canEdit && <span className="text-sm text-slate-600">{t("documents.readOnly")}</span>}
          {/* 結果の表示要素は、結果が出る前から画面に置く（後から追加すると読み上げられない場合があるため） */}
          <span role="status" className="text-sm text-slate-600">
            {message}
          </span>
          <span role="alert" className="text-sm text-red-700">
            {failure}
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("documents.versionNote")}</p>
      </section>

      <section ref={historyRef} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
          <h2 className="font-semibold">{t("documents.history")}</h2>
          {archived.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              {t("documents.showArchived", { count: archived.length })}
            </label>
          )}
        </div>
        {error && (
          <p role="alert" className="px-6 py-3 text-sm text-red-700">
            {t("documents.errorWithReload", { error: errorText(t, error) })}
          </p>
        )}
        {loaded && documents.length === 0 && <p className="px-6 py-6 text-sm text-slate-500">{t("documents.noDocs")}</p>}
        {loaded && documents.length > 0 && visible.length === 0 && (
          <p className="px-6 py-6 text-sm text-slate-500">{t("documents.noVisible")}</p>
        )}
        {visible.map((d) => (
          <div
            key={d.id}
            className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-100 px-6 py-3 text-sm transition-colors last:border-b-0 ${
              newIds.includes(d.id) ? "bg-yellow-50" : ""
            }`}
          >
            <span>
              {newIds.includes(d.id) && <span className="sr-only">{t("documents.newSr")}</span>}
              <Link href={`/cases/${record.id}/documents/${d.id}`} className="text-blue-700 hover:underline">
                {t("documents.versionName", { label: docLabels.documentType(d.documentType), version: d.version })}
              </Link>
              {d.outputFormat !== "html" && (
                <span className="ml-2 text-xs text-slate-500">{t("documents.formatSuffix", { format: docLabels.outputFormat(d.outputFormat) })}</span>
              )}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {newIds.includes(d.id) && <Badge tone="green">{t("documents.newBadge")}</Badge>}
              <Badge tone={d.status === "draft" ? "yellow" : d.status === "archived" ? "gray" : "green"}>
                {docLabels.status(d.status)}
              </Badge>
              <span className="text-slate-500">{formatDateTime(d.createdAt)}</span>
              {canEdit && d.status !== "archived" && (
                <Button variant="secondary" onClick={() => setArchiving(d)}>
                  {t("documents.archiveBtn")}
                </Button>
              )}
            </span>
          </div>
        ))}
      </section>
      {archiving && (
        <ConfirmDialog
          title={t("documents.archiveTitle")}
          message={t("documents.archiveMessage", { label: docLabels.documentType(archiving.documentType), version: archiving.version })}
          note={t("documents.archiveNote")}
          confirmLabel={t("documents.archiveBtn")}
          onCancel={() => setArchiving(null)}
          onConfirm={() => void archive(archiving)}
        />
      )}
    </div>
  );
}
