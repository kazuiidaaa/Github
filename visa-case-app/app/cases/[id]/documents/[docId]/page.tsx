"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { messageOf } from "@/lib/errors";
import { ClientGuideSheet } from "@/components/documents/ClientGuideSheet";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { OfficialFormNotice } from "@/components/documents/OfficialFormNotice";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui";
import { LoadingNotice } from "@/components/LoadingNotice";
import { changeStatus, downloadFile, exportFile, useGeneratedDocuments } from "@/lib/documents/store";
import { DEFAULT_LANG, LANGS, LANG_LABELS, isLang, readStoredLang, storeLang, type Lang } from "@/lib/documents/lang";
import { officialFormNeedsLogin } from "@/lib/documents/officialFormAccess";
import { isOfficialForm } from "@/lib/documents/types";
import { useDemo } from "@/lib/demo";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import { errorText, useDocumentLabels } from "@/lib/i18n/documentsView";
import type { MessageKey } from "@/lib/i18n/messages";
import { getConfirmerName, useCan, useCase } from "@/lib/store";

type StatusChange = "reviewed" | "submitted" | "archived";

/** 状態変更の確認ダイアログの文言のキー。影響は changeStatus（lib/documents/store.ts）の実際の処理に即して書く */
const STATUS_CONFIRM: Record<StatusChange, { title: MessageKey; message: MessageKey; note: MessageKey; label: MessageKey }> = {
  reviewed: {
    title: "documentView.reviewedTitle",
    message: "documentView.reviewedMessage",
    note: "documentView.reviewedNote",
    label: "documentView.reviewedLabel",
  },
  submitted: {
    title: "documentView.submittedTitle",
    message: "documentView.submittedMessage",
    note: "documentView.submittedNote",
    label: "documentView.submittedLabel",
  },
  archived: {
    title: "documentView.archivedTitle",
    message: "documentView.archivedMessage",
    note: "documentView.archivedNote",
    label: "documentView.archivedLabel",
  },
};

