"use client";

import { useState } from "react";
import { AddressField } from "@/components/AddressField";
import { Button, Field, inputClass } from "@/components/ui";
import { DateField } from "@/components/DateField";
import {
  EDUCATION_LEVELS,
  getFormDetailsWarnings,
  getFormLayout,
  validateFormDetails,
  type FormDetails,
  type Relative,
  type WorkEntry,
} from "@/lib/formDetails";
import { HspPointSection } from "@/components/HspPointSection";
import { formLabelText } from "@/lib/i18n/formLabels";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { HSP_ACTIVITIES, isAdvancedProfessional, resolveChangeForm, resolveCoeForm, resolveRenewalForm } from "@/lib/hspForm";
import { describeHspForm, hspActivityHintKey, hspStatusOf, type HspProcedure } from "@/lib/hspFormGuide";
import { logAudit, newId, updateCase } from "@/lib/store";
import { useAutoSaveForm } from "@/lib/useAutoSaveForm";
import { FORM_DETAILS_ZENKAKU, RELATIVE_ZENKAKU, WORK_ENTRY_ZENKAKU, zenkakuHandlers, zenkakuModeOf } from "@/lib/zenkaku";
import type { CaseRecord } from "@/lib/types";

const EDUCATION_KEYS: Record<(typeof EDUCATION_LEVELS)[number], MessageKey> = {
  "大学院（博士）": "caseForm.edu_doctor",
  "大学院（修士）": "caseForm.edu_master",
  "大学": "caseForm.edu_university",
  "短期大学": "caseForm.edu_juniorCollege",
  "専門学校": "caseForm.edu_vocational",
  "高等学校": "caseForm.edu_highSchool",
  "中学校": "caseForm.edu_middleSchool",
  "その他": "caseForm.edu_other",
};

type TextKey = {
  [K in keyof FormDetails]: FormDetails[K] extends string ? K : never;
}[keyof FormDetails];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mb-4 mt-1 text-xs text-slate-500">{hint}</p>}
      <div className={`grid gap-4 md:grid-cols-2 ${hint ? "" : "mt-4"}`}>{children}</div>
    </section>
  );
}

