"use client";

import { useEffect, useRef, useState } from "react";
import { AcceptedDateField } from "@/components/AcceptedDateField";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { PROCEDURE_OPTIONS, StatusSelect, useStatusHints } from "@/components/StatusSelect";
import { useToast } from "@/components/Toast";
import { Button, Field, inputClass, ToneIcon } from "@/components/ui";
import { hasAcceptedDateError, isAcceptedAfterPlanned } from "@/lib/acceptedDate";
import { formatDate } from "@/lib/format";
import { firstErrorKey, focusField } from "@/lib/formFocus";
import { procedureDescriptionText, targetStatusLegend } from "@/lib/i18n/caseNew";
import { useT } from "@/lib/i18n/LanguageProvider";
import { logAudit, updateCase } from "@/lib/store";
import { CASE_MEMO_ZENKAKU, zenkakuHandlers } from "@/lib/zenkaku";
import { PROCEDURE_TYPES, procedureNeedsTarget, type CaseRecord, type ProcedureType } from "@/lib/types";

/** 検証する欄（画面の上からの並び順）。保存時は、この順で最初の誤りの欄へフォーカスを移す（新規登録と同じ方式） */
const ERROR_ORDER = ["caseName", "targetStatus", "acceptedDate"] as const;
type ErrorKey = (typeof ERROR_ORDER)[number];
const fieldId = (key: ErrorKey) => `case-info-${key}`;
const EDIT_BUTTON_ID = "case-info-edit";

