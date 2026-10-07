"use client";

import { DateField } from "@/components/DateField";
import { useState } from "react";
import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { Button, Field, inputClass } from "@/components/ui";
import { isValidDate } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { CustomRequirement } from "@/lib/types";

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
  const t = useT();
  const partyOptions: ChoiceOption[] = [
    { value: "applicant", label: t("caseRequirements.partyApplicant") },
    { value: "organization", label: t("caseRequirements.partyOrganization") },
  ];
  const requiredOptions: ChoiceOption[] = [
    { value: "required", label: t("caseRequirements.isRequired") },
    { value: "optional", label: t("caseRequirements.isOptional") },
  ];
  const [name, setName] = useState(initial?.name ?? "");
  const [party, setParty] = useState<CustomRequirement["party"]>(initial?.party ?? "applicant");
  const [isRequired, setIsRequired] = useState(initial?.isRequired ?? true);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError(t("caseRequirements.formNameRequired"));
    if (trimmed.length > 100) return setError(t("caseRequirements.formNameTooLong"));
    if (dueDate && !isValidDate(dueDate)) return setError(t("caseRequirements.formDueInvalid"));
    onSubmit({ name: trimmed, party, isRequired, dueDate: dueDate || undefined, note: note.trim() || undefined });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <Field label={t("caseRequirements.formName")} required error={error}>
        <input className={inputClass} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceGroup legend={t("caseRequirements.formParty")} options={partyOptions} value={party} onChange={(v) => setParty(v as CustomRequirement["party"])} />
        <ChoiceGroup
          legend={t("caseRequirements.formRequired")}
          options={requiredOptions}
          value={isRequired ? "required" : "optional"}
          onChange={(v) => setIsRequired(v === "required")}
        />
        <Field label={t("caseRequirements.formDue")}>
          <DateField className={inputClass} value={dueDate} onChange={setDueDate} />
        </Field>
      </div>
      <Field label={t("caseRequirements.formNote")}>
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button onClick={submit}>{initial ? t("caseRequirements.formUpdate") : t("caseRequirements.formAdd")}</Button>
        <Button variant="secondary" onClick={onCancel}>
          {t("caseRequirements.formCancel")}
        </Button>
      </div>
    </div>
  );
}