export default function DocumentPreviewPage() {
  const { id, docId } = useParams<{ id: string; docId: string }>();
  const t = useT();
  const { lang: screenLang } = useLang();
  const docLabels = useDocumentLabels();
  const record = useCase(id);
  const canEdit = useCan("edit");
  const needsLogin = officialFormNeedsLogin(useDemo());
  const { documents, loaded, error } = useGeneratedDocuments(id);
  const doc = documents.find((d) => d.id === docId);
  // 失敗の種類と理由（日本語）を持ち、表示のたびに現在の言語へ引き直す
  const [failure, setFailure] = useState<{ kind: "file" | "status"; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<StatusChange | null>(null);
  // ご案内書類の表示・出力の言語。直前に選んだ言語を既定にする。案件・保存済みの内容には書き込まない
  const [lang, setLang] = useState<Lang>(() => (typeof window === "undefined" ? DEFAULT_LANG : readStoredLang()));
  const router = useRouter();

  if (!doc) {
    return loaded ? (
      <div>
        <p className="mb-4">{t("documentView.notFound")}</p>
        <Link href={`/cases/${id}/documents`} className="text-blue-700 hover:underline">
          {t("documentView.back")}
        </Link>
      </div>
    ) : (
      <LoadingNotice error={error} />
    );
  }

  const stale = !!record && record.updatedAt > doc.content.source.caseUpdatedAt;
  // 言語を選べるのは、ご案内書類の画面の版（Word・PDF は、この版から出力する）
  const langChoosable = doc.documentType === "client_guide" && doc.outputFormat === "html";
  const outLang: Lang = langChoosable ? lang : DEFAULT_LANG;
  const latest = documents.filter((d) => d.documentType === doc.documentType).reduce((m, d) => Math.max(m, d.version), 0);

  function chooseLang(v: string) {
    if (!isLang(v)) return;
    setLang(v);
    storeLang(v);
  }

  async function file(mode: "docx" | "pdf" | "xlsx" | "download") {
    if (!doc) return;
    setBusy(true);
    setFailure(null);
    try {
      if (mode === "download") {
        await downloadFile(doc, outLang);
      } else {
        // 保存済みの内容から、新しい版として出力する。元の版は変更しない
        const created = await exportFile(doc, mode, undefined, outLang);
        await downloadFile(created, outLang);
        router.push(`/cases/${id}/documents/${created.id}`);
      }
    } catch (e) {
      setFailure({ kind: "file", reason: messageOf(e) });
    } finally {
      setBusy(false);
    }
  }

  async function run(status: StatusChange) {
    setAsking(null);
    if (!doc) return;
    try {
      await changeStatus(doc, status, status === "reviewed" ? await getConfirmerName() : "");
      setFailure(null);
    } catch (e) {
      setFailure({ kind: "status", reason: messageOf(e) });
    }
  }

  return (
    <div>
      {/* 印刷時は、画面上部のヘッダーと操作部を隠す */}
      <style>{`@media print { header { display: none; } }`}</style>
      <div className="mb-4 space-y-3 print:hidden">
        <Link href={`/cases/${id}/documents`} className="text-sm text-blue-700 hover:underline">
          {t("documentView.back")}
        </Link>
        {stale && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            {t("documentView.stale")}
          </p>
        )}
        {doc.outputFormat !== "html" && (
          <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
            {t("documentView.outputNote", { format: docLabels.outputFormat(doc.outputFormat) })}
          </p>
        )}
        {isOfficialForm(doc.documentType) && <OfficialFormNotice />}
        {/* 画面の言語と書類の言語は別。画面を日本語以外にしたときに、書類の言語が変わらないことを示す */}
        {screenLang !== "ja" && (
          <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
            {t(
              doc.documentType !== "client_guide"
                ? "documentView.langNoticeJa"
                : langChoosable
                  ? "documentView.langNoticeGuide"
                  : "documentView.langNoticeSaved",
            )}
          </p>
        )}
        {langChoosable && (
          <div className="space-y-2">
            <ChoiceGroup
              legend={t("documentView.guideLangLegend")}
              options={LANGS.map((l) => ({ value: l, label: LANG_LABELS[l] }))}
              value={lang}
              onChange={chooseLang}
              hint={t("documentView.guideLangHint")}
            />
            {lang !== "ja" && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                {t("documentView.guideLangNotice")}
              </p>
            )}
          </div>
        )}
        {doc.version < latest && (
          <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{t("documentView.newerVersion", { latest })}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && doc.status === "draft" && (
            <Button onClick={() => setAsking("reviewed")}>{t("documentView.markReviewed")}</Button>
          )}
          {canEdit && doc.status === "reviewed" && (
            <Button onClick={() => setAsking("submitted")}>{t("documentView.markSubmitted")}</Button>
          )}
          {canEdit && doc.status !== "archived" && (
            <Button variant="secondary" onClick={() => setAsking("archived")}>
              {t("documentView.markArchived")}
            </Button>
          )}
          {doc.outputFormat !== "html" ? (
            <Button variant="secondary" disabled={busy} onClick={() => void file("download")}>
              {t("documentView.download", { format: docLabels.outputFormat(doc.outputFormat) })}
            </Button>
          ) : isOfficialForm(doc.documentType) ? (
            <Button variant="secondary" disabled={busy || !canEdit || needsLogin} onClick={() => void file("xlsx")}>
              {busy ? t("documentView.exporting") : t("documentView.exportXlsx")}
            </Button>
          ) : (
            <>
              <Button variant="secondary" disabled={busy || !canEdit} onClick={() => void file("docx")}>
                {busy ? t("documentView.exporting") : t("documentView.exportDocx")}
              </Button>
              <Button variant="secondary" disabled={busy || !canEdit} onClick={() => void file("pdf")}>
                {busy ? t("documentView.exporting") : t("documentView.exportPdf")}
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            {t("documentView.print")}
          </Button>
          {needsLogin && isOfficialForm(doc.documentType) && (
            <span className="text-sm text-amber-900">{t("documents.officialLoginRequired")}</span>
          )}
          <span role="alert" className="text-sm text-red-700">
            {failure && t(failure.kind === "file" ? "documentView.fileFailed" : "documentView.statusFailed", { reason: errorText(t, failure.reason) })}
          </span>
        </div>
      </div>
      {doc.documentType === "client_guide" ? <ClientGuideSheet doc={doc} lang={outLang} /> : <DocumentSheet doc={doc} />}
      {asking && (
        <ConfirmDialog
          title={t(STATUS_CONFIRM[asking].title)}
          message={t(STATUS_CONFIRM[asking].message)}
          note={t(STATUS_CONFIRM[asking].note)}
          confirmLabel={t(STATUS_CONFIRM[asking].label)}
          onCancel={() => setAsking(null)}
          onConfirm={() => void run(asking)}
        />
      )}
    </div>
  );
}
