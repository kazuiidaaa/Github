"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { logAudit, newId, saveCase } from "@/lib/store";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, PROCEDURE_TYPES, type ProcedureType } from "@/lib/types";

export default function NewCasePage() {
  const router = useRouter();
  const [caseName, setCaseName] = useState("");
  const [procedureType, setProcedureType] = useState<ProcedureType | "">("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [targetStatus, setTargetStatus] = useState("");
  const [memo, setMemo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const needsTarget = procedureType === "change" || procedureType === "coe";
  const description = PROCEDURE_TYPES.find((p) => p.value === procedureType)?.description;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!caseName.trim()) next.caseName = "案件名を入力してください。";
    if (caseName.length > 100) next.caseName = "案件名は100文字以内で入力してください。";
    if (!procedureType) next.procedureType = "手続種別を選択してください。";
    if (needsTarget && !targetStatus.trim()) next.targetStatus = "変更後の在留資格を入力してください。";
    setErrors(next);
    if (Object.keys(next).length > 0 || !procedureType) return;

    const now = new Date().toISOString();
    const id = newId();
    saveCase({
      id,
      caseName: caseName.trim(),
      procedureType,
      currentStatus: currentStatus.trim(),
      targetStatus: needsTarget ? targetStatus.trim() : "",
      memo,
      workflowStatus: "preparing",
      createdAt: now,
      updatedAt: now,
      applicant: { ...EMPTY_APPLICANT },
      employment: { ...EMPTY_EMPLOYMENT },
      requirementStates: {},
      customRequirements: [],
      plannedApplicationDate: "",
      checkMemo: "",
      checks: [],
      documents: [],
    });
    logAudit(id, "case_created");
    router.push(`/cases/${id}`);
  }

  return (
    <div className="max-w-2xl">
      <Link href="/cases" className="text-sm text-blue-700 hover:underline">
        ← 案件一覧
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">新規案件作成</h1>
      <p className="mb-6 text-sm text-slate-600">
        案件の入口情報のみ登録します。氏名・生年月日・在留期限などの正式情報は、案件作成後に「申請人情報」タブで、原本を確認しながら入力します。
      </p>
      <form onSubmit={submit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6">
        <Field label="案件名" required error={errors.caseName} hint="例：李明さん 在留期間更新（内部管理用。正式な氏名としては扱いません）">
          <input className={inputClass} value={caseName} onChange={(e) => setCaseName(e.target.value)} />
        </Field>
        <Field label="手続種別" required error={errors.procedureType} hint={description}>
          <select className={inputClass} value={procedureType} onChange={(e) => setProcedureType(e.target.value as ProcedureType | "")}>
            <option value="">選択してください</option>
            {PROCEDURE_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="現在の在留資格">
          <input className={inputClass} value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value)} placeholder="例：技術・人文知識・国際業務" />
        </Field>
        {needsTarget && (
          <Field label={procedureType === "change" ? "変更後の在留資格" : "希望する在留資格"} required error={errors.targetStatus}>
            <input className={inputClass} value={targetStatus} onChange={(e) => setTargetStatus(e.target.value)} />
          </Field>
        )}
        <Field label="案件メモ" hint="内部メモです。AI処理や判定には使用しません。">
          <textarea className={inputClass} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push("/cases")}>
            キャンセル
          </Button>
          <Button type="submit">作成</Button>
        </div>
      </form>
    </div>
  );
}
