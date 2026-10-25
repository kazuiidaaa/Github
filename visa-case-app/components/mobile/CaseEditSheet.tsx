"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChoiceOption } from "@/components/ChoiceGroup";
import { Modal } from "@/components/Modal";
import { DateRow, SelectRow, TextRow, type PickerOption } from "@/components/mobile/FormRows";
import { GroupedList } from "@/components/mobile/GroupedList";
import { Sheet } from "@/components/mobile/Sheet";
import { StatusPickerRow } from "@/components/mobile/StatusPickerRow";
import { gradeOptions, PROCEDURE_OPTIONS, residenceOptionText, residenceStatusOptions } from "@/components/StatusSelect";
import { useToast } from "@/components/Toast";
import { ToneIcon } from "@/components/ui";
import { isAcceptedAfterPlanned } from "@/lib/acceptedDate";
import {
  CASE_EDIT_ERROR_ORDER,
  cancelOutcome,
  draftFromRecord,
  isDraftDirty,
  submitCaseEdit,
  type CaseEditDraft,
  type CaseEditErrors,
} from "@/lib/caseEditDraft";
import { focusField } from "@/lib/formFocus";
import { procedureDescriptionText, targetStatusLegend } from "@/lib/i18n/caseNew";
import { useT } from "@/lib/i18n/LanguageProvider";
import { logAudit, settleWrites, updateCase, useCan } from "@/lib/store";
import {
  ADVANCED_PROFESSIONAL_GRADE_2,
  ADVANCED_PROFESSIONAL_STATUS,
  baseResidenceStatus,
  needsTargetStatus,
  RESIDENCE_STATUSES,
  type CaseRecord,
  type ProcedureType,
} from "@/lib/types";
import { CASE_MEMO_ZENKAKU, zenkakuHandlers } from "@/lib/zenkaku";

const fieldId = (key: string) => `m-case-edit-${key}`;
const EDIT_BUTTON_ID = "m-case-edit-open";