/** 公式の申請書にあって、申請人情報・雇用情報の既存項目にない入力項目 */
export function FormDetailsForm({ record, onGoOverview }: { record: CaseRecord; onGoOverview?: () => void }) {
  // 項目番号・項目名・見出しは、手続種別ごとの項目番号表（lib/formDetails.ts の FORM_LAYOUTS）から取得する
  const t = useT();
  const { lang } = useLang();
  const layout = getFormLayout(record.procedureType);
  // 高度専門職の様式（認定・変更・更新）。更新は現在の在留資格、他は希望（変更後）の在留資格の号で決める
  const hspProcedure: HspProcedure | null =
    record.procedureType === "coe" || record.procedureType === "change" || record.procedureType === "renewal" ? record.procedureType : null;
  const hspStatus = hspProcedure ? hspStatusOf(hspProcedure, record) : "";
  /** 様式の項目名・見出し・様式名の表示（番号は、そのまま） */
  const L = (label: string) => formLabelText(lang, label);
  const [form, setForm] = useState<FormDetails>(record.formDetails);
  const [saved, setSaved] = useState(false);
  const errors = validateFormDetails(form, layout, t);
  const warnings = getFormDetailsWarnings(form, t);
  const hasError = Object.keys(errors).length > 0;
  const errorFields = (Object.keys(errors) as (keyof FormDetails)[]).filter((k) => errors[k]);

  function set<K extends keyof FormDetails>(key: K, value: FormDetails[K]) {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  // 日本語の文章の欄のみ、入力の確定時に半角を全角へ変換する（番号・電話・日付などは、変換しない。lib/zenkaku.ts）
  function zk(key: TextKey) {
    return zenkakuHandlers(zenkakuModeOf(FORM_DETAILS_ZENKAKU, key), (v) => set(key, v as never));
  }

  function text(key: TextKey, opts: { placeholder?: string; hint?: string; wide?: boolean; area?: boolean; date?: boolean; address?: boolean } = {}) {
    const label = layout.labels[key];
    if (!label) return null; // この様式にない項目は表示しない
    // 日本の住所は、郵便番号から前半を補える（本国の住所は対象外）
    if (opts.address) {
      return (
        <div className="md:col-span-2">
          <AddressField label={L(label)} hint={opts.hint} error={errors[key]} value={form[key]} onChange={(v) => set(key, v as never)} />
        </div>
      );
    }
    const input = opts.area ? (
      <textarea
        className={inputClass}
        rows={3}
        {...zk(key)}
        value={form[key]}
        placeholder={opts.placeholder}
        onChange={(e) => set(key, e.target.value as never)}
      />
    ) : opts.date ? (
      <DateField className={inputClass} value={form[key]} error={errors[key]} onChange={(v) => set(key, v as never)} />
    ) : (
      <input
        className={inputClass}
        value={form[key]}
        {...zk(key)}
        placeholder={opts.placeholder}
        onChange={(e) => set(key, e.target.value as never)}
      />
    );
    return (
      <div className={opts.wide || opts.area ? "md:col-span-2" : ""}>
        <Field label={L(label)} hint={opts.hint} error={opts.date ? undefined : errors[key]}>
          {input}
        </Field>
      </div>
    );
  }

  function select<
    K extends
      | "maritalStatus"
      | "criminalRecord"
      | "relativesPresent"
      | "educationPlace"
      | "accompanied"
      | "entryHistory"
      | "coeHistory"
      | "deportationHistory"
      | "acquisitionCause",
  >(
    key: K,
    options: [FormDetails[K], string][],
    fallbackLabel?: string,
  ) {
    const label = layout.labels[key] ?? fallbackLabel;
    if (!label) return null;
    return (
      <Field label={fallbackLabel && !layout.labels[key] ? label : L(label)}>
        <select className={inputClass} value={form[key]} onChange={(e) => set(key, e.target.value as FormDetails[K])}>
          <option value="">{t("caseForm.unselected")}</option>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  function updateRelative(id: string, patch: Partial<Relative>) {
    set("relatives", form.relatives.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function updateWork(id: string, patch: Partial<WorkEntry>) {
    set("workHistory", form.workHistory.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  function persist(f: FormDetails): boolean {
    // 誤りのある内容は保存しない（自動保存でも同じ）
    if (Object.keys(validateFormDetails(f, layout)).length > 0) return false;
    updateCase(record.id, (c) => ({ ...c, formDetails: f }));
    logAudit(record.id, "form_details_saved");
    setSaved(true);
    return true;
  }

  // 保存ボタンを押す前に画面が取り除かれても（タブ切替など）、誤りがなければ入力内容を保存する
  const { markSaved } = useAutoSaveForm(form, persist);

  function save() {
    if (persist(form)) markSaved(form);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
        {t("caseForm.intro", { formName: L(layout.formName) })}
      </p>

      {errorFields.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">{t("caseForm.errorSummary", { count: errorFields.length })}</p>
          <ul className="mt-1 list-disc pl-5">
            {errorFields.map((k) => (
              <li key={k}>
                {t("caseForm.errorItem", { label: L(layout.labels[k] ?? k), error: errors[k] ?? "" })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {layout.sectionTitles.applicant1 && (
      <Section title={L(layout.sectionTitles.applicant1)}>
        {text("placeOfBirth")}
        {select("maritalStatus", [["married", t("caseForm.yes")], ["single", t("caseForm.no")]])}
        {text("occupation")}
        {text("homeAddress", { wide: true })}
        {text("contactInJapan", { wide: true })}
        {text("phone")}
        {text("mobilePhone")}
        {text("passportNumber")}
        {text("passportExpiry", { date: true })}
        {select("acquisitionCause", [["birth", t("caseRequirements.cause_birth")], ["nationalityLoss", t("caseRequirements.cause_nationalityLoss")], ["other", t("caseRequirements.cause_other")]])}
        {form.acquisitionCause === "other" && text("acquisitionCauseOther")}
        {text("stayPurpose", { area: true })}
        {text("periodOfStay", { placeholder: t("caseForm.exPeriod3") })}
        {layout.desiredStatusLabel && (
          // 希望する在留資格は、案件情報の targetStatus を表示するのみ（二重入力を避ける）
          <div>
            <Field label={L(layout.desiredStatusLabel)} hint={t("caseForm.hintDesiredStatus", { caseLabel: L(layout.desiredStatusCaseLabel ?? t("caseForm.defaultDesiredCaseLabel")) })}>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{record.targetStatus || t("caseForm.notSet")}</span>
                {onGoOverview && (
                  <button type="button" onClick={onGoOverview} className="text-xs underline">
                    {t("caseForm.goOverview")}
                  </button>
                )}
              </div>
            </Field>
          </div>
        )}
        {hspProcedure && isAdvancedProfessional(hspStatus) && (
          <div className="md:col-span-2">
            <Field label={t("caseForm.hspActivityLabel")} hint={t(hspActivityHintKey(hspProcedure))}>
              <select className={inputClass} value={form.hspActivity} onChange={(e) => set("hspActivity", e.target.value)}>
                <option value="">{t("caseForm.unselected")}</option>
                {HSP_ACTIVITIES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <p role="note" className="mt-1 text-xs text-slate-600">
                {describeHspForm(hspResolve(hspProcedure, hspStatus, form.hspActivity), hspProcedure, t)}
              </p>
            </Field>
          </div>
        )}
        {text("plannedEntryDate", { date: true })}
        {text("portOfEntry")}
        {text("plannedStay", { placeholder: t("caseForm.exStay1") })}
        {select("accompanied", [["yes", t("caseForm.yes")], ["no", t("caseForm.no")]])}
        {text("visaApplicationPlace", { wide: true, placeholder: t("caseForm.exVisaPlace") })}
        {select("entryHistory", [["yes", t("caseForm.yes")], ["no", t("caseForm.no")]])}
        {form.entryHistory === "yes" && (
          <>
            {text("entryHistoryCount", { placeholder: t("caseForm.unitTimes") })}
            {text("entryHistoryLastFrom", { date: true })}
            {text("entryHistoryLastTo", { date: true })}
          </>
        )}
        {select("coeHistory", [["yes", t("caseForm.yes")], ["no", t("caseForm.no")]])}
        {form.coeHistory === "yes" && (
          <>
            {text("coeHistoryCount", { placeholder: t("caseForm.unitTimes") })}
            {text("coeHistoryNonIssuedCount", { placeholder: t("caseForm.unitTimes") })}
          </>
        )}
        {text("desiredPeriod", { placeholder: t("caseForm.exPeriod3") })}
        {text("renewalReason", { area: true })}
        {text("changeReason", { area: true })}
        {select("criminalRecord", [["none", t("caseForm.no")], ["yes", t("caseForm.yes")]])}
        {form.criminalRecord === "yes" &&
          text("criminalDetail", { area: true, hint: t("caseForm.hintCriminal") })}
        {select("deportationHistory", [["yes", t("caseForm.yes")], ["no", t("caseForm.no")]])}
        {form.deportationHistory === "yes" && (
          <>
            {text("deportationCount", { placeholder: t("caseForm.unitTimes") })}
            {text("deportationLastDate", { date: true })}
          </>
        )}
      </Section>
      )}

      {layout.sectionTitles.relatives && (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">{L(layout.sectionTitles.relatives)}</h2>
        <div className="mt-4 max-w-xs">{select("relativesPresent", [["yes", t("caseForm.yes")], ["no", t("caseForm.no")]], t("caseForm.relativesPresentFallback"))}</div>
        {form.relativesPresent === "yes" && (
          <div className="mt-4 space-y-4">
            {form.relatives.map((r, i) => (
              <div key={r.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-3">
                <p className="text-xs font-medium text-slate-500 md:col-span-3">{t("caseForm.relativeNth", { n: i + 1 })}</p>
                <Field label={t("caseForm.relRelationship")}>
                  <input className={inputClass} value={r.relationship} onChange={(e) => updateRelative(r.id, { relationship: e.target.value })} {...zenkakuHandlers(RELATIVE_ZENKAKU.relationship, (v) => updateRelative(r.id, { relationship: v }))} />
                </Field>
                <Field label={t("caseForm.relName")}>
                  <input className={inputClass} value={r.name} onChange={(e) => updateRelative(r.id, { name: e.target.value })} {...zenkakuHandlers(RELATIVE_ZENKAKU.name, (v) => updateRelative(r.id, { name: v }))} />
                </Field>
                <Field label={t("caseForm.relBirth")}>
                  <DateField className={inputClass} value={r.dateOfBirth} onChange={(v) => updateRelative(r.id, { dateOfBirth: v })} />
                </Field>
                <Field label={t("caseForm.relNationality")}>
                  <input className={inputClass} value={r.nationality} onChange={(e) => updateRelative(r.id, { nationality: e.target.value })} {...zenkakuHandlers(RELATIVE_ZENKAKU.nationality, (v) => updateRelative(r.id, { nationality: v }))} />
                </Field>
                <Field label={t("caseForm.relWorkplace")}>
                  <input className={inputClass} value={r.workplace} onChange={(e) => updateRelative(r.id, { workplace: e.target.value })} {...zenkakuHandlers(RELATIVE_ZENKAKU.workplace, (v) => updateRelative(r.id, { workplace: v }))} />
                </Field>
                <Field label={L(layout.livesTogetherLabel ?? t("caseForm.defaultLivesTogether"))}>
                  <select className={inputClass} value={r.livesTogether} onChange={(e) => updateRelative(r.id, { livesTogether: e.target.value as Relative["livesTogether"] })}>
                    <option value="">{t("caseForm.unselected")}</option>
                    <option value="yes">{t("caseForm.yes")}</option>
                    <option value="no">{t("caseForm.no")}</option>
                  </select>
                </Field>
                <Field label={t("caseForm.relCard")}>
                  <input className={inputClass} value={r.cardNumber} onChange={(e) => updateRelative(r.id, { cardNumber: e.target.value })} />
                </Field>
                <div className="flex items-end">
                  <Button variant="danger" onClick={() => set("relatives", form.relatives.filter((x) => x.id !== r.id))}>
                    {t("caseForm.deleteRow")}
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                set("relatives", [
                  ...form.relatives,
                  { id: newId(), relationship: "", name: "", dateOfBirth: "", nationality: "", workplace: "", livesTogether: "", cardNumber: "" },
                ])
              }
            >
              {t("caseForm.addRelative")}
            </Button>
          </div>
        )}
      </section>
      )}

      {layout.sectionTitles.applicant2 && (
      <Section title={L(layout.sectionTitles.applicant2)}>
        {text("branchName")}
        {text("workPhone")}
        {select("educationPlace", [["japan", t("caseForm.educationPlace_japan")], ["foreign", t("caseForm.educationPlace_foreign")]])}
        {layout.labels.educationLevel && (
          <Field label={L(layout.labels.educationLevel)} hint={t("caseForm.hintEducationLevel")}>
            <select className={inputClass} value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)}>
              <option value="">{t("caseForm.unselected")}</option>
              {EDUCATION_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {t(EDUCATION_KEYS[l])}
                </option>
              ))}
            </select>
          </Field>
        )}
        {text("schoolName")}
        {text("graduationDate", { date: true })}
        {text("majorField", { placeholder: t("caseForm.exMajor") })}
        {text("itQualification", { hint: t("caseForm.hintItQualification") })}
        {text("legalRepName")}
        {text("legalRepRelationship")}
        {text("legalRepAddress", { address: true })}
        {text("legalRepPhone")}
        {text("guarantorName")}
        {text("guarantorRelationship")}
        {text("guarantorAddress", { address: true })}
        {text("guarantorPhone")}
        {text("guarantorMobilePhone")}
        {text("agentName")}
        {text("agentAddress", { address: true })}
        {text("agentAffiliation")}
        {text("agentPhone")}
      </Section>
      )}

      {layout.sectionTitles.workHistory && (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">{L(layout.sectionTitles.workHistory)}</h2>
        <div className="mt-4 space-y-3">
          {form.workHistory.map((w) => (
            <div key={w.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-4">
              <Field label={t("caseForm.workJoined")}>
                <input className={inputClass} placeholder="YYYY-MM" value={w.joinedOn} onChange={(e) => updateWork(w.id, { joinedOn: e.target.value })} />
              </Field>
              <Field label={t("caseForm.workLeft")}>
                <input className={inputClass} placeholder={t("caseForm.workLeftPlaceholder")} value={w.leftOn} onChange={(e) => updateWork(w.id, { leftOn: e.target.value })} />
              </Field>
              <Field label={t("caseForm.workEmployer")}>
                <input className={inputClass} value={w.employer} onChange={(e) => updateWork(w.id, { employer: e.target.value })} {...zenkakuHandlers(WORK_ENTRY_ZENKAKU.employer, (v) => updateWork(w.id, { employer: v }))} />
              </Field>
              <div className="flex items-end">
                <Button variant="danger" onClick={() => set("workHistory", form.workHistory.filter((x) => x.id !== w.id))}>
                  {t("caseForm.deleteRow")}
                </Button>
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={() => set("workHistory", [...form.workHistory, { id: newId(), joinedOn: "", leftOn: "", employer: "" }])}>
            {t("caseForm.addWork")}
          </Button>
        </div>
      </section>
      )}

      {layout.sectionTitles.organization && (
      <Section title={L(layout.sectionTitles.organization)}>
        {text("corporateNumber")}
        {text("employmentInsuranceNumber", { hint: t("caseForm.hintInsurance") })}
        {text("orgPhone")}
        {text("annualSales", { placeholder: t("caseForm.unitYen") })}
        {text("foreignStaffCount", { placeholder: t("caseForm.unitPeople") })}
        {text("experienceYears", { placeholder: t("caseForm.unitYears") })}
        {text("positionTitle")}
        {text("occupationCode", { hint: t("caseForm.hintOccupationCode") })}
        {text("dispatchName")}
        {text("dispatchCorporateNumber")}
        {text("dispatchBranchName")}
        {text("dispatchInsuranceNumber")}
        {text("dispatchAddress", { address: true })}
        {text("dispatchPhone")}
        {text("dispatchCapital")}
        {text("dispatchAnnualSales")}
        {text("dispatchPeriod")}
      </Section>
      )}

      <HspPointSection
        record={record}
        status={record.procedureType === "renewal" ? record.currentStatus : record.targetStatus}
        form={form}
        onChange={set}
      />

      <div className="flex items-center gap-3">
        <Button disabled={hasError} onClick={save}>
          {t("caseForm.save")}
        </Button>
        <span role="status" className="text-sm text-green-700">
          {saved && t("caseForm.saved")}
        </span>
      </div>
    </div>
  );
}

function hspResolve(procedure: HspProcedure, status: string, activity: string) {
  return procedure === "coe" ? resolveCoeForm(status, activity) : procedure === "change" ? resolveChangeForm(status, activity) : resolveRenewalForm(status, activity);
}
