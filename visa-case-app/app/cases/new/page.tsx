"use client";

import { EMPTY_FORM_DETAILS } from "@/lib/formDetails";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EmploymentFields, hasEmploymentDateError } from "@/components/EmploymentForm";
import { AcceptedDateField } from "@/components/AcceptedDateField";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { PROCEDURE_OPTIONS, STATUS_HINTS, StatusSelect } from "@/components/StatusSelect";
import { Button, Field, inputClass } from "@/components/ui";
import { hasAcceptedDateError } from "@/lib/acceptedDate";
import { buildBulkCaseNames } from "@/lib/bulkCaseNames";
import { ConfirmLeaveDialog } from "@/components/ConfirmLeaveDialog";
import { clearNewCaseDraft, INITIAL_BULK_NAMES, isNewCaseDirty, loadNewCaseDraft, saveNewCaseDraft } from "@/lib/newCaseDraft";
import { notApplicableMessage, shouldShowNoRuleGuide } from "@/lib/requirements/evaluate";
import { useToast } from "@/components/Toast";
import { logAudit, newId, saveCase, useCan } from "@/lib/store";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, PROCEDURE_TYPES, procedureNeedsTarget, targetStatusLabel, type EmploymentInfo, type ProcedureType } from "@/lib/types";

export default function NewCasePage() {
  const router = useRouter();
  const toast = useToast();
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

  const description = PROCEDURE_TYPES.find((p) => p.value === procedureType)?.description;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const bulkNames = bulk ? buildBulkCaseNames(groupName, names) : [];
    if (bulk) {
      if (!groupName.trim()) next.groupName = "グループ名を入力してください。";
      else if (groupName.length > 100) next.groupName = "グループ名は100文字以内で入力してください。";
      if (names.length === 0) next.names = "案件を1件以上登録してください。";
      else if (bulkNames.some((n) => n.length > 100)) next.names = "案件名は100文字以内で入力してください（グループ名に（行番号）が加わった長さを含みます）。";
      if (hasEmploymentDateError(employment)) next.employment = "雇用開始日をカレンダーから選び直してください。";
    } else {
      if (!caseName.trim()) next.caseName = "案件名を入力してください。";
      if (caseName.length > 100) next.caseName = "案件名は100文字以内で入力してください。";
    }
    if (!procedureType) next.procedureType = "手続種別を選択してください。";
    if (needsTarget && !targetStatus.trim()) next.targetStatus = `${targetStatusLabel(procedureType)}を選択してください。`;
    if (hasAcceptedDateError(acceptedDate)) next.acceptedDate = "受任日をカレンダーから選び直してください。";
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
      toast.success(`${bulkNames.length}件の案件を作成しました`);
      router.push("/cases");
      return;
    }
    const id = create(caseName.trim());
    clearNewCaseDraft();
    toast.success("案件を作成しました");
    // 作成直後は、次に行う書類の登録へ誘導するため「書類」タブを開く
    router.push(`/cases/${id}?tab=documents`);
  }

  if (!canEdit) {
    return (
      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <p className="mb-3">案件を作成する権限がありません。事務所の所有者または管理者にご確認ください。</p>
        <Link href="/cases" className="text-blue-700 hover:underline">
          ← 案件一覧
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
        ← 案件一覧
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">新規案件作成</h1>
      <p className="mb-6 text-sm text-slate-600">
        案件の入口情報のみ登録します。氏名・生年月日・在留期限などの正式情報は、案件作成後に「申請人情報」タブで、原本を確認しながら入力します。
      </p>
      <div className="mb-4 flex gap-1 text-sm" role="group" aria-label="登録方法">
        {[
          { v: false, label: "1件ずつ登録" },
          { v: true, label: "複数人をまとめて登録" },
        ].map((m) => (
          <button
            key={m.label}
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
          同じ所属機関の複数の申請人について、手続種別と雇用・会社情報を1回入力し、人数分の案件をまとめて作成します。入管への申請は、申請人お一人につき1件の申請書が必要です。作成後の各案件は独立しており、以後は個別に編集します（案件間で情報は同期されません）。
        </p>
      )}
      {restored && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
          <span>前回の入力を復元しました。（案件メモは復元されません）</span>
          <Button type="button" variant="secondary" onClick={clearInput}>
            入力をクリア
          </Button>
        </div>
      )}
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <ChoiceGroup
          legend="手続種別"
          required
          options={PROCEDURE_OPTIONS}
          value={procedureType}
          onChange={(v) => setProcedureType(v as ProcedureType)}
          error={errors.procedureType}
          hint={description}
        />
        {!bulk && (
          <Field label="案件名" required error={errors.caseName} hint="例：李明さん 在留期間更新（内部管理用。正式な氏名としては扱いません）">
            <input className={inputClass} value={caseName} onChange={(e) => setCaseName(e.target.value)} />
          </Field>
        )}
        {/* 手続種別を選ぶまで在留資格の欄は出さない。非表示の間も入力値は保持し、再表示で戻る（保存は表示中の欄のみ） */}
        {procedureType === "" ? (
          <p role="note" className="rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
            手続種別を選ぶと、必要な項目が表示されます。
          </p>
        ) : (
          <div className="anim-fade-in space-y-5">
            <StatusSelect legend="現在の在留資格" hint={STATUS_HINTS.current} value={currentStatus} onChange={setCurrentStatus} />
            {needsTarget && (
              <div className="anim-fade-in">
                <StatusSelect
                  legend={targetStatusLabel(procedureType)}
                  required
                  error={errors.targetStatus}
                  hint={STATUS_HINTS.target}
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
            {`${notApplicableMessage()}案件は、このまま作成できます。`}
          </p>
        )}
        <Field label="案件メモ" hint="内部メモです。AI処理や判定には使用しません。">
          <textarea className={inputClass} rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
        {bulk && (
          <>
            <div>
              <h2 className="mb-1 text-sm font-semibold">雇用・会社情報（全員に共通）</h2>
              <p className="mb-3 text-xs text-slate-500">入力した内容が、作成する各案件にそれぞれ設定されます。</p>
              <EmploymentFields form={employment} set={(k, v) => setEmployment((f) => ({ ...f, [k]: v }))} />
              {errors.employment && <p className="mt-2 text-sm text-red-600">{errors.employment}</p>}
            </div>
            <Field label="グループ名" required error={errors.groupName} hint="例：〇〇株式会社 技術・人文知識・国際業務 変更 2名（所属機関・手続種別・人数など。空欄の行の案件名は「グループ名（行番号）」になります）">
              <input className={inputClass} value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </Field>
            <Field label="申請人（案件名）" error={errors.names} hint="任意です。空欄の行は「グループ名（行番号）」を案件名にします。入力した行は、その入力を案件名にします。案件名は内部管理用で、正式な氏名としては扱いません。">
              <div className="space-y-2">
                {names.map((n, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className={inputClass}
                      aria-label={`案件名 ${i + 1}`}
                      placeholder="空欄の場合は「グループ名（行番号）」"
                      value={n}
                      onChange={(e) => setNames((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    <Button type="button" variant="secondary" disabled={names.length <= 1} onClick={() => setNames((l) => l.filter((_, j) => j !== i))}>
                      削除
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => setNames((l) => [...l, ""])}>
                  行を追加
                </Button>
              </div>
            </Field>
          </>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => (dirty ? setLeaveOpen(true) : router.push("/cases"))}>
            キャンセル
          </Button>
          <Button type="submit">{bulk ? `${names.length}件を作成` : "作成"}</Button>
        </div>
      </form>
      {leaveOpen && <ConfirmLeaveDialog onCancel={() => setLeaveOpen(false)} onConfirm={leave} />}
    </div>
  );
}
