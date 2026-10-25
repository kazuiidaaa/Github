"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EmploymentFields, hasEmploymentDateError } from "@/components/EmploymentForm";
import { AcceptedDateField } from "@/components/AcceptedDateField";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { PROCEDURE_OPTIONS, StatusSelect, useStatusHints } from "@/components/StatusSelect";
import { noRuleGuideText, procedureDescriptionText, targetStatusLegend } from "@/lib/i18n/caseNew";
import { StatusTransition } from "@/components/StatusTransition";
import { useT } from "@/lib/i18n/LanguageProvider";
import { Button, Field, inputClass, ToneIcon } from "@/components/ui";
import { ConfirmLeaveDialog } from "@/components/ConfirmLeaveDialog";
import { clearNewCaseDraft, INITIAL_BULK_NAMES, isNewCaseDirty, loadNewCaseDraft, saveNewCaseDraft } from "@/lib/newCaseDraft";
import { ruleSetFor, shouldShowNoRuleGuide, statusForRules } from "@/lib/requirements/evaluate";
import { useToast } from "@/components/Toast";
import { logAudit, newId, saveCase, useCan } from "@/lib/store";
import { buildNewCaseRecord, NEW_CASE_ERROR_ORDER, newCaseNames, validateNewCase, type NewCaseErrorKey } from "@/lib/newCaseSubmit";
import { EMPTY_EMPLOYMENT, procedureNeedsTarget, type EmploymentInfo, type ProcedureType } from "@/lib/types";
import { CASE_MEMO_ZENKAKU, zenkakuHandlers } from "@/lib/zenkaku";
import { firstErrorKey, focusField } from "@/lib/formFocus";

/** 検証する欄（画面の上からの並び順）。送信時は、この順で最初の誤りの欄へフォーカスを移す */
const ERROR_ORDER = NEW_CASE_ERROR_ORDER;
type ErrorKey = NewCaseErrorKey;
const fieldId = (key: ErrorKey) => `new-case-${key}`;

