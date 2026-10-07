"use client";

import { AddressField } from "@/components/AddressField";
import { ImageZoom } from "@/components/ImageZoom";
import { useState } from "react";
import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { StatusSelect, useStatusHints } from "@/components/StatusSelect";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { DateField } from "@/components/DateField";
import { fillCurrentStatus, initialResidenceStatus, validateApplicant, validateDraft, type ApplicantField } from "@/lib/applicant";
import { applicantFieldId } from "@/lib/applicantFields";
import { findDocumentOfType } from "@/lib/documentKinds";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { getConfirmerName, logAudit, updateCase } from "@/lib/store";
import { useAutoSaveForm } from "@/lib/useAutoSaveForm";
import { APPLICANT_ZENKAKU, zenkakuHandlers, zenkakuModeOf } from "@/lib/zenkaku";
import { useDocumentUrl } from "@/lib/useDocumentUrl";
import type { Applicant, CaseRecord, DocumentRecord } from "@/lib/types";

/** 検証の対象の欄の名前（ページ本体の概要と共通の訳） */
const FIELD_LABEL_KEYS: Record<ApplicantField, MessageKey> = {
  legalName: "casePage.field_legalName",
  nationality: "casePage.field_nationality",
  dateOfBirth: "casePage.field_dateOfBirth",
  residenceStatus: "casePage.field_residenceStatus",
  residenceExpiryDate: "casePage.field_residenceExpiryDate",
};

type TextKey = "legalName" | "nationality" | "address" | "residenceCardNumber" | "workRestriction";

function Original({ doc }: { doc: DocumentRecord }) {
  const t = useT();
  const url = useDocumentUrl(doc);
  const cardLabel = t("display.docResidenceCard");
  return (
    <>
      <h2 className="mb-3 font-semibold">{t("caseApplicant.originalTitle", { file: doc.fileName })}</h2>
      {url && doc.mimeType.startsWith("image/") && <ImageZoom src={url} alt={cardLabel} />}
      {url && doc.mimeType === "application/pdf" && (
        <iframe src={url} title={cardLabel} className="h-[32rem] w-full rounded border border-slate-200" />
      )}
      {!url && (
        <p className="rounded bg-slate-50 p-8 text-center text-sm text-slate-500">
          {t("caseApplicant.previewUnavailable")}
        </p>
      )}
    </>
  );
}

