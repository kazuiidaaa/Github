"use client";

import { useState } from "react";
import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { Button, Field, inputClass } from "@/components/ui";
import { isValidDate } from "@/lib/format";
import type { CustomRequirement } from "@/lib/types";

const PARTY_OPTIONS: ChoiceOption[] = [
  { value: "applicant", label: "申請人" },
  { value: "organization", label: "所属機関" },
];
const REQUIRED_OPTIONS: ChoiceOption[] = [
  { value: "required", label: "必須" },
  { value: "optional", label: "任意" },
];

export type CustomRequirementInput = Pick<CustomRequirement, "name" | "party" | "isRequired" | "dueDate" | "note">;

/** 行政書士が、規則にない書類を追加・編集するためのフォーム */
export function CustomRequirementForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: CustomRequirement;
  onSubmit: (value: CustomRequirementInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [party, setParty] = useState<CustomRequirement["party"]>(initial?.party ?? "applicant");
  const [isRequired, setIsRequired] = useState(initial?.isRequired ?? true);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError("書類名を入力してください。");
    if (trimmed.length > 100) return setError("書類名は100文字以内で入力してください。");
    if (dueDate && !isValidDate(dueDate)) return setError("期限は有効な日付で入力してください。");
    onSubmit({ name: trimmed, party, isRequired, dueDate: dueDate || undefined, note: note.trim() || undefined });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <Field label="書類名" required error={error}>
        <input className={inputClass} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceGroup legend="提出者" options={PARTY_OPTIONS} value={party} onChange={(v) => setParty(v as CustomRequirement["party"])} />
        <ChoiceGroup
          legend="必須・任意"
          options={REQUIRED_OPTIONS}
          value={isRequired ? "required" : "optional"}
          onChange={(v) => setIsRequired(v === "required")}
        />
        <Field label="期限">
          <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>
      <Field label="メモ">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button onClick={submit}>{initial ? "更新する" : "追加する"}</Button>
        <Button variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
