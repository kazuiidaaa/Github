"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AppError, messageOf } from "@/lib/errors";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ConfirmDocumentDeleteDialog } from "@/components/ConfirmDocumentDeleteDialog";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { CaseGroupSection } from "@/components/CaseGroupSection";
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
import { currentStatusOf, StatusTransition } from "@/components/StatusTransition";
import { findDocumentOfType, removeDocumentOfType, type UploadedDocumentType } from "@/lib/documentKinds";
import { expiryLevel } from "@/lib/caseMetrics";
import { canJumpToApplicantField, type JumpField } from "@/lib/applicantFields";
import { unresolvedCount } from "@/lib/checks/definitions";
import { daysUntil, formatDate, formatDateTime } from "@/lib/format";
import { focusField } from "@/lib/formFocus";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { useLabels } from "@/lib/i18n/labels";
import { scrollBehavior } from "@/lib/motion";
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

/** 文字のリンクも、押しやすさのため高さ 44px（人の決定。Issue #392。新規登録と同じ） */
const textLinkClass = "inline-flex min-h-[44px] items-center text-sm text-blue-700 hover:underline active:opacity-70";

/** タブバーの端の見切れ表示（続きがある側を 16px 薄くする）。色だけでなく形（切れ目）で、横に続くことを示す */
function edgeMask(start: boolean, end: boolean): string | undefined {
  if (!start && !end) return undefined;
  return `linear-gradient(to right, ${start ? "transparent, #000 16px" : "#000, #000"}, ${end ? "#000 calc(100% - 16px), transparent" : "#000"})`;
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
    <div className="px-4 py-3 text-sm sm:px-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <span className="min-w-0 break-all">{t("casePage.documentLine", { label: t(UPLOADED_DOCUMENT_KEYS[doc.documentType]), file: doc.fileName })}</span>
        <span className="flex flex-wrap items-center gap-3 md:shrink-0 md:flex-nowrap">
          <Badge tone="blue">
            {labels.documentStatus(doc.status)}
          </Badge>
          <span className="text-muted">{formatDateTime(doc.uploadedAt)}</span>
          <Button variant="secondary" onClick={() => void open()}>
            {t("casePage.docView")}
          </Button>
          <Button variant="danger" disabled={locked || readOnly} onClick={onDelete}>
            {t("casePage.delete")}
          </Button>
        </span>
      </div>
      {locked && <p className="mt-1 text-xs text-muted">{t("casePage.docLocked")}</p>}
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
  // パネルの切替は不透明度のみ（設計書 3章B-3。内容は左右に動かさない）。最初の表示は画面全体のフェードに任せ、切替の後だけ付ける
  const [switched, setSwitched] = useState(false);
  function setTab(next: Tab) {
    setSwitched(true);
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
    // 選択中のタブが見える位置へ、タブバーだけを横にスクロールする（動きを減らす設定では即時）
    document.getElementById(`case-tab-${tab}`)?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: scrollBehavior() });
  }, [tab, tabBarShown]);
  // 選択中のタブの下線（設計書 3章B-3）。1本の線を transform で隣のタブへ動かす（width は動かさない）。
  // 連打しても CSS transition が現在の位置から動かし直す。動きを減らす設定では globals.css の指定で即時に移る。
  const tabListRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number; animate: boolean } | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  function updateEdges() {
    const list = tabListRef.current;
    if (!list) return;
    const start = list.scrollLeft > 1;
    const end = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
    setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
  }
  useLayoutEffect(() => {
    const list = tabListRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    // タブの幅は、言語の切替や件数の表示で変わるため、タブバーと各タブの大きさの変化で測り直す。
    // ResizeObserver は監視を始めた直後にも1回呼ばれるため、最初の位置もここで決まる（描画の前）
    const observer = new ResizeObserver(() => {
      const el = document.getElementById(`case-tab-${tab}`);
      if (el) setIndicator((prev) => ({ x: el.offsetLeft, w: el.offsetWidth, animate: prev !== null }));
      updateEdges();
    });
    observer.observe(list);
    for (const child of Array.from(list.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [tab, tabBarShown]);
  // 概要の「未入力」から移動するとき、タブの描画後にフォーカスする欄の id
  const pendingFocusId = useRef<string | null>(null);
  function jumpToField(id: string) {
    pendingFocusId.current = id;
    setTab("applicant");
  }
  useEffect(() => {
    if (tab !== "applicant" || !pendingFocusId.current) return;
    // 選択式の欄（性別・在留資格）は、id が欄全体の枠にあるため、中の選択済み（または先頭）の項目へフォーカスする。
    // 新規登録・申請人情報の誤りへの移動と同じ関数（lib/formFocus.ts。動きを減らす設定ではスクロールが即時）
    if (focusField(pendingFocusId.current)) pendingFocusId.current = null;
  }, [tab, tabBarShown]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);

  if (!record && !loaded) return <LoadingNotice />;

  if (!record) {
    return (
      <div>
        <p className="mb-1">{t("casePage.notFound")}</p>
        <Link href="/cases" className={textLinkClass}>
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
      <Link href="/cases" className={textLinkClass}>
        {t("casePage.backToCases")}
      </Link>
      <div className="mt-1 mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words md:text-mac-title2">{record.caseName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {procedure}
            <WorkflowBadge status={record.workflowStatus} />
          </p>
          <p className="mt-1 text-sm">
            <StatusTransition procedureType={record.procedureType} current={currentStatusOf(record)} target={record.targetStatus} />
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 md:w-auto md:shrink-0 md:flex-nowrap md:justify-start">
          <Link
            href={`/cases/${record.id}/documents`}
            className="mac-button inline-flex min-h-[44px] items-center rounded-full border border-line-strong bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50 active:bg-slate-100 md:whitespace-nowrap"
          >
            {t("casePage.createDocuments")}
          </Link>
          {canDelete && (
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
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

      <div
        ref={tabListRef}
        role="tablist"
        aria-label={t("casePage.tabListLabel")}
        onScroll={updateEdges}
        style={{ maskImage: edgeMask(edges.start, edges.end), WebkitMaskImage: edgeMask(edges.start, edges.end) }}
        className="relative mb-6 flex gap-1 overflow-x-auto border-b border-slate-200"
      >
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
            className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap px-4 py-2 text-sm font-medium active:bg-slate-100 ${
              tab === tb.key ? "text-foreground" : "text-muted hover:text-slate-800"
            } ${indicator ? "" : tab === tb.key ? "border-b-2 border-accent" : ""}`}
          >
            {t(tb.label)}
            {tabIndicators[tb.key] && (
              <span className="ml-1.5">
                <Badge tone="yellow" icon={false}>{tabIndicators[tb.key]}</Badge>
              </span>
            )}
          </button>
        ))}
        {indicator && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left bg-accent"
            style={{
              transform: `translateX(${indicator.x}px) scaleX(${indicator.w})`,
              transition: indicator.animate ? "transform var(--spring-move-duration) var(--ease-spring-move)" : "none",
            }}
          />
        )}
      </div>

      <div key={tab} id="case-tabpanel" role="tabpanel" aria-labelledby={`case-tab-${tab}`} className={switched ? "anim-page-enter" : undefined}>
      {tab === "overview" && (() => {
        const level = expiryLevel(daysUntil(a.residenceExpiryDate));
        const banner = level === "urgent" || level === "overdue";
        // 項目は、まとまりごとに分けて置く（本人／住所／在留）。未入力の項目は、編集できるときのみ、入力欄へ移動するボタンにする
        const groups: { key: string; title: string; rows: { field: JumpField; label: string; value: ReactNode; wrap?: boolean }[] }[] = [
          {
            key: "person",
            title: t("casePage.inspectorPerson"),
            rows: [
              { field: "legalName", label: t("casePage.field_legalName"), value: a.legalName },
              { field: "nationality", label: t("casePage.field_nationality"), value: a.nationality },
              { field: "dateOfBirth", label: t("casePage.field_dateOfBirth"), value: a.dateOfBirth ? formatDate(a.dateOfBirth) : "" },
              { field: "gender", label: t("casePage.field_gender"), value: a.gender },
            ],
          },
          {
            key: "address",
            title: t("casePage.inspectorAddress"),
            rows: [{ field: "address", label: t("casePage.field_address"), value: a.address }],
          },
          {
            key: "residence",
            title: t("casePage.inspectorResidence"),
            rows: [
              { field: "residenceStatus", label: t("casePage.field_residenceStatus"), value: a.residenceStatus },
              { field: "residenceExpiryDate", label: t("casePage.field_residenceExpiryDate"), value: a.residenceExpiryDate ? <ExpiryBadge date={a.residenceExpiryDate} /> : "" },
              { field: "residenceCardNumber", label: t("casePage.field_residenceCardNumber"), value: a.residenceCardNumber },
              { field: "workRestriction", label: t("casePage.field_workRestriction"), value: a.workRestriction },
            ],
          },
        ];
        // 置き場所の幅が十分なとき（@container）は、右にインスペクタ（申請人情報）、左に次の作業と案件情報
        return (
          <div className="@container space-y-4 md:space-y-6">
            {banner && <DeadlineBanner date={a.residenceExpiryDate} />}
            {/* 狭いときは、次の作業・申請人情報・案件情報の順に1列。広いときは、左に次の作業と案件情報、右にインスペクタ */}
            <div className="grid gap-4 md:gap-6 @[60rem]:grid-cols-[minmax(0,1fr)_24rem] @[60rem]:grid-rows-[auto_1fr] @[60rem]:items-start">
              <div className="@[60rem]:col-start-1 @[60rem]:row-start-1">
                <NextActionCard record={record} canEdit={canEdit} onGoTab={setTab} />
              </div>
              <section
                aria-labelledby="case-inspector-title"
                className="@[60rem]:col-start-2 @[60rem]:row-span-2 @[60rem]:row-start-1"
              >
                <h2 id="case-inspector-title" className="mb-3 flex flex-wrap items-center gap-2 text-mac-title3 font-semibold">
                  {t("casePage.applicantInfo")}
                  <Badge tone={a.confirmationStatus === "confirmed" ? "green" : "yellow"}>
                    {a.confirmationStatus === "confirmed" ? t("casePage.applicantConfirmed") : t("casePage.applicantDraft")}
                  </Badge>
                </h2>
                <div className="space-y-4">
                  {groups.map((g) => (
                    <section key={g.key} aria-labelledby={`case-inspector-${g.key}`}>
                      <h3 id={`case-inspector-${g.key}`} className="mb-1 px-1 text-mac-footnote font-bold text-muted">
                        {g.title}
                      </h3>
                      <dl className="divide-y divide-separator overflow-hidden rounded-mac-group border border-separator bg-grouped-surface text-mac-body">
                        {g.rows.map((r) => (
                          <div key={r.field} className="grid grid-cols-1 gap-x-3 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
                            <dt className="text-muted">{r.label}</dt>
                            <dd className="min-w-0 break-words">{r.value || <MissingValue field={r.field} label={r.label} onJump={jump} />}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
                {a.confirmationStatus === "confirmed" && (
                  <p className="mt-4 text-sm text-green-700">
                    {t("casePage.confirmedBy", { name: a.confirmedBy ?? "", at: formatDateTime(a.confirmedAt) })}
                  </p>
                )}
              </section>
              <div className="space-y-6 @[60rem]:col-start-1 @[60rem]:row-start-2">
                <CaseInfoEditor record={record} canEdit={canEdit} />
                <CaseGroupSection record={record} canEdit={canEdit} />
              </div>
            </div>
          </div>
        );
      })()}

      {tab === "documents" && (
        <div className="space-y-6">
          {canEdit && !doc && (
            <p className="mac-notice rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
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
          <section className="mac-card rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-4 py-3 font-semibold sm:px-6">{t("casePage.registeredDocuments")}</h2>
            {record.documents.length === 0 && <p className="px-4 py-6 text-sm text-muted sm:px-6">{t("casePage.noDocuments")}</p>}
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
        <p className="mb-4 mac-notice rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{t("casePage.readOnlyNotice")}</p>
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