export function ApplicantForm({ record, onGoDocuments }: { record: CaseRecord; onGoDocuments: () => void }) {
  const t = useT();
  const hints = useStatusHints();
  const genderOptions: ChoiceOption[] = [
    { value: "男", label: t("caseApplicant.genderMale") },
    { value: "女", label: t("caseApplicant.genderFemale") },
  ];
  const [form, setForm] = useState<Applicant>(() => ({
    ...record.applicant,
    residenceStatus: initialResidenceStatus(record.applicant.residenceStatus, record.currentStatus),
  }));
  const [errors, setErrors] = useState<Partial<Record<ApplicantField, string>>>({});
  const [message, setMessage] = useState("");
  const confirmed = record.applicant.confirmationStatus === "confirmed";
  const doc = findDocumentOfType(record.documents, "residence_card");
  const errorFields = (Object.keys(FIELD_LABEL_KEYS) as ApplicantField[]).filter((k) => errors[k]);

  function set<K extends keyof Applicant>(key: K, value: Applicant[K]) {
    setMessage("");
    setForm((f) => ({ ...f, [key]: value }));
  }

  function text(key: TextKey, label: string, opts: { required?: boolean; placeholder?: string; hint?: string } = {}) {
    return (
      <Field label={label} required={opts.required} hint={opts.hint} error={errors[key as ApplicantField]}>
        <input
          id={applicantFieldId(key)}
          className={inputClass}
          value={form[key]}
          placeholder={opts.placeholder}
          disabled={confirmed}
          onChange={(e) => set(key, e.target.value)}
          {...zenkakuHandlers(zenkakuModeOf(APPLICANT_ZENKAKU, key), (v) => set(key, v))}
        />
      </Field>
    );
  }

  function date(key: "dateOfBirth" | "residenceExpiryDate", label: string) {
    return (
      <Field label={label} required>
        <DateField
          id={applicantFieldId(key)}
          className={inputClass}
          value={form[key]}
          disabled={confirmed}
          error={errors[key]}
          onChange={(v) => set(key, v)}
        />
      </Field>
    );
  }

  function persistDraft(f: Applicant, showErrors: boolean): boolean {
    const next = validateDraft(f, t);
    if (showErrors) setErrors(next);
    if (Object.keys(next).length > 0) return false;
    updateCase(record.id, (c) => ({
      ...c,
      workflowStatus: "preparing",
      applicant: { ...f, confirmationStatus: "draft", confirmedAt: undefined, confirmedBy: undefined },
    }));
    logAudit(record.id, "applicant_saved");
    setMessage(t("caseApplicant.savedDraft"));
    return true;
  }

  // 下書きの間は、保存ボタンを押す前に画面が取り除かれても（タブ切替など）、下書きとして保存する。
  // 確認済みの間は入力欄が無効のため対象外。「確認済みにする」は自動では行わない。
  const { markSaved } = useAutoSaveForm(form, (f) => persistDraft(f, false), { enabled: !confirmed });

  function saveDraft() {
    if (persistDraft(form, true)) markSaved(form);
  }

  async function confirm() {
    const next = validateApplicant(form, t);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setMessage("");
      return;
    }
    const confirmedBy = await getConfirmerName();
    updateCase(record.id, (c) => ({
      ...c,
      currentStatus: fillCurrentStatus(c.currentStatus, form.residenceStatus),
      workflowStatus: "applicant_confirmed",
      applicant: { ...form, confirmationStatus: "confirmed", confirmedAt: new Date().toISOString(), confirmedBy },
    }));
    logAudit(record.id, "applicant_confirmed");
    markSaved(form);
    setMessage(t("caseApplicant.savedConfirmed"));
  }

  function reopen() {
    updateCase(record.id, (c) => ({
      ...c,
      workflowStatus: "preparing",
      applicant: { ...c.applicant, confirmationStatus: "draft", confirmedAt: undefined, confirmedBy: undefined },
    }));
    logAudit(record.id, "applicant_reopened");
    setMessage("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        {doc ? (
          <Original doc={doc} />
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            <p className="mb-3">{t("caseApplicant.noOriginal")}</p>
            <Button variant="secondary" onClick={onGoDocuments}>
              {t("caseApplicant.goDocuments")}
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold">{t("casePage.applicantInfo")}</h2>
          <Badge tone={confirmed ? "green" : "yellow"}>{confirmed ? t("casePage.applicantConfirmed") : t("casePage.applicantDraft")}</Badge>
        </div>
        <p className="mb-5 text-xs text-slate-500">
          {t("caseApplicant.intro")}
        </p>
        {errorFields.length > 0 && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">{t("caseApplicant.errorSummary", { count: errorFields.length })}</p>
            <ul className="mt-1 list-disc pl-5">
              {errorFields.map((k) => (
                <li key={k}>
                  {t("caseApplicant.errorItem", { label: t(FIELD_LABEL_KEYS[k]), error: errors[k] ?? "" })}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">{text("legalName", t("casePage.field_legalName"), { required: true, placeholder: "LI MING" })}</div>
          {text("nationality", t("casePage.field_nationality"), { required: true, placeholder: t("caseApplicant.exNationality") })}
          <div id={applicantFieldId("gender")}><ChoiceGroup legend={t("casePage.field_gender")} options={genderOptions} value={form.gender} disabled={confirmed} onChange={(v) => set("gender", v)} hint={t("caseApplicant.genderHint")} /></div>
          {date("dateOfBirth", t("casePage.field_dateOfBirth"))}
          <div className="md:col-span-2">
            <AddressField id={applicantFieldId("address")} label={t("casePage.field_address")} value={form.address} disabled={confirmed} onChange={(v) => set("address", v)} />
          </div>
          <StatusSelect id={applicantFieldId("residenceStatus")} legend={t("casePage.field_residenceStatus")} required error={errors.residenceStatus} hint={hints.card} value={form.residenceStatus} disabled={confirmed} onChange={(v) => set("residenceStatus", v)} withGrade />
          {date("residenceExpiryDate", t("casePage.field_residenceExpiryDate"))}
          {text("residenceCardNumber", t("casePage.field_residenceCardNumber"))}
          {text("workRestriction", t("casePage.field_workRestriction"), { placeholder: t("caseApplicant.exWorkRestriction") })}
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm">
          {confirmed ? (
            <>
              <p className="text-green-700">
                {t("caseApplicant.confirmedLine", { name: record.applicant.confirmedBy ?? "", at: formatDateTime(record.applicant.confirmedAt) })}
              </p>
              <div className="mt-3">
                <Button variant="secondary" onClick={reopen}>
                  {t("caseApplicant.reopen")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={saveDraft}>
                  {t("caseApplicant.saveDraft")}
                </Button>
                <Button onClick={() => void confirm()}>{t("caseApplicant.confirm")}</Button>
                <span role="status" className="text-green-700">
                  {message}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {t("caseApplicant.requiredNote")}
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
