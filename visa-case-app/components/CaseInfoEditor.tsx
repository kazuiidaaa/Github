"use client";

import { useState } from "react";
import { AcceptedDateField } from "@/components/AcceptedDateField";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { PROCEDURE_OPTIONS, StatusSelect, useStatusHints } from "@/components/StatusSelect";
import { Button, Field, inputClass } from "@/components/ui";
import { hasAcceptedDateError, isAcceptedAfterPlanned } from "@/lib/acceptedDate";
import { formatDate } from "@/lib/format";
import { procedureDescriptionText, targetStatusLegend } from "@/lib/i18n/caseNew";
import { useT } from "@/lib/i18n/LanguageProvider";
import { logAudit, updateCase } from "@/lib/store";
import { CASE_MEMO_ZENKAKU, zenkakuHandlers } from "@/lib/zenkaku";
import { PROCEDURE_TYPES, procedureNeedsTarget, type CaseRecord, type ProcedureType } from "@/lib/types";

export function CaseInfoEditor({ record, canEdit }: { record: CaseRecord; canEdit: boolean }) {
  const t = useT();
  const hints = useStatusHints();
  const [editing, setEditing] = useState(false);
  const [caseName, setCaseName] = useState(record.caseName);
  const [procedureType, setProcedureType] = useState<ProcedureType>(record.procedureType);
  const [currentStatus, setCurrentStatus] = useState(record.currentStatus);
  const [targetStatus, setTargetStatus] = useState(record.targetStatus);
  const [memo, setMemo] = useState(record.memo);
  const [acceptedDate, setAcceptedDate] = useState(record.acceptedDate);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const needsTarget = procedureNeedsTarget(procedureType);

  function start() {
    setCaseName(record.caseName);
    setProcedureType(record.procedureType);
    setCurrentStatus(record.currentStatus);
    setTargetStatus(record.targetStatus);
    setMemo(record.memo);
    setAcceptedDate(record.acceptedDate);
    setErrors({});
    setEditing(true);
  }

  function save() {
    const next: Record<string, string> = {};
    if (!caseName.trim()) next.caseName = t("caseNew.errCaseNameRequired");
    else if (caseName.length > 100) next.caseName = t("caseNew.errCaseNameTooLong");
    if (needsTarget && !targetStatus.trim()) next.targetStatus = t("caseNew.errTargetRequired", { label: targetStatusLegend(t, procedureType) });
    if (hasAcceptedDateError(acceptedDate)) next.acceptedDate = t("caseNew.errAcceptedDate");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    updateCase(record.id, (c) => ({
      ...c,
      caseName: caseName.trim(),
      procedureType,
      currentStatus: currentStatus.trim(),
      targetStatus: needsTarget ? targetStatus.trim() : "",
      memo,
      acceptedDate,
    }));
    // 日付の値は監査ログに残さず、変更された項目名のみを記録する
    logAudit(record.id, "case_info_saved", acceptedDate !== record.acceptedDate ? { acceptedDate } : undefined);
    setEditing(false);
  }

  if (!editing) {
    const procedure = PROCEDURE_TYPES.find((p) => p.value === record.procedureType)?.label;
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{t("caseInfo.title")}</h2>
          {canEdit && (
            <Button variant="secondary" onClick={start}>
              {t("caseInfo.edit")}
            </Button>
          )}
        </div>
        <dl className="grid grid-cols-[10rem_1fr] gap-y-3">
          <dt className="text-slate-500">{t("caseInfo.caseName")}</dt>
          <dd>{record.caseName}</dd>
          <dt className="text-slate-500">{t("caseInfo.procedureType")}</dt>
          <dd>{procedure}</dd>
          <dt className="text-slate-500">{t("caseInfo.currentStatus")}</dt>
          <dd>{record.currentStatus || "-"}</dd>
          {record.targetStatus && (
            <>
              <dt className="text-slate-500">{t("caseInfo.targetStatus")}</dt>
              <dd>{record.targetStatus}</dd>
            </>
          )}
          <dt className="text-slate-500">{t("input.acceptedDateField_label")}</dt>
          <dd>
            {record.acceptedDate ? formatDate(record.acceptedDate) : t("caseInfo.notEntered")}
            {isAcceptedAfterPlanned(record.acceptedDate, record.plannedApplicationDate) && (
              <span className="ml-2 text-xs font-bold text-amber-800">{t("caseInfo.warnAfterPlanned")}</span>
            )}
          </dd>
          <dt className="text-slate-500">{t("caseInfo.memo")}</dt>
          <dd className="whitespace-pre-wrap">{record.memo || "-"}</dd>
        </dl>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm">
      <h2 className="font-semibold">{t("caseInfo.editTitle")}</h2>
      <Field label={t("caseNew.caseNameLabel")} required error={errors.caseName} hint={t("caseInfo.nameHint")}>
        <input className={inputClass} value={caseName} onChange={(e) => setCaseName(e.target.value)} />
      </Field>
      <ChoiceGroup
        legend={t("caseNew.procedureLegend")}
        required
        options={PROCEDURE_OPTIONS}
        value={procedureType}
        onChange={(v) => setProcedureType(v as ProcedureType)}
        hint={procedureDescriptionText(t, procedureType)}
      />
      <StatusSelect legend={t("caseNew.currentStatusLegend")} hint={hints.current} value={currentStatus} onChange={setCurrentStatus} />
      {needsTarget && (
        <StatusSelect
          legend={targetStatusLegend(t, procedureType)}
          required
          error={errors.targetStatus}
          hint={hints.target}
          value={targetStatus}
          onChange={setTargetStatus}
          withGrade
          allowGrade2={procedureType === "change"}
        />
      )}
      <AcceptedDateField value={acceptedDate} onChange={setAcceptedDate} plannedApplicationDate={record.plannedApplicationDate} />
      <Field label={t("caseNew.memoLabel")} hint={t("caseNew.memoHint")}>
        <textarea className={inputClass} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} {...zenkakuHandlers(CASE_MEMO_ZENKAKU, setMemo)} />
      </Field>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
          {t("caseInfo.cancel")}
        </Button>
        <Button type="button" onClick={save}>
          {t("caseInfo.save")}
        </Button>
      </div>
    </section>
  );
}