export function CaseInfoEditor({ record, canEdit }: { record: CaseRecord; canEdit: boolean }) {
  const t = useT();
  const toast = useToast();
  const hints = useStatusHints();
  const [editing, setEditing] = useState(false);
  const [caseName, setCaseName] = useState(record.caseName);
  const [procedureType, setProcedureType] = useState<ProcedureType>(record.procedureType);
  const [currentStatus, setCurrentStatus] = useState(record.currentStatus);
  const [targetStatus, setTargetStatus] = useState(record.targetStatus);
  const [memo, setMemo] = useState(record.memo);
  const [acceptedDate, setAcceptedDate] = useState(record.acceptedDate);
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});
  // 編集の開始・終了で、押したボタンが消えるため、フォーカスの行き先を決める（開始→案件名の欄、終了→「編集」ボタン）
  const focusAfterToggle = useRef<"form" | "editButton" | null>(null);
  useEffect(() => {
    const target = focusAfterToggle.current;
    if (!target) return;
    focusAfterToggle.current = null;
    if (target === "form") focusField(fieldId("caseName"));
    else document.getElementById(EDIT_BUTTON_ID)?.focus();
  }, [editing]);

  const needsTarget = procedureNeedsTarget(procedureType);
  // 要約には、いま画面に出ている欄の誤りだけを並べる（手続を変えて隠れた「希望する在留資格」の誤りは出さない）
  const errorList = ERROR_ORDER.filter((k) => (k === "targetStatus" ? needsTarget : true)).flatMap((k) =>
    errors[k] ? [[k, errors[k]] as const] : [],
  );

  function start() {
    setCaseName(record.caseName);
    setProcedureType(record.procedureType);
    setCurrentStatus(record.currentStatus);
    setTargetStatus(record.targetStatus);
    setMemo(record.memo);
    setAcceptedDate(record.acceptedDate);
    setErrors({});
    focusAfterToggle.current = "form";
    setEditing(true);
  }

  function finish() {
    focusAfterToggle.current = "editButton";
    setEditing(false);
  }

  function save() {
    const next: Partial<Record<ErrorKey, string>> = {};
    if (!caseName.trim()) next.caseName = t("caseNew.errCaseNameRequired");
    else if (caseName.length > 100) next.caseName = t("caseNew.errCaseNameTooLong");
    if (needsTarget && !targetStatus.trim()) next.targetStatus = t("caseNew.errTargetRequired", { label: targetStatusLegend(t, procedureType) });
    if (hasAcceptedDateError(acceptedDate)) next.acceptedDate = t("caseNew.errAcceptedDate");
    setErrors(next);
    const first = firstErrorKey(next, ERROR_ORDER);
    if (first) {
      // 誤りの表示（aria-invalid など）が画面に反映された後に、最初の誤りの欄へ移す
      requestAnimationFrame(() => focusField(fieldId(first)));
      return;
    }

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
    // 編集欄が閉じるため、結果は画面下部の通知で知らせる（文言は他のフォームの「保存しました」と同じ）
    toast.success(t("caseForm.saved"));
    finish();
  }

  if (!editing) {
    const procedure = PROCEDURE_TYPES.find((p) => p.value === record.procedureType)?.label;
    return (
      <section className="mac-card rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t("caseInfo.title")}</h2>
          {canEdit && (
            <Button id={EDIT_BUTTON_ID} variant="secondary" onClick={start}>
              {t("caseInfo.edit")}
            </Button>
          )}
        </div>
        {/* 狭い幅では項目名と値を縦に積む（概要の申請人情報と同じ並び） */}
        <dl className="grid grid-cols-1 gap-y-1 md:grid-cols-[10rem_1fr] md:gap-y-3">
          <dt className="text-muted">{t("caseInfo.caseName")}</dt>
          <dd className="mb-2 break-words md:mb-0">{record.caseName}</dd>
          <dt className="text-muted">{t("caseInfo.procedureType")}</dt>
          <dd className="mb-2 md:mb-0">{procedure}</dd>
          <dt className="text-muted">{t("caseInfo.currentStatus")}</dt>
          <dd className="mb-2 break-words md:mb-0">{record.currentStatus || "-"}</dd>
          {record.targetStatus && (
            <>
              <dt className="text-muted">{t("caseInfo.targetStatus")}</dt>
              <dd className="mb-2 break-words md:mb-0">{record.targetStatus}</dd>
            </>
          )}
          <dt className="text-muted">{t("input.acceptedDateField_label")}</dt>
          <dd className="mb-2 md:mb-0">
            {record.acceptedDate ? formatDate(record.acceptedDate) : t("caseInfo.notEntered")}
            {isAcceptedAfterPlanned(record.acceptedDate, record.plannedApplicationDate) && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-amber-800">
                <ToneIcon tone="yellow" />
                {t("caseInfo.warnAfterPlanned")}
              </span>
            )}
          </dd>
          <dt className="text-muted">{t("caseInfo.memo")}</dt>
          <dd className="whitespace-pre-wrap break-words">{record.memo || "-"}</dd>
        </dl>
      </section>
    );
  }

  return (
    <section className="space-y-5 mac-card rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:p-6">
      <h2 className="font-semibold">{t("caseInfo.editTitle")}</h2>
      {/* 誤りの要約。保存のたびに読み上げ、フォーカスは最初の誤りの欄へ移す（新規登録と同じ。設計書 4章「フォームの入力しやすさ」） */}
      {errorList.length > 0 && (
        <div role="alert" className="rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger-text">
          <p className="flex items-center gap-1.5 font-bold">
            <ToneIcon tone="red" />
            {t("caseNew.errorSummary", { count: errorList.length })}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map(([k, msg]) => (
              <li key={k}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      <Field label={t("caseNew.caseNameLabel")} required error={errors.caseName} hint={t("caseInfo.nameHint")}>
        <input
          id={fieldId("caseName")}
          className={inputClass}
          value={caseName}
          aria-invalid={errors.caseName ? true : undefined}
          onChange={(e) => setCaseName(e.target.value)}
        />
      </Field>
      <ChoiceGroup
        legend={t("caseNew.procedureLegend")}
        required
        options={PROCEDURE_OPTIONS}
        value={procedureType}
        onChange={(v) => setProcedureType(v as ProcedureType)}
        hint={procedureDescriptionText(t, procedureType)}
      />
      <StatusSelect legend={t("caseNew.currentStatusLegend")} hint={hints.current} value={currentStatus} onChange={setCurrentStatus} withGrade />
      {needsTarget && (
        <StatusSelect
          id={fieldId("targetStatus")}
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
      <div id={fieldId("acceptedDate")}>
        <AcceptedDateField value={acceptedDate} onChange={setAcceptedDate} plannedApplicationDate={record.plannedApplicationDate} />
        {/* 受任日の誤りは、これまで画面に出ず保存だけが止まっていたため、欄の下にも示す（Field の誤り表示と同じ見た目） */}
        {errors.acceptedDate && <p className="mt-1 text-xs font-bold text-red-700">{errors.acceptedDate}</p>}
      </div>
      <Field label={t("caseNew.memoLabel")} hint={t("caseNew.memoHint")}>
        <textarea className={inputClass} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} {...zenkakuHandlers(CASE_MEMO_ZENKAKU, setMemo)} />
      </Field>
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={finish}>
          {t("caseInfo.cancel")}
        </Button>
        <Button type="button" onClick={save}>
          {t("caseInfo.save")}
        </Button>
      </div>
    </section>
  );
}
