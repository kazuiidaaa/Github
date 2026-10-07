"use client";

import { EMPTY_FORM_DETAILS } from "@/lib/formDetails";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EmploymentFields, hasEmploymentDateError } from "@/components/EmploymentForm";
import { AcceptedDateField } from "@/components/AcceptedDateField";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { PROCEDURE_OPTIONS, StatusSelect, useStatusHints } from "@/components/StatusSelect";
import { noRuleMessage, procedureDescriptionText, targetStatusLegend } from "@/lib/i18n/caseNew";
import { useT } from "@/lib/i18n/LanguageProvider";
import { Button, Field, inputClass } from "@/components/ui";
import { hasAcceptedDateError } from "@/lib/acceptedDate";
import { buildBulkCaseNames } from "@/lib/bulkCaseNames";
import { ConfirmLeaveDialog } from "@/components/ConfirmLeaveDialog";
import { clearNewCaseDraft, INITIAL_BULK_NAMES, isNewCaseDirty, loadNewCaseDraft, saveNewCaseDraft } from "@/lib/newCaseDraft";
import { shouldShowNoRuleGuide } from "@/lib/requirements/evaluate";
import { useToast } from "@/components/Toast";
import { logAudit, newId, saveCase, useCan } from "@/lib/store";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, procedureNeedsTarget, type EmploymentInfo, type ProcedureType } from "@/lib/types";
import { CASE_MEMO_ZENKAKU, zenkakuHandlers } from "@/lib/zenkaku";

