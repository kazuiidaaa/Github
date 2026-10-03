"use client";

import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import {
  EDUCATION_LEVELS,
  FORM_DETAILS_FIELD_LABELS,
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
export function FormDetailsForm({ record }: { record: CaseRecord }) {
  const [form, setForm] = useState<FormDetails>(record.formDetails);
  const [saved, setSaved] = useState(false);
  const errors = validateFormDetails(form);
  const hasError = Object.keys(errors).length > 0;
  const errorFields = (Object.keys(errors) as (keyof FormDetails)[]).filter((k) => errors[k]);

  function set<K extends keyof FormDetails>(key: K, value: FormDetails[K]) {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function text(key: TextKey, label: string, opts: { placeholder?: string; hint?: string; wide?: boolean; area?: boolean; date?: boolean } = {}) {
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

  function select<K extends "maritalStatus" | "criminalRecord" | "relativesPresent" | "educationPlace">(
    key: K,
    label: string,
    options: [FormDetails[K], string][],
  ) {
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
    if (Object.keys(validateFormDetails(f)).length > 0) return false;
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
        公式の在留期間更新許可申請書の項目のうち、他の画面にない項目です。入力した内容は「転記補助シート」に載ります。
        旅券番号、犯罪を理由とする処分の内容、親族の情報などの個人情報を含むため、必要な項目のみ入力してください。
        項目名の番号は、公式様式の項番です。
      </p>

      {errorFields.length > 0 && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">入力内容に {errorFields.length} 件の誤りがあります。修正するまで保存できません。</p>
          <ul className="mt-1 list-disc pl-5">
            {errorFields.map((k) => (
              <li key={k}>
                {FORM_DETAILS_FIELD_LABELS[k] ?? k}：{errors[k]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="申請人等作成用1（項番5〜15）">
        {select("maritalStatus", "5 配偶者の有無", [["married", "有"], ["single", "無"]])}
        {text("occupation", "6 職業")}
        {text("homeAddress", "7 本国における居住地", { wide: true })}
        {text("phone", "9 電話番号")}
        {text("mobilePhone", "9 携帯電話番号")}
        {text("passportNumber", "10 (1) 旅券番号")}
        {text("passportExpiry", "10 (2) 旅券の有効期限", { date: true })}
        {text("periodOfStay", "11 現に有する在留期間", { placeholder: "例：3年" })}
        {text("desiredPeriod", "13 希望する在留期間", { placeholder: "例：3年" })}
        {text("renewalReason", "14 更新の理由", { area: true })}
        {select("criminalRecord", "15 犯罪を理由とする処分を受けたことの有無", [["none", "無"], ["yes", "有"]])}
        {form.criminalRecord === "yes" &&
          text("criminalDetail", "15 具体的内容", { area: true, hint: "日本国外におけるもの、交通違反等による処分を含みます。" })}
      </Section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">16 在日親族及び同居者</h2>
        <div className="mt-4 max-w-xs">{select("relativesPresent", "有無", [["yes", "有"], ["no", "無"]])}</div>
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
                <Field label="同居の有無">
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

      <Section title="申請人等作成用2（N）（項番17〜22）">
        {text("branchName", "17 勤務先 支店・事業所名")}
        {text("workPhone", "17 (3) 勤務先 電話番号")}
        {select("educationPlace", "18 (1) 最終学歴の所在", [["japan", "本邦"], ["foreign", "外国"]])}
        <Field label="18 (2) 学歴の区分" hint="最終学歴として卒業（修了）した課程を選びます。">
          <select className={inputClass} value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)}>
            <option value="">未選択</option>
            {EDUCATION_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        {text("schoolName", "18 (3) 学校名")}
        {text("graduationDate", "18 (4) 卒業年月日", { date: true })}
        {text("majorField", "19 専攻・専門分野", { placeholder: "例：工学" })}
        {text("itQualification", "20 情報処理技術者資格又は試験合格", { hint: "資格名または試験名。ない場合は空欄。" })}
        {text("legalRepName", "22 代理人 氏名（法定代理人による申請の場合）")}
        {text("legalRepRelationship", "22 本人との関係")}
        {text("legalRepAddress", "22 代理人 住所", { wide: true })}
        {text("legalRepPhone", "22 代理人 電話番号")}
        {text("agentName", "取次者 氏名")}
        {text("agentAddress", "取次者 住所", { wide: true })}
        {text("agentAffiliation", "取次者 所属機関等")}
        {text("agentPhone", "取次者 電話番号")}
      </Section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">21 職歴（外国におけるものを含む）</h2>
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

      <Section title="所属機関等作成用1・2（N）">
        {text("corporateNumber", "3 (2) 法人番号（13桁）")}
        {text("employmentInsuranceNumber", "3 (4) 雇用保険適用事業所番号（11桁）", { hint: "非該当の事業所は空欄。" })}
        {text("orgPhone", "3 (6) 電話番号")}
        {text("annualSales", "3 (8) 年間売上高（直近年度）", { placeholder: "円" })}
        {text("foreignStaffCount", "3 (9) 外国人職員数", { placeholder: "名" })}
        {text("experienceYears", "7 実務経験年数", { placeholder: "年" })}
        {text("positionTitle", "8 職務上の地位（役職名）")}
        {text("occupationCode", "9 職種（別紙「職種一覧」の番号）", { hint: "技術・人文知識・国際業務は 2〜18、24〜31、51〜54、999 から選択。" })}
        {text("dispatchName", "11 派遣先等 (1) 名称")}
        {text("dispatchCorporateNumber", "11 (2) 法人番号")}
        {text("dispatchBranchName", "11 (3) 支店・事業所名")}
        {text("dispatchInsuranceNumber", "11 (4) 雇用保険適用事業所番号")}
        {text("dispatchAddress", "11 (6) 所在地", { wide: true })}
        {text("dispatchPhone", "11 (6) 電話番号")}
        {text("dispatchCapital", "11 (7) 資本金")}
        {text("dispatchAnnualSales", "11 (8) 年間売上高")}
        {text("dispatchPeriod", "11 (9) 派遣予定期間")}
      </Section>

      <div className="flex items-center gap-3">
        <Button disabled={hasError} onClick={save}>
          保存
        </Button>
        {saved && <span className="text-sm text-green-700">保存しました。</span>}
      </div>
    </div>
  );
}