/** 変更を破棄する前の確認（変更を破棄／編集を続ける）。シートの上に重ねる。最初のフォーカスは安全な「編集を続ける」 */
function DiscardConfirm({ onKeep, onDiscard }: { onKeep: () => void; onDiscard: () => void }) {
  const t = useT();
  const titleId = useId();
  return (
    <Modal titleId={titleId} onCancel={onKeep}>
      {({ cancel }) => (
        <>
          <h2 id={titleId} className="text-lg font-bold">
            {t("mobileDetail.editDiscardTitle")}
          </h2>
          <p className="mt-2 text-base">{t("mobileDetail.editDiscardBody")}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" data-autofocus onClick={cancel} className="min-h-[44px] rounded-[10px] bg-accent px-4 py-2 text-base font-bold text-accent-text active:opacity-80">
              {t("mobileDetail.editKeep")}
            </button>
            <button type="button" onClick={onDiscard} className="min-h-[44px] rounded-[10px] border border-danger-line bg-danger-soft px-4 py-2 text-base font-bold text-danger-text active:opacity-80">
              {t("mobileDetail.editDiscard")}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/**
 * 案件の編集シート本体（iPhone の .sheet）。左「キャンセル」・右「完了」。変更があるままキャンセルすると確認を出す。
 * 保存は PC 版と同じ lib/store.ts（updateCase / logAudit）。失敗はシートを閉じずに、印つきの文で示す。
 */
export function CaseEditSheet({ record, onClose }: { record: CaseRecord; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [initial] = useState(() => draftFromRecord(record));
  const [draft, setDraft] = useState<CaseEditDraft>(initial);
  const [errors, setErrors] = useState<CaseEditErrors>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const failRef = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<CaseEditDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaveFailed(false);
  };
  const needsTarget = needsTargetStatus(draft.procedureType);
  const targetLegend = targetStatusLegend(t, draft.procedureType);
  const errorList = CASE_EDIT_ERROR_ORDER.filter((k) => errors[k] && (k !== "targetStatus" || needsTarget));

  const optionText = residenceOptionText(t);
  const statusOptions = (value: string): ChoiceOption[] => {
    const base = baseResidenceStatus(value);
    const legacy = base && !(RESIDENCE_STATUSES as readonly string[]).includes(base) ? base : undefined;
    return residenceStatusOptions(legacy, optionText);
  };
  const procedureOptions: PickerOption[] = PROCEDURE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

  // 高度専門職は、号を続けて選ぶ（新規登録と同じ）
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

  // 保存の失敗の文が、スクロールの外に隠れないよう見える位置へ出す
  useEffect(() => {
    if (saveFailed) failRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [saveFailed]);

  function requestCancel() {
    if (busy) return;
    if (cancelOutcome(isDraftDirty(initial, draft)) === "confirm") setConfirming(true);
    else onClose();
  }

  async function done() {
    if (busy) return;
    setBusy(true);
    setSaveFailed(false);
    const result = await submitCaseEdit({
      record,
      initial,
      draft,
      t,
      targetLegend,
      deps: { update: updateCase, settle: settleWrites, audit: (id, action, detail) => logAudit(id, action, detail) },
    });
    setBusy(false);
    if (result.kind === "invalid") {
      setErrors(result.errors);
      // 誤りの表示（aria-invalid など）が反映された後に、最初の誤りの欄へ移す
      requestAnimationFrame(() => focusField(fieldId(result.first)));
      return;
    }
    setErrors({});
    if (result.kind === "failed") {
      setSaveFailed(true);
      return;
    }
    if (result.kind === "saved") toast.success(t("caseForm.saved"));
    onClose();
  }

  return (
    <>
      <Sheet
        title={t("mobileDetail.editTitle")}
        cancelLabel={t("mobileDetail.editCancel")}
        doneLabel={busy ? t("mobileDetail.editSaving") : t("mobileDetail.editDone")}
        busy={busy}
        onClose={requestCancel}
        onDone={() => void done()}
      >
        {(errorList.length > 0 || saveFailed) && (
          <div className="mx-4 mt-4 space-y-2">
            {errorList.length > 0 && (
              <div role="alert" className="rounded-[10px] border border-danger-line bg-danger-soft p-3 text-sm text-danger-text">
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
            {saveFailed && (
              <div ref={failRef} role="alert" className="rounded-[10px] border border-danger-line bg-danger-soft p-3 text-sm text-danger-text">
                <p className="flex items-center gap-1.5 font-bold">
                  <ToneIcon tone="red" />
                  {t("mobileDetail.editSaveFailedTitle")}
                </p>
                <p className="mt-1">{t("mobileDetail.editSaveFailed")}</p>
              </div>
            )}
          </div>
        )}

        <GroupedList header={t("mobileDetail.editSectionCase")}>
          <TextRow
            id={fieldId("caseName")}
            label={t("caseNew.caseNameLabel")}
            required
            value={draft.caseName}
            onChange={(v) => set({ caseName: v })}
            error={errors.caseName}
            hint={t("caseInfo.nameHint")}
          />
        </GroupedList>

        <GroupedList header={t("mobileDetail.editSectionStatus")}>
          <SelectRow
            id={fieldId("procedureType")}
            label={t("caseNew.procedureLegend")}
            required
            options={procedureOptions}
            value={draft.procedureType}
            onChange={(v) => set({ procedureType: v as ProcedureType })}
            placeholder={t("mobileNew.select")}
            wrapValue
            hint={procedureDescriptionText(t, draft.procedureType)}
          />
          <StatusPickerRow
            id={fieldId("currentStatus")}
            label={t("caseNew.currentStatusLegend")}
            options={statusOptions(draft.currentStatus)}
            value={baseResidenceStatus(draft.currentStatus)}
            onChange={(v) => set({ currentStatus: v })}
            placeholder={t("mobileNew.select")}
            hint={t("input.statusSelect_hintCurrent")}
          />
          {gradeRow(fieldId("currentGrade"), draft.currentStatus, (v) => set({ currentStatus: v }), false)}
          {needsTarget && (
            <StatusPickerRow
              id={fieldId("targetStatus")}
              label={targetLegend}
              required
              options={statusOptions(draft.targetStatus)}
              value={baseResidenceStatus(draft.targetStatus)}
              onChange={(v) => set({ targetStatus: v })}
              placeholder={t("mobileNew.select")}
              error={errors.targetStatus}
              hint={t("input.statusSelect_hintTarget")}
            />
          )}
          {needsTarget && gradeRow(fieldId("targetGrade"), draft.targetStatus, (v) => set({ targetStatus: v }), draft.procedureType === "change")}
        </GroupedList>

        <GroupedList header={t("mobileDetail.editSectionDate")}>
          <DateRow
            id={fieldId("acceptedDate")}
            label={t("input.acceptedDateField_label")}
            value={draft.acceptedDate}
            onChange={(v) => set({ acceptedDate: v })}
            error={errors.acceptedDate}
            hint={t("input.acceptedDateField_hint")}
            warning={
              isAcceptedAfterPlanned(draft.acceptedDate, record.plannedApplicationDate)
                ? t("input.acceptedDateField_warning", { date: record.plannedApplicationDate })
                : undefined
            }
          />
        </GroupedList>

        <GroupedList header={t("mobileDetail.editSectionMemo")}>
          <TextRow
            id={fieldId("memo")}
            label={t("caseNew.memoLabel")}
            multiline
            value={draft.memo}
            onChange={(v) => set({ memo: v })}
            hint={t("caseNew.memoHint")}
            inputProps={zenkakuHandlers(CASE_MEMO_ZENKAKU, (v) => set({ memo: v }))}
          />
        </GroupedList>
      </Sheet>
      {confirming && (
        <DiscardConfirm
          onKeep={() => setConfirming(false)}
          onDiscard={() => {
            setConfirming(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

/**
 * 案件詳細の右上の「編集」と、押すと開く編集シート。編集の権限が無い役割（閲覧のみ・役割の取得前）には何も出さない
 * （画面の出し分けのみ。実際の拒否はデータベース側）。シートを閉じたら、「編集」ボタンへフォーカスを戻す。
 */
export function CaseEditAction({ record }: { record: CaseRecord }) {
  const t = useT();
  const canEdit = useCan("edit");
  const [open, setOpen] = useState(false);
  const wasOpen = useRef(false);

  // 閉じた後の復帰先を一つに決める（シートとその上の確認がそれぞれ戻すより後に、ここで確定させる）
  useEffect(() => {
    if (wasOpen.current && !open) document.getElementById(EDIT_BUTTON_ID)?.focus();
    wasOpen.current = open;
  }, [open]);

  if (!canEdit) return null;
  return (
    <>
      <button
        type="button"
        id={EDIT_BUTTON_ID}
        aria-haspopup="dialog"
        aria-label={t("mobileDetail.editButtonAria")}
        onClick={() => setOpen(true)}
        className="min-h-[44px] min-w-[44px] px-2 text-base font-bold text-accent active:opacity-60"
      >
        {t("mobileDetail.editButton")}
      </button>
      {/* 「編集」は上部のバー（backdrop-filter を持つ）の中にあり、そこでは position: fixed の基準がバーになってしまうため、.m-root の直下へ出す */}
      {open && createPortal(<CaseEditSheet record={record} onClose={() => setOpen(false)} />, document.querySelector(".m-root") ?? document.body)}
    </>
  );
}
