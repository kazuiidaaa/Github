"use client";

import { useState } from "react";
import { STATUS_HINTS, StatusSelect } from "@/components/StatusSelect";
import { Badge, Button, Field, inputClass } from "@/components/ui";
import { validateApplicant, validateDraft, type ApplicantField } from "@/lib/applicant";
import { formatDateTime } from "@/lib/format";
import { getConfirmerName, logAudit, updateCase } from "@/lib/store";
import { useDocumentUrl } from "@/lib/useDocumentUrl";
import type { Applicant, CaseRecord, DocumentRecord } from "@/lib/types";

const FIELD_LABELS: Record<ApplicantField, string> = {
  legalName: "氏名",
  nationality: "国籍・地域",
  dateOfBirth: "生年月日",
  residenceStatus: "在留資格",
  residenceExpiryDate: "在留期間の満了日",
};

type TextKey = "legalName" | "nationality" | "address" | "residenceCardNumber" | "workRestriction";

function Original({ doc }: { doc: DocumentRecord }) {
  const url = useDocumentUrl(doc);
  return (
    <>
      <h2 className="mb-3 font-semibold">原本：{doc.fileName}</h2>
      {url && doc.mimeType.startsWith("image/") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="在留カード" className="max-h-[32rem] w-full rounded border border-slate-200 object-contain" />
      )}
      {url && doc.mimeType === "application/pdf" && (
        <iframe src={url} title="在留カード" className="h-[32rem] w-full rounded border border-slate-200" />
      )}
      {!url && (
        <p className="rounded bg-slate-50 p-8 text-center text-sm text-slate-500">
          プレビューを表示できません（読み込み中、またはファイル容量が大きいため保持していません）。
        </p>
      )}
    </>
  );
}

export function ApplicantForm({ record, onGoDocuments }: { record: CaseRecord; onGoDocuments: () => void }) {
  const [form, setForm] = useState<Applicant>(record.applicant);
  const [errors, setErrors] = useState<Partial<Record<ApplicantField, string>>>({});
  const [message, setMessage] = useState("");
  const confirmed = record.applicant.confirmationStatus === "confirmed";
  const doc = record.documents[0];
  const errorFields = (Object.keys(FIELD_LABELS) as ApplicantField[]).filter((k) => errors[k]);

  function set<K extends keyof Applicant>(key: K, value: Applicant[K]) {
    setMessage("");
    setForm((f) => ({ ...f, [key]: value }));
  }

  function text(key: TextKey, label: string, opts: { required?: boolean; placeholder?: string; hint?: string } = {}) {
    return (
      <Field label={label} required={opts.required} hint={opts.hint} error={errors[key as ApplicantField]}>
        <input
          className={inputClass}
          value={form[key]}
          placeholder={opts.placeholder}
          disabled={confirmed}
          onChange={(e) => set(key, e.target.value)}
        />
      </Field>
    );
  }

  function date(key: "dateOfBirth" | "residenceExpiryDate", label: string) {
    return (
      <Field label={label} required error={errors[key]}>
        <input
          className={inputClass}
          value={form[key]}
          placeholder="YYYY-MM-DD"
          disabled={confirmed}
          onChange={(e) => set(key, e.target.value)}
        />
      </Field>
    );
  }

  function saveDraft() {
    const next = validateDraft(form);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    updateCase(record.id, (c) => ({
      ...c,
      workflowStatus: "preparing",
      applicant: { ...form, confirmationStatus: "draft", confirmedAt: undefined, confirmedBy: undefined },
    }));
    logAudit(record.id, "applicant_saved");
    setMessage("下書きを保存しました。");
  }

  async function confirm() {
    const next = validateApplicant(form);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setMessage("");
      return;
    }
    const confirmedBy = await getConfirmerName();
    updateCase(record.id, (c) => ({
      ...c,
      workflowStatus: "applicant_confirmed",
      applicant: { ...form, confirmationStatus: "confirmed", confirmedAt: new Date().toISOString(), confirmedBy },
    }));
    logAudit(record.id, "applicant_confirmed");
    setMessage("確認済みにしました。");
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
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        {doc ? (
          <Original doc={doc} />
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            <p className="mb-3">原本（在留カード）が未登録です。登録すると、ここに表示して照合できます。</p>
            <Button variant="secondary" onClick={onGoDocuments}>
              書類タブへ
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold">申請人情報</h2>
          <Badge tone={confirmed ? "green" : "yellow"}>{confirmed ? "確認済み" : "下書き"}</Badge>
        </div>
        <p className="mb-5 text-xs text-slate-500">
          原本を確認しながら入力してください。自動読み取りは行いません。確認済みにした値が、正式な申請人情報になります。
        </p>
        {errorFields.length > 0 && (
          <div role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">入力内容に {errorFields.length} 件の誤りまたは未入力があります。</p>
            <ul className="mt-1 list-disc pl-5">
              {errorFields.map((k) => (
                <li key={k}>
                  {FIELD_LABELS[k]}：{errors[k]}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">{text("legalName", "氏名", { required: true, placeholder: "LI MING" })}</div>
          {text("nationality", "国籍・地域", { required: true, placeholder: "中国" })}
          <Field label="性別" hint="在留カードの「性別」欄の記載どおりに選びます。">
            <select className={inputClass} value={form.gender} disabled={confirmed} onChange={(e) => set("gender", e.target.value)}>
              <option value="">選択してください</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </Field>
          {date("dateOfBirth", "生年月日")}
          <div className="md:col-span-2">{text("address", "住居地")}</div>
          <Field label="在留資格" required error={errors.residenceStatus} hint={STATUS_HINTS.card}>
            <StatusSelect value={form.residenceStatus} disabled={confirmed} onChange={(v) => set("residenceStatus", v)} />
          </Field>
          {date("residenceExpiryDate", "在留期間の満了日")}
          {text("residenceCardNumber", "在留カード番号")}
          {text("workRestriction", "就労制限", { placeholder: "例：就労制限なし" })}
        </div>

        <div className="mt-6 rounded-md bg-slate-50 p-4 text-sm">
          {confirmed ? (
            <>
              <p className="text-green-700">
                ✓ 確認済みです（確認者：{record.applicant.confirmedBy}／{formatDateTime(record.applicant.confirmedAt)}）
              </p>
              <div className="mt-3">
                <Button variant="secondary" onClick={reopen}>
                  編集する（下書きに戻します）
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={saveDraft}>
                  下書き保存
                </Button>
                <Button onClick={() => void confirm()}>確認済みにする</Button>
                {message && <span className="text-green-700">{message}</span>}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                氏名・国籍・地域・生年月日・在留資格・在留期間の満了日（*）をすべて入力すると、確認済みにできます。
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
