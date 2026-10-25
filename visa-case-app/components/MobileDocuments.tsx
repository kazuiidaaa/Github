"use client";

import { useState } from "react";
import { UnresolvedNote } from "@/components/documents/UnresolvedNote";
import { BackLink } from "@/components/mobile/BackLink";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { Badge, Button } from "@/components/ui";
import { unresolvedCount } from "@/lib/checks/definitions";
import { generateDocuments, useGeneratedDocuments } from "@/lib/documents/store";
import { splitHistory } from "@/lib/documents/history";
import { precheckWarnings } from "@/lib/documents/precheck";
import { INTERNAL_DOCUMENT_TYPES, isOfficialForm, type InternalDocumentType } from "@/lib/documents/types";
import { messageOf } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { errorText, precheckRowsText, useDocumentLabels } from "@/lib/i18n/documentsView";
import { useT } from "@/lib/i18n/LanguageProvider";
import { evaluate } from "@/lib/requirements/evaluate";
import { useCan } from "@/lib/store";
import type { CaseRecord } from "@/lib/types";

/** 選択中を示す印（色だけでなく図形と文字で示す） */
function Mark({ on }: { on: boolean }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold">
      {on ? (
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 8.5 3.5 3.5L13 4.5" />
        </svg>
      ) : null}
      {on ? t("mobileDocuments.selected") : t("mobileDocuments.notSelected")}
    </span>
  );
}

/**
 * 書類（iPhone 版）。PC 版の「書類の生成と履歴」と同じ経路（lib/documents/store.ts）・同じ判定を使う。
 * 公式様式（エクセル）の作成、書類の内容の表示・出力・状態の変更・保管は PC 版で行う。
 */
export function MobileDocuments({ record }: { record: CaseRecord }) {
  const t = useT();
  const docLabels = useDocumentLabels();
  const canEdit = useCan("edit");
  const { documents, loaded, error } = useGeneratedDocuments(record.id);
  // PC 版の既定と同じ（公式様式・ご案内書類は、初期は選ばない）。公式様式は iPhone 版では扱わない
  const types = INTERNAL_DOCUMENT_TYPES.filter((x) => !isOfficialForm(x));
  const [selected, setSelected] = useState<InternalDocumentType[]>(types.filter((x) => x !== "client_guide"));
  const [includeReceived, setIncludeReceived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const ev = evaluate(record);
  const rows = precheckRowsText(t, {
    applicantConfirmed: record.applicant.confirmationStatus === "confirmed",
    hasRuleSet: !!ev.ruleSet,
    requiredCount: ev.requiredCount,
    receivedCount: ev.receivedCount,
    checksTotal: record.checks.length,
    checksUnresolved: unresolvedCount(record.checks),
  });
  const precheckNotes = precheckWarnings(rows);
  const { active, archived } = splitHistory(documents);
  const visible = showArchived ? documents : active;

  async function generate() {
    if (selected.length === 0) return;
    setBusy(true);
    setMessage(t("documents.generating"));
    setFailure("");
    try {
      await generateDocuments(record, selected, { includeReceived });
      setMessage(t("documents.generated"));
    } catch (e) {
      setMessage("");
      setFailure(t("documents.genFailed", { reason: errorText(t, messageOf(e)) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <LargeTitleHeader
        title={t("mobileDocuments.title")}
        leading={<BackLink href={`/m/cases/${record.id}`} label={t("mobileDocuments.backLabel")} ariaLabel={t("mobileDocuments.backAria")} />}
      />
      <p className="px-4 text-sm text-slate-600">{t("documents.intro")}</p>

      <GroupedList header={t("documents.dataStatus")}>
        {rows.map((r) => (
          <GroupedRow
            key={r.key}
            title={r.label}
            subtitle={r.detail || undefined}
            trailing={<Badge tone={r.tone === "done" ? "green" : r.tone === "warn" ? "yellow" : "gray"}>{r.status}</Badge>}
          />
        ))}
      </GroupedList>

      <GroupedList header={t("documents.outputTitle")} footer={t("mobileDocuments.officialNote")}>
        {types.map((type) => (
          <GroupedRow
            key={type}
            title={docLabels.documentType(type)}
            trailing={<Mark on={selected.includes(type)} />}
            pressed={selected.includes(type)}
            chevron={false}
            onClick={() => setSelected((s) => (s.includes(type) ? s.filter((x) => x !== type) : [...s, type]))}
          />
        ))}
        {selected.includes("client_guide") && (
          <GroupedRow
            title={t("documents.includeReceived")}
            subtitle={t("documents.guideNote")}
            trailing={<Mark on={includeReceived} />}
            pressed={includeReceived}
            chevron={false}
            onClick={() => setIncludeReceived((v) => !v)}
          />
        )}
      </GroupedList>

      <div className="mx-4">
        <UnresolvedNote count={precheckNotes.length} />
        <Button className="mt-4 w-full" onClick={() => void generate()} disabled={busy || selected.length === 0 || !canEdit}>
          {busy ? t("documents.generating") : t("documents.generate")}
        </Button>
        {!canEdit && <p className="mt-2 text-sm text-slate-600">{t("documents.readOnly")}</p>}
        {/* 結果の表示要素は、結果が出る前から画面に置く（後から追加すると読み上げられない場合があるため） */}
        <p role="status" className="mt-2 text-sm text-slate-600">
          {message}
        </p>
        <p role="alert" className="text-sm text-red-700">
          {failure}
        </p>
        <p className="mt-1 text-xs text-slate-600">{t("documents.versionNote")}</p>
      </div>

      <GroupedList header={t("documents.history")} footer={t("mobileDocuments.historyNote")}>
        {error && <GroupedRow title={<span role="alert">{t("documents.errorWithReload", { error: errorText(t, error) })}</span>} />}
        {loaded && documents.length === 0 && <GroupedRow title={t("documents.noDocs")} />}
        {loaded && documents.length > 0 && visible.length === 0 && <GroupedRow title={t("documents.noVisible")} />}
        {visible.map((d) => (
          <GroupedRow
            key={d.id}
            title={t("documents.versionName", { label: docLabels.documentType(d.documentType), version: d.version })}
            subtitle={`${formatDateTime(d.createdAt)}${d.outputFormat !== "html" ? ` ${t("documents.formatSuffix", { format: docLabels.outputFormat(d.outputFormat) })}` : ""}`}
            trailing={<Badge tone={d.status === "draft" ? "yellow" : d.status === "archived" ? "gray" : "green"}>{docLabels.status(d.status)}</Badge>}
          />
        ))}
        {archived.length > 0 && (
          <GroupedRow
            title={t("documents.showArchived", { count: archived.length })}
            subtitle={showArchived ? t("mobileDocuments.showArchivedOn") : t("mobileDocuments.showArchivedOff")}
            trailing={<Mark on={showArchived} />}
            pressed={showArchived}
            chevron={false}
            onClick={() => setShowArchived((v) => !v)}
          />
        )}
      </GroupedList>

      <GroupedList>
        {/* /cases/[id]/documents は端末の振り分け対象外のため、そのまま PC 版の画面を開く */}
        <GroupedRow href={`/cases/${record.id}/documents`} title={<span className="text-accent font-bold">{t("mobileDocuments.openInDesktop")}</span>} />
      </GroupedList>
    </>
  );
}
