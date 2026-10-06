"use client";

import { DateField } from "@/components/DateField";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { Badge, Button, inputClass } from "@/components/ui";
import { missingChecks, sortChecks, unresolvedCount } from "@/lib/checks/definitions";
import { referenceFor, validPlannedDate } from "@/lib/checks/reference";
import { formatDateTime } from "@/lib/format";
import { checkDisplayName } from "@/lib/i18n/caseChecks";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import { useLabels } from "@/lib/i18n/labels";
import { logAudit, newId, updateCase } from "@/lib/store";
import { useAutoSave } from "@/lib/useAutoSave";
import {
  type CaseRecord,
  type CheckRecord,
  type CheckStatus,
  type CheckType,
} from "@/lib/types";

const STATUS_TONE: Record<CheckStatus, "gray" | "green" | "yellow" | "red"> = {
  pending: "gray",
  passed: "green",
  warning: "yellow",
  failed: "red",
  not_applicable: "gray",
};
const STATUS_ORDER: CheckStatus[] = ["pending", "passed", "warning", "failed", "not_applicable"];
const TYPES: CheckType[] = ["applicant", "document", "deadline", "manual"];

export function ChecksPanel({ record }: { record: CaseRecord }) {
  const t = useT();
  const labels = useLabels();
  const [memo, setMemo] = useState(record.checkMemo);
  const [newName, setNewName] = useState("");
  const [askingReady, setAskingReady] = useState(false);
  const [planned, setPlanned] = useState(record.plannedApplicationDate);
  const ready = record.workflowStatus === "application_ready";
  const unresolved = unresolvedCount(record.checks);
  const flushMemo = useAutoSave(memo, record.checkMemo, (v) =>
    change((c) => ({ ...c, checkMemo: v }), "check_updated", { memo: true }),
  );

  // 初めて開いたとき、不足している項目を未確認で補い、「要確認」にする
  useEffect(() => {
    const added = missingChecks(record.checks);
    if (!added && ready) return;
    if (!added && record.workflowStatus === "review_required") return;
    updateCase(record.id, (c) => ({
      ...c,
      checks: [...c.checks, ...(missingChecks(c.checks) ?? [])],
      workflowStatus: c.workflowStatus === "application_ready" ? c.workflowStatus : "review_required",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id]);

  /** チェックを変更する。準備完了後の変更は「要確認」に戻す */
  function change(fn: (c: CaseRecord) => CaseRecord, action: string, detail?: Record<string, unknown>) {
    updateCase(record.id, (c) => ({
      ...fn(c),
      workflowStatus: c.workflowStatus === "application_ready" ? "review_required" : c.workflowStatus,
    }));
    logAudit(record.id, action, detail);
    if (ready) logAudit(record.id, "application_ready_reset");
  }

  function patchCheck(key: string, p: Partial<CheckRecord>) {
    change(
      (c) => ({
        ...c,
        checks: c.checks.map((k) =>
          k.key === key ? { ...k, ...p, checkedAt: new Date().toISOString(), checkedBy: "self" } : k,
        ),
      }),
      "check_updated",
      { checkKey: key, ...p },
    );
  }

  function addManual() {
    const name = newName.trim();
    if (!name) return;
    const key = `manual.${newId()}`;
    change(
      (c) => ({ ...c, checks: [...c.checks, { key, type: "manual", name, status: "pending", note: "" }] }),
      "check_added",
      { checkKey: key, name },
    );
    setNewName("");
  }

  function onMarkReady() {
    if (unresolved > 0) setAskingReady(true);
    else markReady();
  }

  function markReady() {
    setAskingReady(false);
    updateCase(record.id, (c) => ({ ...c, checkMemo: memo, workflowStatus: "application_ready" }));
    logAudit(record.id, "application_ready_marked", { unresolved });
  }

  const sorted = sortChecks(record.checks);
  const plannedOk = validPlannedDate(planned);

  return (
    <div className="space-y-6">
      <DeadlineBanner date={record.applicant.residenceExpiryDate} />

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p className="flex items-center gap-2">
          {t("caseChecks.state")}
          <Badge tone={ready ? "green" : "yellow"}>{ready ? t("caseChecks.ready") : t("caseChecks.notReady")}</Badge>
          <span className="text-slate-600">
            {t("caseChecks.resolvedCount", { done: record.checks.length - unresolved, total: record.checks.length })}
          </span>
        </p>
        <label className="flex items-center gap-2">
          <span className="text-slate-600">{t("caseChecks.plannedDate")}</span>
          <DateField
            className={`${inputClass} w-40`}
            value={planned}
            onChange={setPlanned}
            onBlur={(kind) => {
              if (kind !== "incomplete" && plannedOk && planned !== record.plannedApplicationDate) {
                change((c) => ({ ...c, plannedApplicationDate: planned }), "check_updated", {
                  plannedApplicationDate: planned,
                });
              }
            }}
          />
        </label>
      </section>

      {TYPES.map((type) => {
        const items = sorted.filter((k) => k.type === type);
        if (items.length === 0 && type !== "manual") return null;
        return (
          <section key={type} className="rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-6 py-3 font-semibold">{labels.checkType(type)}</h2>
            <ul className="divide-y divide-slate-100">
              {items.map((k) => (
                <CheckRow
                  key={k.key}
                  check={k}
                  record={record}
                  onPatch={patchCheck}
                  onRemove={() =>
                    change((c) => ({ ...c, checks: c.checks.filter((x) => x.key !== k.key) }), "check_removed", {
                      checkKey: k.key,
                    })
                  }
                />
              ))}
            </ul>
            {type === "manual" && (
              <div className="flex gap-2 px-6 py-3">
                <input
                  className={inputClass}
                  placeholder={t("caseChecks.addPlaceholder")}
                  value={newName}
                  maxLength={100}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Button variant="secondary" onClick={addManual} disabled={!newName.trim()}>
                  {t("caseChecks.add")}
                </Button>
              </div>
            )}
          </section>
        );
      })}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-semibold">{t("caseChecks.memoTitle")}</h2>
        <textarea
          className={inputClass}
          rows={4}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={flushMemo}
        />
      </section>

      <div className="rounded-xl bg-slate-100 p-4 text-xs leading-relaxed text-slate-700">
        {t("caseChecks.disclaimer")}
      </div>

      <div className="flex justify-end">
        <Button onClick={onMarkReady} disabled={ready}>
          {ready ? t("caseChecks.alreadyReady") : t("caseChecks.markReady")}
        </Button>
      </div>

      {askingReady && (
        <ConfirmDialog
          title={t("caseChecks.askTitle")}
          message={t("caseChecks.askMessage", { count: unresolved })}
          note={t("caseChecks.askNote")}
          confirmLabel={t("caseChecks.askConfirm")}
          tone="caution"
          onCancel={() => setAskingReady(false)}
          onConfirm={markReady}
        />
      )}
    </div>
  );
}

function CheckRow({
  check,
  record,
  onPatch,
  onRemove,
}: {
  check: CheckRecord;
  record: CaseRecord;
  onPatch: (key: string, p: Partial<CheckRecord>) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const labels = useLabels();
  const { lang } = useLang();
  const statusOptions: ChoiceOption[] = STATUS_ORDER.map((s) => ({ value: s, label: labels.checkStatus(s), tone: STATUS_TONE[s] }));
  const name = checkDisplayName(t, lang, check);
  const [note, setNote] = useState(check.note);
  const ref = referenceFor(record, check.key, t);
  const flushNote = useAutoSave(note, check.note, (v) => onPatch(check.key, { note: v }));
  return (
    <li className="grid gap-2 px-6 py-3 text-sm md:grid-cols-[1fr_22rem]">
      <div>
        <p>{name}</p>
        {ref.text && (
          <p className={`mt-1 text-xs ${ref.tone === "warn" ? "text-amber-800" : "text-slate-500"}`}>{t("caseChecks.reference", { text: ref.text })}</p>
        )}
        <input
          className="mt-2 w-full rounded-xl border border-line-strong px-2 py-1 text-xs"
          placeholder={t("caseChecks.notePlaceholder")}
          aria-label={t("caseChecks.noteAria", { name })}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={flushNote}
        />
        {check.checkedAt && <p className="mt-1 text-xs text-slate-400">{t("caseChecks.lastChecked", { at: formatDateTime(check.checkedAt) })}</p>}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <ChoiceGroup
          legend={t("caseChecks.statusAria", { name })}
          hideLegend
          options={statusOptions}
          value={check.status}
          onChange={(v) => onPatch(check.key, { status: v as CheckStatus })}
        />
        {check.type === "manual" && (
          <button onClick={onRemove} className="text-xs text-red-700 hover:underline">
            {t("caseChecks.remove")}
          </button>
        )}
      </div>
    </li>
  );
}
