"use client";

import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import {
  EDUCATION_LEVELS,
  getFormDetailsWarnings,
  getFormLayout,
  validateFormDetails,
  type FormDetails,
  type Relative,
  type WorkEntry,
} from "@/lib/formDetails";
import { logAudit, newId, updateCase } from "@/lib/store";
import { useAutoSaveForm } from "@/lib/useAutoSaveForm";
import type { CaseRecord } from "@/lib/types";

type TextKey = {
  [K in keyof FormDetails]: FormDetails[K] extends string ? K : never;
}[keyof FormDetails];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mb-4 mt-1 text-xs text-slate-500">{hint}</p>}
      <div className={`grid gap-4 md:grid-cols-2 ${hint ? "" : "mt-4"}`}>{children}</div>
    </section>
  );
}

/** 公式の申請書にあって、申請人情報・雇用情報の既存項目にない入力項目 */
export function FormDetailsForm({ record, onGoOverview }: { record: CaseRecord; onGoOverview?: () => void }) {
  // 項目番号・項目名・見出しは、手続種別ごとの項目番号表（lib/formDetails.ts の FORM_LAYOUTS）から取得する
  const layout = getFormLayout(record.procedureType);
  const [form, setForm] = useState<FormDetails>(record.formDetails);
  const [saved, setSaved] = useState(false);
  const errors = validateFormDetails(form, layout);
  const warnings = getFormDetailsWarnings(form);
  const hasError = Object.keys(errors).length > 0;
  const errorFields = (Object.keys(errors) as (keyof FormDetails)[]).filter((k) => errors[k]);

  function set<K extends keyof FormDetails>(key: K, value: FormDetails[K]) {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function text(key: TextKey, opts: { placeholder?: string; hint?: string; wide?: boolean; area?: boolean; date?: boolean } = {}) {
    const label = layout.labels[key];
    if (!label) return null; // この様式にない項目は表示しない
    const input = opts.area ? (
      <textarea
        className={inputClass}
        rows={3}
        value={form[key]}
        placeholder={opts.placeholder}
        onChange={(e) => set(key, e.target.value as never)}
      />
    ) : (
      <input
        type={opts.date ? "date" : undefined}
        className={inputClass}
        value={form[key]}
        placeholder={opts.placeholder}
        onChange={(e) => set(key, e.target.value as never)}
      />
    );
    return (
      <div className={opts.wide || opts.area ? "md:col-span-2" : ""}>
        <Field label={label} hint={opts.hint} error={errors[key]}>
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
      <Field label={label}>
        <select className={inputClass} value={form[key]} onChange={(e) => set(key, e.target.value as FormDetails[K])}>
          <option value="">未選択</option>
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
      <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
        公式の{layout.formName}の項目のうち、他の画面にない項目です。入力した内容は「転記補助シート」に載ります。
        旅券番号、犯罪を理由とする処分の内容、親族の情報などの個人情報を含むため、必要な項目のみ入力してください。
        項目名の番号は、公式様式の項番です。
      </p>

      {errorFields.length > 0 && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">入力内容に {errorFields.length} 件の誤りがあります。修正するまで保存できません。</p>
          <ul className="mt-1 list-disc pl-5">
            {errorFields.map((k) => (
              <li key={k}>
                {layout.labels[k] ?? k}：{errors[k]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {layout.sectionTitles.applicant1 && (
      <Section title={layout.sectionTitles.applicant1}>
        {text("placeOfBirth")}
        {select("maritalStatus", [["married", "有"], ["single", "無"]])}
        {text("occupation")}
        {text("homeAddress", { wide: true })}
        {text("contactInJapan", { wide: true })}
        {text("phone")}
        {text("mobilePhone")}
        {text("passportNumber")}
        {text("passportExpiry", { date: true })}
        {select("acquisitionCause", [["birth", "出生"], ["nationalityLoss", "国籍離脱・喪失"], ["other", "その他"]])}
        {form.acquisitionCause === "other" && text("acquisitionCauseOther")}
        {text("stayPurpose", { area: true })}
        {text("periodOfStay", { placeholder: "例：3年" })}
        {layout.desiredStatusLabel && (
          // 希望する在留資格は、案件情報の targetStatus を表示するのみ（二重入力を避ける）
          <div>
            <Field label={layout.desiredStatusLabel} hint={`案件情報の「${layout.desiredStatusCaseLabel ?? "希望する在留資格"}」です。この画面では入力しません。`}>
              <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{record.targetStatus || "未設定"}</span>
                {onGoOverview && (
                  <button type="button" onClick={onGoOverview} className="text-xs underline">
                    案件情報で変更する
                  </button>
                )}
              </div>
            </Field>
          </div>
        )}
        {text("plannedEntryDate", { date: true })}
        {text("portOfEntry")}
        {text("plannedStay", { placeholder: "例：1年" })}
        {select("accompanied", [["yes", "有"], ["no", "無"]])}
        {text("visaApplicationPlace", { wide: true, placeholder: "例：在外日本国大使館・総領事館の所在地" })}
        {select("entryHistory", [["yes", "有"], ["no", "無"]])}
        {form.entryHistory === "yes" && (
          <>
            {text("entryHistoryCount", { placeholder: "回" })}
            {text("entryHistoryLastFrom", { date: true })}
            {text("entryHistoryLastTo", { date: true })}
          </>
        )}
        {select("coeHistory", [["yes", "有"], ["no", "無"]])}
        {form.coeHistory === "yes" && (
          <>
            {text("coeHistoryCount", { placeholder: "回" })}
            {text("coeHistoryNonIssuedCount", { placeholder: "回" })}
          </>
        )}
        {text("desiredPeriod", { placeholder: "例：3年" })}
        {text("renewalReason", { area: true })}
        {text("changeReason", { area: true })}
        {select("criminalRecord", [["none", "無"], ["yes", "有"]])}
        {form.criminalRecord === "yes" &&
          text("criminalDetail", { area: true, hint: "日本国外におけるもの、交通違反等による処分を含みます。" })}
        {select("deportationHistory", [["yes", "有"], ["no", "無"]])}
        {form.deportationHistory === "yes" && (
          <>
            {text("deportationCount", { placeholder: "回" })}
            {text("deportationLastDate", { date: true })}
          </>
        )}
      </Section>
      )}

      {layout.sectionTitles.relatives && (
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">{layout.sectionTitles.relatives}</h2>
        <div className="mt-4 max-w-xs">{select("relativesPresent", [["yes", "有"], ["no", "無"]], "有無")}</div>
        {form.relativesPresent === "yes" && (
          <div className="mt-4 space-y-4">
            {form.relatives.map((r, i) => (
              <div key={r.id} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-3">
                <p className="text-xs font-medium text-slate-500 md:col-span-3">{i + 1} 人目</p>
                <Field label="続柄">
                  <input className={inputClass} value={r.relationship} onChange={(e) => updateRelative(r.id, { relationship: e.target.value })} />
                </Field>
                <Field label="氏名">
                  <input className={inputClass} value={r.name} onChange={(e) => updateRelative(r.id, { name: e.target.value })} />
                </Field>
                <Field label="生年月日">
                  <input type="date" className={inputClass} value={r.dateOfBirth} onChange={(e) => updateRelative(r.id, { dateOfBirth: e.target.value })} />
                </Field>
                <Field label="国籍・地域">
                  <input className={inputClass} value={r.nationality} onChange={(e) => updateRelative(r.id, { nationality: e.target.value })} />
                </Field>
                <Field label="勤務先名称・通学先名称">
                  <input className={inputClass} value={r.workplace} onChange={(e) => updateRelative(r.id, { workplace: e.target.value })} />
                </Field>
                <Field label={layout.livesTogetherLabel ?? "同居の有無"}>
                  <select className={inputClass} value={r.livesTogether} onChange={(e) => updateRelative(r.id, { livesTogether: e.target.value as Relative["livesTogether"] })}>
                    <option value="">未選択</option>
                    <option value="yes">有</option>
                    <option value="no">無</option>
                  </select>
                </Field>
                <Field label="在留カード番号／特別永住者証明書番号">
                  <input className={inputClass} value={r.cardNumber} onChange={(e) => updateRelative(r.id, { cardNumber: e.target.value })} />
                </Field>
                <div className="flex items-end">
                  <Button variant="danger" onClick={() => set("relatives", form.relatives.filter((x) => x.id !== r.id))}>
                    この行を削除
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
              親族・同居者を追加
            </Button>
          </div>
        )}
      </section>
      )}

      {layout.sectionTitles.applicant2 && (
      <Section title={layout.sectionTitles.applicant2}>
        {text("branchName")}
        {text("workPhone")}
        {select("educationPlace", [["japan", "本邦"], ["foreign", "外国"]])}
        {layout.labels.educationLevel && (
          <Field label={layout.labels.educationLevel} hint="最終学歴として卒業（修了）した課程を選びます。">
            <select className={inputClass} value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)}>
              <option value="">未選択</option>
              {EDUCATION_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        )}
        {text("schoolName")}
        {text("graduationDate", { date: true })}
        {text("majorField", { placeholder: "例：工学" })}
        {text("itQualification", { hint: "資格名または試験名。ない場合は空欄。" })}
        {text("legalRepName")}
        {text("legalRepRelationship")}
        {text("legalRepAddress", { wide: true })}
        {text("legalRepPhone")}
        {text("guarantorName")}
        {text("guarantorRelationship")}
        {text("guarantorAddress", { wide: true })}
        {text("guarantorPhone")}
        {text("guarantorMobilePhone")}
        {text("agentName")}
        {text("agentAddress", { wide: true })}
        {text("agentAffiliation")}
        {text("agentPhone")}
      </Section>
      )}

      {layout.sectionTitles.workHistory && (
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">{layout.sectionTitles.workHistory}</h2>
        <div className="mt-4 space-y-3">
          {form.workHistory.map((w) => (
            <div key={w.id} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-4">
              <Field label="入社（年月）">
                <input className={inputClass} placeholder="YYYY-MM" value={w.joinedOn} onChange={(e) => updateWork(w.id, { joinedOn: e.target.value })} />
              </Field>
              <Field label="退社（年月）">
                <input className={inputClass} placeholder="YYYY-MM（在職中は空）" value={w.leftOn} onChange={(e) => updateWork(w.id, { leftOn: e.target.value })} />
              </Field>
              <Field label="勤務先名称">
                <input className={inputClass} value={w.employer} onChange={(e) => updateWork(w.id, { employer: e.target.value })} />
              </Field>
              <div className="flex items-end">
                <Button variant="danger" onClick={() => set("workHistory", form.workHistory.filter((x) => x.id !== w.id))}>
                  この行を削除
                </Button>
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={() => set("workHistory", [...form.workHistory, { id: newId(), joinedOn: "", leftOn: "", employer: "" }])}>
            職歴を追加
          </Button>
        </div>
      </section>
      )}

      {layout.sectionTitles.organization && (
      <Section title={layout.sectionTitles.organization}>
        {text("corporateNumber")}
        {text("employmentInsuranceNumber", { hint: "非該当の事業所は空欄。" })}
        {text("orgPhone")}
        {text("annualSales", { placeholder: "円" })}
        {text("foreignStaffCount", { placeholder: "名" })}
        {text("experienceYears", { placeholder: "年" })}
        {text("positionTitle")}
        {text("occupationCode", { hint: "技術・人文知識・国際業務は 2〜18、24〜31、51〜54、999 から選択。" })}
        {text("dispatchName")}
        {text("dispatchCorporateNumber")}
        {text("dispatchBranchName")}
        {text("dispatchInsuranceNumber")}
        {text("dispatchAddress", { wide: true })}
        {text("dispatchPhone")}
        {text("dispatchCapital")}
        {text("dispatchAnnualSales")}
        {text("dispatchPeriod")}
      </Section>
      )}

      <div className="flex items-center gap-3">
        <Button disabled={hasError} onClick={save}>
          保存
        </Button>
        {saved && <span className="text-sm text-green-700">保存しました。</span>}
      </div>
    </div>
  );
}
