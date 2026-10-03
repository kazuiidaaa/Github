"use client";

import { useState } from "react";
import { STATUS_HINTS, StatusSelect } from "@/components/StatusSelect";
import { Button, Field, inputClass } from "@/components/ui";
import { logAudit, updateCase } from "@/lib/store";
import { PROCEDURE_TYPES, type CaseRecord, type ProcedureType } from "@/lib/types";

export function CaseInfoEditor({ record, canEdit }: { record: CaseRecord; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [caseName, setCaseName] = useState(record.caseName);
  const [procedureType, setProcedureType] = useState<ProcedureType>(record.procedureType);
  const [currentStatus, setCurrentStatus] = useState(record.currentStatus);
  const [targetStatus, setTargetStatus] = useState(record.targetStatus);
  const [memo, setMemo] = useState(record.memo);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const needsTarget = procedureType === "change" || procedureType === "coe" || procedureType === "acquisition";

  function start() {
    setCaseName(record.caseName);
    setProcedureType(record.procedureType);
    setCurrentStatus(record.currentStatus);
    setTargetStatus(record.targetStatus);
    setMemo(record.memo);
    setErrors({});
    setEditing(true);
  }

  function save() {
    const next: Record<string, string> = {};
    if (!caseName.trim()) next.caseName = "案件名を入力してください。";
    else if (caseName.length > 100) next.caseName = "案件名は100文字以内で入力してください。";
    if (needsTarget && !targetStatus.trim()) next.targetStatus = "変更後の在留資格を選択してください。";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    updateCase(record.id, (c) => ({
      ...c,
      caseName: caseName.trim(),
      procedureType,
      currentStatus: currentStatus.trim(),
      targetStatus: needsTarget ? targetStatus.trim() : "",
      memo,
    }));
    logAudit(record.id, "case_info_saved");
    setEditing(false);
  }

  if (!editing) {
    const procedure = PROCEDURE_TYPES.find((p) => p.value === record.procedureType)?.label;
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">案件情報</h2>
          {canEdit && (
            <Button variant="secondary" onClick={start}>
              編集
            </Button>
          )}
        </div>
        <dl className="grid grid-cols-[10rem_1fr] gap-y-3">
          <dt className="text-slate-500">案件名</dt>
          <dd>{record.caseName}</dd>
          <dt className="text-slate-500">手続種別</dt>
          <dd>{procedure}</dd>
          <dt className="text-slate-500">現在の在留資格</dt>
          <dd>{record.currentStatus || "-"}</dd>
          {record.targetStatus && (
            <>
              <dt className="text-slate-500">希望する在留資格</dt>
              <dd>{record.targetStatus}</dd>
            </>
          )}
          <dt className="text-slate-500">メモ</dt>
          <dd className="whitespace-pre-wrap">{record.memo || "-"}</dd>
        </dl>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 text-sm">
      <h2 className="font-semibold">案件情報の編集</h2>
      <Field label="案件名" required error={errors.caseName} hint="内部管理用です。正式な氏名としては扱いません。">
        <input className={inputClass} value={caseName} onChange={(e) => setCaseName(e.target.value)} />
      </Field>
      <Field label="手続種別" required hint={PROCEDURE_TYPES.find((p) => p.value === procedureType)?.description}>
        <select className={inputClass} value={procedureType} onChange={(e) => setProcedureType(e.target.value as ProcedureType)}>
          {PROCEDURE_TYPES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="現在の在留資格" hint={STATUS_HINTS.current}>
        <StatusSelect value={currentStatus} onChange={setCurrentStatus} />
      </Field>
      {needsTarget && (
        <Field label={procedureType === "change" ? "変更後の在留資格" : "希望する在留資格"} required error={errors.targetStatus} hint={STATUS_HINTS.target}>
          <StatusSelect value={targetStatus} onChange={setTargetStatus} />
        </Field>
      )}
      <Field label="案件メモ" hint="内部メモです。AI処理や判定には使用しません。">
        <textarea className={inputClass} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
          キャンセル
        </Button>
        <Button type="button" onClick={save}>
          保存
        </Button>
      </div>
    </section>
  );
}
