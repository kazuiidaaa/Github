"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ConfirmLeaveDialog } from "@/components/ConfirmLeaveDialog";
import { DateField } from "@/components/DateField";
import { BackLink } from "@/components/mobile/BackLink";
import { GroupedList } from "@/components/mobile/GroupedList";
import { LargeTitleHeader } from "@/components/mobile/LargeTitleHeader";
import { SelectRow, TextRow, type PickerOption } from "@/components/mobile/FormRows";
import { gradeOptions, PROCEDURE_OPTIONS, residenceStatusOptions, type ResidenceOptionText } from "@/components/StatusSelect";
import { StatusTransition } from "@/components/StatusTransition";
import { useToast } from "@/components/Toast";
import { ToneIcon } from "@/components/ui";
import { firstErrorKey, focusField } from "@/lib/formFocus";
import { useT } from "@/lib/i18n/LanguageProvider";
import { procedureDescriptionText, targetStatusLegend } from "@/lib/i18n/caseNew";
import { buildNewCaseRecord, NEW_CASE_ERROR_ORDER, newCaseNames, validateNewCase, type NewCaseErrorKey } from "@/lib/newCaseSubmit";
import { logAudit, newId, saveCase, useCan } from "@/lib/store";
import {
  ADVANCED_PROFESSIONAL_GRADE_2,
  ADVANCED_PROFESSIONAL_STATUS,
  baseResidenceStatus,
  EMPTY_EMPLOYMENT,
  procedureNeedsTarget,
  RESIDENCE_STATUSES,
  type ProcedureType,
} from "@/lib/types";
import { CASE_MEMO_ZENKAKU, zenkakuHandlers } from "@/lib/zenkaku";

const fieldId = (key: NewCaseErrorKey) => `m-new-case-${key}`;

/**
 * iPhone 版の新規案件登録（/m/cases/new）。入力の検証・案件の組み立て・保存は PC 版（app/cases/new）と共通
 * （lib/newCaseSubmit.ts、lib/store.ts の saveCase / logAudit）。AuthGate の内側で動き、新しい API・認証・データ経路は持たない。
 * PC 版との違い：雇用・会社情報の入力と、まとめて登録の一時保存は持たない（作成後に各案件の画面で入力する）。
 */
