"use client";

import { useState } from "react";
import { AddressField } from "@/components/AddressField";
import { Button, Field, inputClass } from "@/components/ui";
import { isValidDate } from "@/lib/format";
import { DateField, useDateInvalidMessage } from "@/components/DateField";
import { categoryOptions } from "@/lib/i18n/caseNew";
import { useLang, useT } from "@/lib/i18n/LanguageProvider";
import { ruleSetOfCase } from "@/lib/requirements/evaluate";
import type { RuleSet } from "@/lib/requirements/rules";
import type { MessageKey } from "@/lib/i18n/messages";
import { logAudit, updateCase } from "@/lib/store";
import { useAutoSaveForm } from "@/lib/useAutoSaveForm";
import { EMPLOYMENT_ZENKAKU, zenkakuHandlers, zenkakuModeOf } from "@/lib/zenkaku";
import type { CaseRecord, EmploymentInfo, OrgCategory } from "@/lib/types";

const TEXT_FIELDS: { key: keyof EmploymentInfo; label: MessageKey; placeholder?: MessageKey }[] = [
  { key: "companyName", label: "employment.companyName" },
  { key: "companyAddress", label: "employment.companyAddress" },
  { key: "industry", label: "employment.industry" },
  { key: "capital", label: "employment.capital", placeholder: "employment.capitalPlaceholder" },
  { key: "employeeCount", label: "employment.employeeCount", placeholder: "employment.employeeCountPlaceholder" },
  { key: "jobDescription", label: "employment.jobDescription", placeholder: "employment.jobDescriptionPlaceholder" },
  { key: "employmentType", label: "employment.employmentType", placeholder: "employment.employmentTypePlaceholder" },
  { key: "monthlySalary", label: "employment.monthlySalary", placeholder: "employment.monthlySalaryPlaceholder" },
  { key: "contractPeriod", label: "employment.contractPeriod", placeholder: "employment.contractPeriodPlaceholder" },
];

/** 雇用・会社情報の入力欄。案件の詳細画面と、まとめて登録する画面で共用する */
export function EmploymentFields({
  form,
  set,
  ruleSet = null,
}: {
  form: EmploymentInfo;
  set: <K extends keyof EmploymentInfo>(key: K, value: EmploymentInfo[K]) => void;
  /** 案件に対応する規則集合。カテゴリーの選択肢（範囲・意味）を、その定義に合わせる。省略時は既定の1〜4 */
  ruleSet?: RuleSet | null;
}) {
  const t = useT();
  const { lang } = useLang();
  const dateInvalid = useDateInvalidMessage();
  const dateError = hasEmploymentDateError(form);
  return (
      <div className="grid gap-4 md:grid-cols-2">
        {TEXT_FIELDS.map((f) =>
          f.key === "companyAddress" ? (
            <AddressField key={f.key} label={t(f.label)} value={form.companyAddress} onChange={(v) => set("companyAddress", v)} />
          ) : (
          <Field key={f.key} label={t(f.label)}>
            <input
              className={inputClass}
              placeholder={f.placeholder ? t(f.placeholder) : undefined}
              value={form[f.key] as string}
              onChange={(e) => set(f.key, e.target.value as never)}
              {...zenkakuHandlers(zenkakuModeOf(EMPLOYMENT_ZENKAKU, f.key), (v) => set(f.key, v as never))}
            />
          </Field>
          ),
        )}
        <Field label={t("employment.startDate")}>
          <DateField
            className={inputClass}
            value={form.employmentStartDate}
            error={dateError ? dateInvalid : undefined}
            onChange={(v) => set("employmentStartDate", v)}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label={t("employment.categoryLabel")} hint={t("employment.categoryHint")}>
            <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value as OrgCategory)}>
              <option value="">{t("employment.categoryNone")}</option>
              {categoryOptions(t, lang, ruleSet).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={form.withholdingSpecial} onChange={(e) => set("withholdingSpecial", e.target.checked)} />
          {t("employment.withholdingSpecial")}
        </label>
      </div>
  );
}

export function hasEmploymentDateError(form: EmploymentInfo): boolean {
  return form.employmentStartDate !== "" && !isValidDate(form.employmentStartDate);
}

export function EmploymentForm({ record }: { record: CaseRecord }) {
  const t = useT();
  const [form, setForm] = useState<EmploymentInfo>(record.employment);
  const [saved, setSaved] = useState(false);
  const dateError = hasEmploymentDateError(form);

  function set<K extends keyof EmploymentInfo>(key: K, value: EmploymentInfo[K]) {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function persist(f: EmploymentInfo): boolean {
    if (hasEmploymentDateError(f)) return false;
    updateCase(record.id, (c) => ({ ...c, employment: f }));
    logAudit(record.id, "employment_saved");
    setSaved(true);
    return true;
  }

  // 保存ボタンを押す前に画面が取り除かれても（タブ切替など）、入力内容を保存する
  const { markSaved } = useAutoSaveForm(form, persist);

  function save() {
    if (persist(form)) markSaved(form);
  }

  return (
    <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 font-semibold">{t("employment.title")}</h2>
      <p className="mb-5 text-xs text-slate-500">{t("employment.note")}</p>
      <EmploymentFields form={form} set={set} ruleSet={ruleSetOfCase(record)} />
      <div className="mt-6 flex items-center gap-3">
        <Button disabled={dateError} onClick={save}>
          {t("employment.save")}
        </Button>
        <span role="status" className="text-sm text-green-700">
          {saved && t("employment.saved")}
        </span>
      </div>
    </section>
  );
}