export default function NewCasePage() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const hints = useStatusHints();
  const canEdit = useCan("edit");
  const [caseName, setCaseName] = useState("");
  const [procedureType, setProcedureType] = useState<ProcedureType | "">("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [targetStatus, setTargetStatus] = useState("");
  const [memo, setMemo] = useState("");
  const [acceptedDate, setAcceptedDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // まとめて登録：雇用・会社情報を1回入力し、申請人（案件名）を複数人分入力する
  const [bulk, setBulk] = useState(false);
  const [employment, setEmployment] = useState<EmploymentInfo>({ ...EMPTY_EMPLOYMENT });
  const [groupName, setGroupName] = useState("");
  const [names, setNames] = useState<string[]>(["", "", ""]);

  // 入力内容の保護（Issue #155）：離脱の警告と、まとめて登録の一時保存
  const [restored, setRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const allowLeave = useRef(false);
  const dirty = isNewCaseDirty({ caseName, procedureType, currentStatus, targetStatus, memo, groupName, names, employment }) || acceptedDate !== "";

  useEffect(() => {
    // 同じタブでの再読み込み後に、前回の入力を復元する（サーバー描画との不一致を避けるため、表示後に読む）
    const d = loadNewCaseDraft();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (d) {
      setBulk(true);
      setProcedureType(d.procedureType as ProcedureType | "");
      setCurrentStatus(d.currentStatus);
      setTargetStatus(d.targetStatus);
      setGroupName(d.groupName);
      setNames(d.names);
      setEmployment(d.employment);
      setRestored(true);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated || allowLeave.current) return;
    if (bulk) {
      saveNewCaseDraft({ procedureType, currentStatus, targetStatus, groupName, names, employment });
    }
  }, [hydrated, bulk, procedureType, currentStatus, targetStatus, groupName, names, employment]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowLeave.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function leave() {
    allowLeave.current = true;
    clearNewCaseDraft();
    router.push("/cases");
  }

  function clearInput() {
    clearNewCaseDraft();
    setRestored(false);
    setProcedureType("");
    setCurrentStatus("");
    setTargetStatus("");
    setMemo("");
    setAcceptedDate("");
    setGroupName("");
    setNames([...INITIAL_BULK_NAMES]);
    setEmployment({ ...EMPTY_EMPLOYMENT });
    setErrors({});
  }

  const needsTarget = procedureNeedsTarget(procedureType);
  // 必要書類の判定（evaluate）と同じ基準で、規則が未整備かを判定する
  const showNoRuleGuide = shouldShowNoRuleGuide(procedureType, currentStatus, targetStatus);

  const description = procedureDescriptionText(t, procedureType);
  const targetLegend = targetStatusLegend(t, procedureType);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const bulkNames = bulk ? buildBulkCaseNames(groupName, names) : [];
    if (bulk) {
      if (!groupName.trim()) next.groupName = t("caseNew.errGroupNameRequired");
      else if (groupName.length > 100) next.groupName = t("caseNew.errGroupNameTooLong");
      if (names.length === 0) next.names = t("caseNew.errNamesEmpty");
      else if (bulkNames.some((n) => n.length > 100)) next.names = t("caseNew.errNamesTooLong");
      if (hasEmploymentDateError(employment)) next.employment = t("caseNew.errEmploymentDate");
    } else {
      if (!caseName.trim()) next.caseName = t("caseNew.errCaseNameRequired");
      if (caseName.length > 100) next.caseName = t("caseNew.errCaseNameTooLong");
    }
    if (!procedureType) next.procedureType = t("caseNew.errProcedureRequired");
    if (needsTarget && !targetStatus.trim()) next.targetStatus = t("caseNew.errTargetRequired", { label: targetLegend });
    if (hasAcceptedDateError(acceptedDate)) next.acceptedDate = t("caseNew.errAcceptedDate");
    setErrors(next);
    if (Object.keys(next).length > 0 || !procedureType) return;

    const create = (name: string) => {
      const now = new Date().toISOString();
      const id = newId();
      saveCase({
        id,
        caseName: name,
        procedureType,
        currentStatus: currentStatus.trim(),
        targetStatus: needsTarget ? targetStatus.trim() : "",
        memo,
        acceptedDate,
        workflowStatus: "preparing",
        createdAt: now,
        updatedAt: now,
        applicant: { ...EMPTY_APPLICANT },
        // 案件ごとに独立したレコードとするため、複製して保存する（作成後の同期は行わない）
        employment: bulk ? { ...employment } : { ...EMPTY_EMPLOYMENT },
        formDetails: { ...EMPTY_FORM_DETAILS },
        requirementStates: {},
        customRequirements: [],
        plannedApplicationDate: "",
        checkMemo: "",
        checks: [],
        documents: [],
      });
      logAudit(id, "case_created", bulk ? { bulk: bulkNames.length } : undefined);
      return id;
    };

    // 作成に成功したら、離脱の警告を解除し、一時保存を消してから遷移する
    allowLeave.current = true;
    if (bulk) {
      bulkNames.forEach(create);
      clearNewCaseDraft();
      toast.success(t("caseNew.createdBulk", { count: bulkNames.length }));
      router.push("/cases");
      return;
    }
    const id = create(caseName.trim());
    clearNewCaseDraft();
    toast.success(t("caseNew.created"));
    // 作成直後は、次に行う書類の登録へ誘導するため「書類」タブを開く
    router.push(`/cases/${id}?tab=documents`);
  }

  if (!canEdit) {
    return (
      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <p className="mb-3">{t("caseNew.noPermission")}</p>
        <Link href="/cases" className="text-blue-700 hover:underline">
          {t("caseNew.backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/cases"
        className="text-sm text-blue-700 hover:underline"
        onClick={(e) => {
          if (dirty) {
            e.preventDefault();
            setLeaveOpen(true);
          }
        }}
      >
        {t("caseNew.backToList")}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{t("caseNew.title")}</h1>
      <p className="mb-6 text-sm text-slate-600">{t("caseNew.intro")}</p>
      <div className="mb-4 flex flex-wrap gap-1 text-sm" role="group" aria-label={t("caseNew.modeAria")}>
        {[
          { v: false, label: t("caseNew.modeSingle") },
          { v: true, label: t("caseNew.modeBulk") },
        ].map((m) => (
          <button
            key={String(m.v)}
            type="button"
            aria-pressed={bulk === m.v}
            onClick={() => setBulk(m.v)}
            className={`rounded-full border px-4 py-1.5 font-bold ${bulk === m.v ? "border-accent bg-accent text-accent-text" : "border-line-strong bg-white hover:bg-slate-50"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {bulk && (
        <p className="mb-4 rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
          {t("caseNew.bulkNote")}
        </p>
      )}
      {restored && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
          <span>{t("caseNew.restored")}</span>
          <Button type="button" variant="secondary" onClick={clearInput}>
            {t("caseNew.restoredClear")}
          </Button>
        </div>
      )}
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <ChoiceGroup
          legend={t("caseNew.procedureLegend")}
          required
          options={PROCEDURE_OPTIONS}
          value={procedureType}
          onChange={(v) => setProcedureType(v as ProcedureType)}
          error={errors.procedureType}
          hint={description}
        />
        {!bulk && (
          <Field label={t("caseNew.caseNameLabel")} required error={errors.caseName} hint={t("caseNew.caseNameHint")}>
            <input className={inputClass} value={caseName} onChange={(e) => setCaseName(e.target.value)} />
          </Field>
        )}
        {/* 手続種別を選ぶまで在留資格の欄は出さない。非表示の間も入力値は保持し、再表示で戻る（保存は表示中の欄のみ） */}
        {procedureType === "" ? (
          <p role="note" className="rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
            {t("caseNew.procedureNote")}
          </p>
        ) : (
          <div className="anim-fade-in space-y-5">
            <StatusSelect legend={t("caseNew.currentStatusLegend")} hint={hints.current} value={currentStatus} onChange={setCurrentStatus} withGrade />
            {needsTarget && (
              <div className="anim-fade-in">
                <StatusSelect
                  legend={targetLegend}
                  required
                  error={errors.targetStatus}
                  hint={hints.target}
                  value={targetStatus}
                  onChange={setTargetStatus}
                  withGrade
                  allowGrade2={procedureType === "change"}
                />
              </div>
            )}
          </div>
        )}
        <AcceptedDateField value={acceptedDate} onChange={setAcceptedDate} />
        {showNoRuleGuide && (
          <p role="note" className="rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
            {t("caseNew.noRuleGuide", { message: noRuleMessage(t) })}
          </p>
        )}
        <Field label={t("caseNew.memoLabel")} hint={t("caseNew.memoHint")}>
          <textarea className={inputClass} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} {...zenkakuHandlers(CASE_MEMO_ZENKAKU, setMemo)} />
        </Field>
        {bulk && (
          <>
            <div>
              <h2 className="mb-1 text-sm font-semibold">{t("caseNew.employmentHeading")}</h2>
              <p className="mb-3 text-xs text-slate-500">{t("caseNew.employmentNote")}</p>
              <EmploymentFields form={employment} set={(k, v) => setEmployment((f) => ({ ...f, [k]: v }))} />
              {errors.employment && <p className="mt-2 text-sm text-red-600">{errors.employment}</p>}
            </div>
            <Field label={t("caseNew.groupNameLabel")} required error={errors.groupName} hint={t("caseNew.groupNameHint")}>
              <input className={inputClass} value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </Field>
            <Field label={t("caseNew.namesLabel")} error={errors.names} hint={t("caseNew.namesHint")}>
              <div className="space-y-2">
                {names.map((n, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className={inputClass}
                      aria-label={t("caseNew.namesRowAria", { n: i + 1 })}
                      placeholder={t("caseNew.namesPlaceholder")}
                      value={n}
                      onChange={(e) => setNames((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    <Button type="button" variant="secondary" disabled={names.length <= 1} onClick={() => setNames((l) => l.filter((_, j) => j !== i))}>
                      {t("caseNew.namesDelete")}
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => setNames((l) => [...l, ""])}>
                  {t("caseNew.namesAdd")}
                </Button>
              </div>
            </Field>
          </>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => (dirty ? setLeaveOpen(true) : router.push("/cases"))}>
            {t("caseNew.cancel")}
          </Button>
          <Button type="submit">{bulk ? t("caseNew.submitBulk", { count: names.length }) : t("caseNew.submit")}</Button>
        </div>
      </form>
      {leaveOpen && <ConfirmLeaveDialog onCancel={() => setLeaveOpen(false)} onConfirm={leave} />}
    </div>
  );
}