export default function MobileNewCasePage() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const canEdit = useCan("edit");
  const [bulk, setBulk] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [procedureType, setProcedureType] = useState<ProcedureType | "">("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [targetStatus, setTargetStatus] = useState("");
  const [acceptedDate, setAcceptedDate] = useState("");
  const [memo, setMemo] = useState("");
  const [groupName, setGroupName] = useState("");
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [errors, setErrors] = useState<Partial<Record<NewCaseErrorKey, string>>>({});
  const [leaveOpen, setLeaveOpen] = useState(false);
  const allowLeave = useRef(false);

  const dirty = !!(caseName || procedureType || currentStatus || targetStatus || memo || acceptedDate || groupName || names.some((n) => n));
  const needsTarget = procedureNeedsTarget(procedureType);
  const targetLegend = targetStatusLegend(t, procedureType);
  const description = procedureDescriptionText(t, procedureType);

  const optionText: ResidenceOptionText = {
    other: t("input.statusSelect_groupOther"),
    legacyGroup: t("input.statusSelect_groupLegacy"),
    legacyLabel: (value) => t("input.statusSelect_legacyLabel", { value }),
  };
  const statusOptions = (value: string): PickerOption[] => {
    const base = baseResidenceStatus(value);
    const legacy = base && !(RESIDENCE_STATUSES as readonly string[]).includes(base) ? base : undefined;
    return residenceStatusOptions(legacy, optionText).map((o) => ({ value: o.value, label: o.label, group: o.group }));
  };
  const procedureOptions: PickerOption[] = PROCEDURE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

  // 高度専門職は、号（イ・ロ・ハ。変更では2号も）を続けて選ぶ。号なしの値（高度専門職）へも戻せる
  function gradeRow(id: string, value: string, onChange: (v: string) => void, withGrade2: boolean) {
    if (baseResidenceStatus(value) !== ADVANCED_PROFESSIONAL_STATUS) return null;
    const opts = [...gradeOptions(withGrade2 || value === ADVANCED_PROFESSIONAL_GRADE_2), { value: ADVANCED_PROFESSIONAL_STATUS, label: t("mobileNew.gradeNone") }];
    return (
      <SelectRow
        id={id}
        label={t("mobileNew.gradeLegend")}
        hint={t("input.statusSelect_gradeHint")}
        options={opts.map((o) => ({ value: o.value, label: o.label }))}
        value={value}
        onChange={(v) => onChange(v || ADVANCED_PROFESSIONAL_STATUS)}
        placeholder={t("mobileNew.gradeNone")}
      />
    );
  }

  function goBack() {
    allowLeave.current = true;
    router.push("/m/cases");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { bulk, caseName, procedureType, currentStatus, targetStatus, memo, acceptedDate, employment: { ...EMPTY_EMPLOYMENT }, groupName, names };
    const next = validateNewCase(input, t, targetLegend, false);
    setErrors(next);
    const first = firstErrorKey(next, NEW_CASE_ERROR_ORDER);
    if (first) {
      requestAnimationFrame(() => focusField(fieldId(first)));
      return;
    }
    if (!procedureType) return;
    const created = newCaseNames(input).map((name) => {
      const id = newId();
      saveCase(buildNewCaseRecord({ ...input, procedureType }, name, id, new Date().toISOString()));
      logAudit(id, "case_created", bulk ? { bulk: names.length } : undefined);
      return id;
    });
    allowLeave.current = true;
    if (bulk) {
      toast.success(t("caseNew.createdBulk", { count: created.length }));
      router.push("/m/cases");
      return;
    }
    toast.success(t("caseNew.created"));
    router.push(`/m/cases/${created[0]}`);
  }

  const back = (
    <BackLink
      href="/m/cases"
      label={t("mobile.tabCases")}
      ariaLabel={t("mobile.backToCasesAria")}
      onClick={(e) => {
        if (dirty && !allowLeave.current) {
          e.preventDefault();
          setLeaveOpen(true);
        }
      }}
    />
  );

  if (!canEdit) {
    return (
      <>
        <LargeTitleHeader title={t("mobileNew.title")} leading={back} />
        <p role="note" className="mx-4 rounded-[10px] bg-white p-4 text-base">
          {t("caseNew.noPermission")}
        </p>
      </>
    );
  }

  const errorList = NEW_CASE_ERROR_ORDER.filter((k) => errors[k] && (k === "caseName" ? !bulk : k === "groupName" || k === "names" ? bulk : k === "employment" ? false : k === "targetStatus" ? needsTarget : true));

  return (
    <>
      <LargeTitleHeader title={t("mobileNew.title")} leading={back} />
      <form onSubmit={submit} noValidate>
        <p className="px-4 pb-1 text-sm text-slate-600">{t("caseNew.intro")}</p>

        {/* 登録方法（分割ボタン）。選択中はチェックの印と太字でも示す */}
        <div role="group" aria-label={t("caseNew.modeAria")} className="mx-4 mt-3 grid grid-cols-2 gap-1 rounded-[10px] bg-slate-200 p-1">
          {[
            { v: false, label: t("caseNew.modeSingle") },
            { v: true, label: t("caseNew.modeBulk") },
          ].map((m) => (
            <button
              key={String(m.v)}
              type="button"
              aria-pressed={bulk === m.v}
              onClick={() => setBulk(m.v)}
              className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-[8px] px-2 text-center text-sm ${bulk === m.v ? "bg-white font-bold text-accent shadow-sm" : "font-medium text-slate-700 active:bg-slate-100"}`}
            >
              {bulk === m.v && (
                <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="m3 8.5 3.2 3.2L13 4.5" />
                </svg>
              )}
              {m.label}
            </button>
          ))}
        </div>
        {bulk && <p className="mx-4 mt-2 text-xs leading-relaxed text-slate-600">{t("mobileNew.bulkEmploymentNote")}</p>}

        {errorList.length > 0 && (
          <div role="alert" className="mx-4 mt-4 rounded-[10px] border border-danger-line bg-danger-soft p-3 text-sm text-danger-text">
            <p className="flex items-center gap-1.5 font-bold">
              <ToneIcon tone="red" />
              {t("caseNew.errorSummary", { count: errorList.length })}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {errorList.map((k) => (
                <li key={k}>{errors[k]}</li>
              ))}
            </ul>
          </div>
        )}

        <GroupedList header={t("mobileNew.sectionProcedure")}>
          <SelectRow
            id={fieldId("procedureType")}
            label={t("caseNew.procedureLegend")}
            required
            options={procedureOptions}
            value={procedureType}
            onChange={(v) => setProcedureType(v as ProcedureType | "")}
            placeholder={t("mobileNew.select")}
            error={errors.procedureType}
            hint={description ?? t("caseNew.procedureNote")}
          />
        </GroupedList>

        {procedureType !== "" && (
          <GroupedList header={t("mobileNew.sectionStatus")}>
            <SelectRow
              id="m-new-case-currentStatus"
              label={t("caseNew.currentStatusLegend")}
              options={statusOptions(currentStatus)}
              value={baseResidenceStatus(currentStatus)}
              onChange={setCurrentStatus}
              placeholder={t("mobileNew.select")}
              hint={t("input.statusSelect_hintCurrent")}
            />
            {gradeRow("m-new-case-currentGrade", currentStatus, setCurrentStatus, false)}
            {needsTarget && (
              <SelectRow
                id={fieldId("targetStatus")}
                label={targetLegend}
                required
                options={statusOptions(targetStatus)}
                value={baseResidenceStatus(targetStatus)}
                onChange={setTargetStatus}
                placeholder={t("mobileNew.select")}
                error={errors.targetStatus}
                hint={t("input.statusSelect_hintTarget")}
              />
            )}
            {needsTarget && gradeRow("m-new-case-targetGrade", targetStatus, setTargetStatus, procedureType === "change")}
          </GroupedList>
        )}
        {procedureType !== "" && (
          <p className="mx-4 -mt-2 rounded-[10px] bg-slate-100 p-3 text-sm">
            <StatusTransition procedureType={procedureType} current={currentStatus} target={needsTarget ? targetStatus : undefined} />
          </p>
        )}

        {bulk ? (
          <>
            <GroupedList header={t("mobileNew.sectionCase")}>
              <TextRow
                id={fieldId("groupName")}
                label={t("caseNew.groupNameLabel")}
                required
                value={groupName}
                onChange={setGroupName}
                error={errors.groupName}
                hint={t("caseNew.groupNameHint")}
              />
            </GroupedList>
            <GroupedList header={t("mobileNew.sectionNames")} footer={errors.names ? undefined : t("caseNew.namesHint")}>
              {names.map((n, i) => (
                <TextRow
                  key={i}
                  id={i === 0 ? fieldId("names") : `m-new-case-names-${i}`}
                  ariaLabel={t("caseNew.namesRowAria", { n: i + 1 })}
                  placeholder={t("caseNew.namesPlaceholder")}
                  value={n}
                  onChange={(v) => setNames((l) => l.map((x, j) => (j === i ? v : x)))}
                  error={i === 0 ? errors.names : undefined}
                  trailing={
                    <button
                      type="button"
                      disabled={names.length <= 1}
                      aria-label={`${t("caseNew.namesDelete")}: ${t("caseNew.namesRowAria", { n: i + 1 })}`}
                      onClick={() => setNames((l) => l.filter((_, j) => j !== i))}
                      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center px-2 text-sm font-bold text-accent disabled:text-slate-400"
                    >
                      {t("caseNew.namesDelete")}
                    </button>
                  }
                />
              ))}
              <li className="m-row relative">
                <button type="button" onClick={() => setNames((l) => [...l, ""])} className="flex min-h-[44px] w-full items-center gap-2 px-4 text-left text-base font-bold text-accent active:bg-slate-100">
                  <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M8 2v12M2 8h12" />
                  </svg>
                  {t("caseNew.namesAdd")}
                </button>
              </li>
            </GroupedList>
          </>
        ) : (
          <GroupedList header={t("mobileNew.sectionCase")}>
            <TextRow
              id={fieldId("caseName")}
              label={t("caseNew.caseNameLabel")}
              required
              value={caseName}
              onChange={setCaseName}
              error={errors.caseName}
              hint={t("caseNew.caseNameHint")}
            />
          </GroupedList>
        )}

        <GroupedList header={t("mobileNew.sectionOptional")}>
          <li id={fieldId("acceptedDate")} className="m-row relative px-4 pt-2">
            <label htmlFor="m-new-case-acceptedDate" className="block text-base font-medium">
              {t("input.acceptedDateField_label")}
            </label>
            <DateField
              id="m-new-case-acceptedDate"
              value={acceptedDate}
              onChange={setAcceptedDate}
              error={errors.acceptedDate}
              className="min-h-[44px] w-full bg-transparent py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
            <p className="pb-2.5 text-xs text-slate-600">{t("input.acceptedDateField_hint")}</p>
          </li>
          <TextRow id="m-new-case-memo" label={t("caseNew.memoLabel")} multiline value={memo} onChange={setMemo} hint={t("caseNew.memoHint")} inputProps={zenkakuHandlers(CASE_MEMO_ZENKAKU, setMemo)} />
        </GroupedList>

        <div className="mx-4 mb-2 mt-6">
          <button type="submit" className="min-h-[50px] w-full rounded-[12px] bg-accent px-5 text-base font-bold text-accent-text active:opacity-80">
            {bulk ? t("caseNew.submitBulk", { count: names.length }) : t("caseNew.submit")}
          </button>
        </div>
      </form>
      {leaveOpen && <ConfirmLeaveDialog onCancel={() => setLeaveOpen(false)} onConfirm={goBack} />}
    </>
  );
}
