"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppError, messageOf } from "@/lib/errors";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ConfirmDocumentDeleteDialog } from "@/components/ConfirmDocumentDeleteDialog";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { CaseInfoEditor } from "@/components/CaseInfoEditor";
import { ChecksPanel } from "@/components/ChecksPanel";
import { EmploymentForm } from "@/components/EmploymentForm";
import { FormDetailsForm } from "@/components/FormDetailsForm";
import { RequirementsPanel } from "@/components/RequirementsPanel";
import { LoadingNotice } from "@/components/LoadingNotice";
import { ApplicantForm } from "@/components/ApplicantForm";
import { MissingValue } from "@/components/MissingValue";
import { NextActionCard } from "@/components/NextActionCard";
import { useToast } from "@/components/Toast";
import { UploadBox } from "@/components/UploadBox";
import { Badge, Button } from "@/components/ui";
import { WorkflowBadge } from "@/components/WorkflowBadge";
import { findDocumentOfType, removeDocumentOfType, type UploadedDocumentType } from "@/lib/documentKinds";
import { expiryLevel } from "@/lib/caseMetrics";
import { canJumpToApplicantField } from "@/lib/applicantFields";
import { unresolvedCount } from "@/lib/checks/definitions";
import { daysUntil, formatDate, formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { useLabels } from "@/lib/i18n/labels";
import { evaluate } from "@/lib/requirements/evaluate";
import { deleteCase, getDocumentSignedUrl, logAudit, updateCase, useCan, useCase, useStoreLoaded } from "@/lib/store";
import { PROCEDURE_TYPES, type DocumentRecord } from "@/lib/types";

type Tab = "overview" | "documents" | "applicant" | "employment" | "formDetails" | "requirements" | "checks";
const TABS = [
  { key: "overview", label: "casePage.tab_overview" },
  { key: "documents", label: "casePage.tab_documents" },
  { key: "applicant", label: "casePage.tab_applicant" },
  { key: "employment", label: "casePage.tab_employment" },
  { key: "formDetails", label: "casePage.tab_formDetails" },
  { key: "requirements", label: "casePage.tab_requirements" },
  { key: "checks", label: "casePage.tab_checks" },
] as const satisfies readonly { key: Tab; label: MessageKey }[];
const TAB_KEYS = TABS.map((tb) => tb.key);
function parseTab(value: string | null): Tab {
  return TAB_KEYS.find((k) => k === value) ?? "overview";
}

/** アップロードした書類の種別名（表示部品の訳表を共用する） */
const UPLOADED_DOCUMENT_KEYS = {
  residence_card: "display.docResidenceCard",
  photo: "display.docPhoto",
} as const satisfies Record<UploadedDocumentType, MessageKey>;

function DocumentRow({
  doc,
  locked,
  readOnly,
  onDelete,
}: {
  doc: DocumentRecord;
  locked: boolean;
  readOnly: boolean;
  onDelete: () => void;
}) {
  const t = useT();
  const labels = useLabels();
  const [error, setError] = useState("");

  async function open() {
    setError("");
    try {
      let url: string;
      if (doc.dataUrl) url = URL.createObjectURL(await (await fetch(doc.dataUrl)).blob());
      else if (doc.storagePath) url = await getDocumentSignedUrl(doc.storagePath);
      else throw new AppError(t("casePage.docFileMissing"));
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(t("casePage.docOpenFailed", { reason: messageOf(e) }));
    }
  }

  return (
    <div className="px-6 py-3 text-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <span className="min-w-0 break-all">{t("casePage.documentLine", { label: t(UPLOADED_DOCUMENT_KEYS[doc.documentType]), file: doc.fileName })}</span>
        <span className="flex flex-wrap items-center gap-3 md:shrink-0 md:flex-nowrap">
          <Badge tone="blue">
            {labels.documentStatus(doc.status)}
          </Badge>
          <span className="text-slate-500">{formatDateTime(doc.uploadedAt)}</span>
          <Button variant="secondary" className="min-h-10 md:min-h-0" onClick={() => void open()}>
            {t("casePage.docView")}
          </Button>
          <Button variant="danger" className="min-h-10 md:min-h-0" disabled={locked || readOnly} onClick={onDelete}>
            {t("casePage.delete")}
          </Button>
        </span>
      </div>
      {locked && <p className="mt-1 text-xs text-slate-500">{t("casePage.docLocked")}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const record = useCase(id);
  const loaded = useStoreLoaded();
  const canEdit = useCan("edit");
  const canDelete = useCan("deleteCase");
  const searchParams = useSearchParams();
  // 開いているタブは URL の ?tab= から決める。切替は履歴を増やさないよう replace を使う
  const tab = parseTab(searchParams.get("tab"));
  function setTab(next: Tab) {
    router.replace(`/cases/${id}?tab=${next}`, { scroll: false });
  }
  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    const last = TABS.length - 1;
    const target =
      e.key === "ArrowRight" ? (index + 1) % TABS.length
      : e.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (target < 0) return;
    e.preventDefault();
    setTab(TABS[target].key);
    document.getElementById(`case-tab-${TABS[target].key}`)?.focus();
  }
  // 案件の読み込み後にタブバーが現れるため、その時点でも位置を合わせる
  const tabBarShown = !!record;
  useEffect(() => {
    // 選択中のタブが見える位置へ、タブバーだけを横にスクロールする
    document.getElementById(`case-tab-${tab}`)?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [tab, tabBarShown]);
  // 概要の「未入力」から移動するとき、タブの描画後にフォーカスする欄の id
  const pendingFocusId = useRef<string | null>(null);
  function jumpToField(id: string) {
    pendingFocusId.current = id;
    setTab("applicant");
  }
  useEffect(() => {
    if (tab !== "applicant" || !pendingFocusId.current) return;
    const el = document.getElementById(pendingFocusId.current);
    if (!el) return;
    pendingFocusId.current = null;
    // 選択式の欄（性別・在留資格）は、id が欄全体の枠にあるため、中の選択済み（または先頭）の項目へフォーカスする
    const target = el.matches("input,select,textarea,button")
      ? el
      : (el.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ?? el.querySelector<HTMLElement>('[role="radio"]:not(:disabled)'));
    if (!target) return;
    target.scrollIntoView({ block: "center" });
    target.focus();
  }, [tab, tabBarShown]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);

  if (!record && !loaded) return <LoadingNotice />;

  if (!record) {
    return (
      <div>
        <p className="mb-4">{t("casePage.notFound")}</p>
        <Link href="/cases" className="text-blue-700 hover:underline">
          {t("casePage.backToCases")}
        </Link>
      </div>
    );
  }

  const doc = findDocumentOfType(record.documents, "residence_card");
  const photo = findDocumentOfType(record.documents, "photo");

  function removeDocument(d: DocumentRecord) {
    updateCase(record!.id, (c) => ({
      ...c,
      // 証明写真の削除は、申請人情報の進行状況に影響しない
      workflowStatus: d.documentType === "photo" ? c.workflowStatus : "preparing",
      documents: removeDocumentOfType(c.documents, d.documentType),
    }));
    logAudit(record!.id, "document_deleted", { documentType: d.documentType });
    toast.success(t("casePage.documentDeleted", { label: t(UPLOADED_DOCUMENT_KEYS[d.documentType]) }));
  }
  const a = record.applicant;
  const jump = canJumpToApplicantField(canEdit, a.confirmationStatus) ? jumpToField : undefined;
  // タブ見出しの未対応表示。値が null のタブは表示しない（選択中のタブも表示する）。
  const tabIndicators: Partial<Record<Tab, string>> = {};
  if (a.confirmationStatus !== "confirmed") tabIndicators.applicant = t("casePage.tabUnconfirmed");
  const missingCount = evaluate(record).missing.length;
  if (missingCount > 0) tabIndicators.requirements = t("casePage.tabCount", { count: missingCount });
  const unresolvedChecks = unresolvedCount(record.checks);
  if (unresolvedChecks > 0) tabIndicators.checks = t("casePage.tabCount", { count: unresolvedChecks });
  const procedure = PROCEDURE_TYPES.find((p) => p.value === record.procedureType)?.label;

  return (
    <div>
      <Link href="/cases" className="text-sm text-blue-700 hover:underline">
        {t("casePage.backToCases")}
      </Link>
      <div className="mt-2 mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">{record.caseName}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            {procedure}
            <WorkflowBadge status={record.workflowStatus} />
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-2 md:w-auto md:shrink-0 md:justify-start">
        <Link
          href={`/cases/${record.id}/documents`}
          className="inline-flex min-h-10 items-center whitespace-nowrap md:min-h-0 rounded-full border border-line-strong bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50"
        >
          {t("casePage.createDocuments")}
        </Link>
        {canDelete && (
          <Button variant="danger" className="min-h-10 md:min-h-0" onClick={() => setConfirmingDelete(true)}>
            {t("casePage.delete")}
          </Button>
        )}
        </div>
      </div>
      {confirmingDelete && (
        <ConfirmDeleteDialog
          caseName={record.caseName}
          busy={deleting}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            setDeleting(true);
            const ok = await deleteCase(record.id);
            setDeleting(false);
            if (ok) {
              toast.success(t("casePage.caseDeleted"));
              router.push("/cases");
            }
            else setConfirmingDelete(false);
          }}
        />
      )}
      {docToDelete && (
        <ConfirmDocumentDeleteDialog
          fileName={docToDelete.fileName}
          onCancel={() => setDocToDelete(null)}
          onConfirm={() => {
            removeDocument(docToDelete);
            setDocToDelete(null);
          }}
        />
      )}

      <div role="tablist" aria-label={t("casePage.tabListLabel")} className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tb, i) => (
          <button
            key={tb.key}
            type="button"
            role="tab"
            id={`case-tab-${tb.key}`}
            aria-selected={tab === tb.key}
            aria-controls={tab === tb.key ? "case-tabpanel" : undefined}
            tabIndex={tab === tb.key ? 0 : -1}
            onClick={() => setTab(tb.key)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium ${
              tab === tb.key ? "border-b-2 border-accent text-foreground" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t(tb.label)}
            {tabIndicators[tb.key] && (
              <span className="ml-1.5">
                <Badge tone="yellow" icon={false}>{tabIndicators[tb.key]}</Badge>
              </span>
            )}
          </button>
        ))}
      </div>

      <div id="case-tabpanel" role="tabpanel" aria-labelledby={`case-tab-${tab}`}>
      {tab === "overview" && (
        <div className="space-y-4 md:space-y-6">
          {(() => {
            const level = expiryLevel(daysUntil(a.residenceExpiryDate));
            return level === "urgent" || level === "overdue" ? (
              <DeadlineBanner date={a.residenceExpiryDate} />
            ) : null;
          })()}
          <NextActionCard record={record} canEdit={canEdit} onGoTab={setTab} />
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              {t("casePage.applicantInfo")}
              <Badge tone={a.confirmationStatus === "confirmed" ? "green" : "yellow"}>
                {a.confirmationStatus === "confirmed" ? t("casePage.applicantConfirmed") : t("casePage.applicantDraft")}
              </Badge>
            </h2>
            <dl className="grid grid-cols-1 gap-y-1 text-sm md:grid-cols-[10rem_1fr] md:gap-y-3">
              {/* 未入力の項目は、編集できるときのみ、入力欄へ移動するボタンにする */}
              <dt className="text-slate-500">{t("casePage.field_legalName")}</dt>
              <dd className="mb-2 break-words md:mb-0">{a.legalName || <MissingValue field="legalName" label={t("casePage.field_legalName")} onJump={jump} />}</dd>
              <dt className="text-slate-500">{t("casePage.field_nationality")}</dt>
              <dd className="mb-2 break-words md:mb-0">{a.nationality || <MissingValue field="nationality" label={t("casePage.field_nationality")} onJump={jump} />}</dd>
              <dt className="text-slate-500">{t("casePage.field_dateOfBirth")}</dt>
              <dd className="mb-2 break-words md:mb-0">{a.dateOfBirth ? formatDate(a.dateOfBirth) : <MissingValue field="dateOfBirth" label={t("casePage.field_dateOfBirth")} onJump={jump} />}</dd>
              <dt className="text-slate-500">{t("casePage.field_gender")}</dt>
              <dd className="mb-2 break-words md:mb-0">{a.gender || <MissingValue field="gender" label={t("casePage.field_gender")} onJump={jump} />}</dd>
              <dt className="text-slate-500">{t("casePage.field_address")}</dt>
              <dd className="mb-2 break-words md:mb-0">{a.address || <MissingValue field="address" label={t("casePage.field_address")} onJump={jump} />}</dd>
              <dt className="text-slate-500">{t("casePage.field_residenceStatus")}</dt>
              <dd className="mb-2 break-words md:mb-0">{a.residenceStatus || <MissingValue field="residenceStatus" label={t("casePage.field_residenceStatus")} onJump={jump} />}</dd>
              <dt className="text-slate-500">{t("casePage.field_residenceExpiryDate")}</dt>
              <dd className="mb-2 md:mb-0">
                {a.residenceExpiryDate ? <ExpiryBadge date={a.residenceExpiryDate} /> : <MissingValue field="residenceExpiryDate" label={t("casePage.field_residenceExpiryDate")} onJump={jump} />}
              </dd>
              <dt className="text-slate-500">{t("casePage.field_residenceCardNumber")}</dt>
              <dd className="mb-2 break-words md:mb-0">{a.residenceCardNumber || <MissingValue field="residenceCardNumber" label={t("casePage.field_residenceCardNumber")} onJump={jump} />}</dd>
              <dt className="text-slate-500">{t("casePage.field_workRestriction")}</dt>
              <dd className="mb-2 break-words md:mb-0">{a.workRestriction || <MissingValue field="workRestriction" label={t("casePage.field_workRestriction")} onJump={jump} />}</dd>
            </dl>
            {a.confirmationStatus === "confirmed" && (
              <p className="mt-4 text-sm text-green-700">
                {t("casePage.confirmedBy", { name: a.confirmedBy ?? "", at: formatDateTime(a.confirmedAt) })}
              </p>
            )}
          </section>
          <CaseInfoEditor record={record} canEdit={canEdit} />
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-6">
          {canEdit && !doc && (
            <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              {t("casePage.documentsFirst")}
            </p>
          )}
          {canEdit && (
            <UploadBox
              caseId={record.id}
              currentFileName={doc?.fileName}
              onUploaded={(replaced) => {
                if (!replaced) setTab("applicant");
              }}
            />
          )}
          {canEdit && (
            <UploadBox caseId={record.id} documentType="photo" currentFileName={photo?.fileName} onUploaded={() => {}} />
          )}
          <section className="rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-6 py-3 font-semibold">{t("casePage.registeredDocuments")}</h2>
            {record.documents.length === 0 && <p className="px-6 py-6 text-sm text-slate-500">{t("casePage.noDocuments")}</p>}
            {record.documents.map((d) => (
              <DocumentRow
                key={d.id}
                doc={d}
                locked={d.documentType === "residence_card" && record.workflowStatus === "applicant_confirmed"}
                readOnly={!canEdit}
                onDelete={() => setDocToDelete(d)}
              />
            ))}
          </section>
        </div>
      )}

      {!canEdit && tab !== "overview" && tab !== "documents" && (
        <p className="mb-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{t("casePage.readOnlyNotice")}</p>
      )}
      {/* 編集権限がない場合は、タブ内のすべての入力・操作を無効にする（最終的な拒否はデータベース側で行う） */}
      <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
        {tab === "applicant" && <ApplicantForm record={record} onGoDocuments={() => setTab("documents")} />}

        {tab === "employment" && <EmploymentForm record={record} />}

        {tab === "formDetails" && <FormDetailsForm record={record} onGoOverview={() => setTab("overview")} />}

        {tab === "requirements" && <RequirementsPanel record={record} onGoEmployment={() => setTab("employment")} onGoDocuments={() => setTab("documents")} />}

        {tab === "checks" && <ChecksPanel record={record} />}
      </fieldset>
      </div>
    </div>
  );
}
