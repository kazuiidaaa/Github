"use client";

import { DATE_INVALID_MESSAGE } from "@/lib/dateInput";
import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { isValidDate } from "@/lib/format";
import { DateField } from "@/components/DateField";
import { CATEGORY_LABELS } from "@/lib/requirements/rules";
import { logAudit, updateCase } from "@/lib/store";
import { useAutoSaveForm } from "@/lib/useAutoSaveForm";
import type { CaseRecord, EmploymentInfo, OrgCategory } from "@/lib/types";

const TEXT_FIELDS: { key: keyof EmploymentInfo; label: string; placeholder?: string }[] = [
  { key: "companyName", label: "会社名" },
  { key: "companyAddress", label: "所在地" },
  { key: "industry", label: "業種" },
  { key: "capital", label: "資本金", placeholder: "例：10,000,000円" },
  { key: "employeeCount", label: "従業員数", placeholder: "例：25名" },
  { key: "jobDescription", label: "職務内容", placeholder: "例：社内システムの開発" },
  { key: "employmentType", label: "雇用形態", placeholder: "例：正社員" },
  { key: "monthlySalary", label: "月額給与", placeholder: "例：350,000円" },
  { key: "contractPeriod", label: "契約期間", placeholder: "例：期間の定めなし" },
];

/** 雇用・会社情報の入力欄。案件の詳細画面と、まとめて登録する画面で共用する */
export function EmploymentFields({
  form,
  set,
}: {
  form: EmploymentInfo;
  set: <K extends keyof EmploymentInfo>(key: K, value: EmploymentInfo[K]) => void;
}) {
  const dateError = hasEmploymentDateError(form);
  return (
      <div className="grid gap-4 md:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input
              className={inputClass}
              placeholder={f.placeholder}
              value={form[f.key] as string}
              onChange={(e) => set(f.key, e.target.value as never)}
            />
          </Field>
        ))}
        <Field label="雇用開始日">
          <DateField
            className={inputClass}
            value={form.employmentStartDate}
            error={dateError ? DATE_INVALID_MESSAGE : undefined}
            onChange={(v) => set("employmentStartDate", v)}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="所属機関のカテゴリー" hint="カテゴリー未選択の間は、全カテゴリー共通の書類のみ判定します。">
            <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value as OrgCategory)}>
              <option value="">未選択</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={form.withholdingSpecial} onChange={(e) => set("withholdingSpecial", e.target.checked)} />
          源泉所得税の納期の特例の承認を受けている
        </label>
      </div>
  );
}

export function hasEmploymentDateError(form: EmploymentInfo): boolean {
  return form.employmentStartDate !== "" && !isValidDate(form.employmentStartDate);
}

export function EmploymentForm({ record }: { record: CaseRecord }) {
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
      <h2 className="mb-1 font-semibold">雇用・会社情報</h2>
      <p className="mb-5 text-xs text-slate-500">
        必要書類の判定に使用します。申請人の確認済み情報とは別に保存されます。
      </p>
      <EmploymentFields form={form} set={set} />
      <div className="mt-6 flex items-center gap-3">
        <Button disabled={dateError} onClick={save}>
          保存
        </Button>
        <span role="status" className="text-sm text-green-700">
          {saved && "保存しました"}
        </span>
      </div>
    </section>
  );
}