/** 文字のリンクも、押しやすさのため高さ 44px（人の決定。Issue #392） */
const textLinkClass = "inline-flex min-h-[44px] items-center text-sm text-blue-700 hover:underline active:opacity-70";

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
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});
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
  // 要約には、いま画面に出ている欄の誤りだけを並べる（登録方法を切り替えて隠れた欄の誤りは出さない）
  const shownKeys = ERROR_ORDER.filter((k) =>
    k === "caseName" ? !bulk : k === "employment" || k === "groupName" || k === "names" ? bulk : k === "targetStatus" ? needsTarget : true,
  );
  const errorList = shownKeys.flatMap((k) => (errors[k] ? [[k, errors[k]] as const] : []));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { bulk, caseName, procedureType, currentStatus, targetStatus, memo, acceptedDate, employment, groupName, names };
    const bulkNames = bulk ? newCaseNames(input) : [];
    const next = validateNewCase(input, t, targetLegend, bulk && hasEmploymentDateError(employment));
    setErrors(next);
    const first = firstErrorKey(next, ERROR_ORDER);
    if (first) {
      // 誤りの表示（aria-invalid など）が画面に反映された後に、最初の誤りの欄へ移す
      requestAnimationFrame(() => focusField(fieldId(first)));
      return;
    }
    if (!procedureType) return;

    const create = (name: string) => {
      const now = new Date().toISOString();
      const id = newId();
      // 案件ごとに独立したレコードとして組み立てる（lib/newCaseSubmit.ts。作成後の同期は行わない）
      saveCase(buildNewCaseRecord({ ...input, procedureType }, name, id, now));
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
      <div className="max-w-xl mac-card rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <p className="mb-1">{t("caseNew.noPermission")}</p>
        <Link href="/cases" className={textLinkClass}>
          {t("caseNew.backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/cases"
        className={textLinkClass}
        onClick={(e) => {
          if (dirty) {
            e.preventDefault();
            setLeaveOpen(true);
          }
        }}
      >
        {t("caseNew.backToList")}
      </Link>
      <h1 className="mt-1 text-2xl font-semibold md:text-mac-title1">{t("caseNew.title")}</h1>
      <p className="mb-6 text-sm text-slate-600">{t("caseNew.intro")}</p>
      <div className="mb-4 flex flex-wrap gap-2 text-sm" role="group" aria-label={t("caseNew.modeAria")}>
        {[
          { v: false, label: t("caseNew.modeSingle") },
          { v: true, label: t("caseNew.modeBulk") },
        ].map((m) => (
          <button
            key={String(m.v)}
            type="button"
            aria-pressed={bulk === m.v}
            onClick={() => setBulk(m.v)}
            className={`inline-flex min-h-[44px] items-center mac-button rounded-full border px-4 py-2 font-bold ${bulk === m.v ? "border-accent bg-accent text-accent-text" : "border-line-strong bg-white hover:bg-slate-50 active:bg-slate-100"}`}
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
      <form onSubmit={submit} className="space-y-5 mac-card rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        {/* 誤りの要約。送信のたびに読み上げ、フォーカスは最初の誤りの欄へ移す（設計書 4章「フォームの入力しやすさ」） */}
        {errorList.length > 0 && (
          <div role="alert" className="rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger-text">
            <p className="flex items-center gap-1.5 font-bold">
              <ToneIcon tone="red" />
              {t("caseNew.errorSummary", { count: errorList.length })}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {errorList.map(([k, msg]) => (
                <li key={k}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        <div id={fieldId("procedureType")}>
          <ChoiceGroup
            legend={t("caseNew.procedureLegend")}
            required
            options={PROCEDURE_OPTIONS}
            value={procedureType}
            onChange={(v) => setProcedureType(v as ProcedureType)}
            error={errors.procedureType}
            hint={description}
          />
        </div>
        {!bulk && (
          <Field label={t("caseNew.caseNameLabel")} required error={errors.caseName} hint={t("caseNew.caseNameHint")}>
            <input
              id={fieldId("caseName")}
              className={inputClass}
              value={caseName}
              aria-invalid={errors.caseName ? true : undefined}
              onChange={(e) => setCaseName(e.target.value)}
            />
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
                  id={fieldId("targetStatus")}
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
            {/* 入力中の手続と在留資格の確認（共通部品。Issue #433） */}
            <p className="min-w-0 rounded-xl bg-slate-100 p-3 text-sm">
              <StatusTransition procedureType={procedureType} current={currentStatus} target={needsTarget ? targetStatus : undefined} />
            </p>
          </div>
        )}
        <div id={fieldId("acceptedDate")}>
          <AcceptedDateField value={acceptedDate} onChange={setAcceptedDate} />
        </div>
        {showNoRuleGuide && (
          <p role="note" className="rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
            {noRuleGuideText(t, statusForRules(procedureType, { currentStatus, targetStatus }))}
          </p>
        )}
        <Field label={t("caseNew.memoLabel")} hint={t("caseNew.memoHint")}>
          <textarea className={inputClass} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} {...zenkakuHandlers(CASE_MEMO_ZENKAKU, setMemo)} />
        </Field>
        {bulk && (
          <>
            <div id={fieldId("employment")}>
              <h2 className="mb-1 text-sm font-semibold">{t("caseNew.employmentHeading")}</h2>
              <p className="mb-3 text-xs text-muted">{t("caseNew.employmentNote")}</p>
              <EmploymentFields
                form={employment}
                set={(k, v) => setEmployment((f) => ({ ...f, [k]: v }))}
                ruleSet={procedureType ? ruleSetFor(procedureType, statusForRules(procedureType, { currentStatus, targetStatus })) : null}
              />
              {/* 他の欄の誤りの表示（Field）と同じ大きさ・色にそろえる */}
              {errors.employment && <p className="mt-2 text-xs font-bold text-red-700">{errors.employment}</p>}
            </div>
            <Field label={t("caseNew.groupNameLabel")} required error={errors.groupName} hint={t("caseNew.groupNameHint")}>
              <input
                id={fieldId("groupName")}
                className={inputClass}
                value={groupName}
                aria-invalid={errors.groupName ? true : undefined}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </Field>
            <Field label={t("caseNew.namesLabel")} error={errors.names} hint={t("caseNew.namesHint")}>
              <div id={fieldId("names")} className="space-y-2">
                {names.map((n, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className={`${inputClass} min-w-0`}
                      aria-label={t("caseNew.namesRowAria", { n: i + 1 })}
                      placeholder={t("caseNew.namesPlaceholder")}
                      value={n}
                      onChange={(e) => setNames((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    <Button type="button" variant="secondary" className="shrink-0" disabled={names.length <= 1} onClick={() => setNames((l) => l.filter((_, j) => j !== i))}>
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
        <div className="flex flex-wrap justify-end gap-3">
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
