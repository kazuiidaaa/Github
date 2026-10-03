"use client";

import { EMPTY_FORM_DETAILS } from "@/lib/formDetails";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmploymentFields, hasEmploymentDateError } from "@/components/EmploymentForm";
import { STATUS_HINTS, StatusSelect } from "@/components/StatusSelect";
import { Button, Field, inputClass } from "@/components/ui";
import { buildBulkCaseNames } from "@/lib/bulkCaseNames";
import { hasRuleSetFor, notApplicableMessage } from "@/lib/requirements/evaluate";
import { logAudit, newId, saveCase, useCan } from "@/lib/store";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, PROCEDURE_TYPES, type EmploymentInfo, type ProcedureType } from "@/lib/types";

export default function NewCasePage() {
  const router = useRouter();
  const canEdit = useCan("edit");
  const [caseName, setCaseName] = useState("");
  const [procedureType, setProcedureType] = useState<ProcedureType | "">("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [targetStatus, setTargetStatus] = useState("");
  const [memo, setMemo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // まとめて登録：雇用・会社情報を1回入力し、申請人（案件名）を複数人分入力する
  const [bulk, setBulk] = useState(false);
  const [employment, setEmployment] = useState<EmploymentInfo>({ ...EMPTY_EMPLOYMENT });
  const [groupName, setGroupName] = useState("");
  const [names, setNames] = useState<string[]>(["", "", ""]);

  const needsTarget = procedureType === "change" || procedureType === "coe";
  // 必要書類の判定は、申請後に持つ在留資格を基準とするため、変更・認定は変更後（希望）の在留資格で判定する
  const ruleStatus = needsTarget ? targetStatus : currentStatus;
  const showNoRuleGuide = procedureType !== "" && ruleStatus.trim() !== "" && !hasRuleSetFor(procedureType, ruleStatus);
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
    if (needsTarget && !targetStatus.trim()) next.targetStatus = "変更後の在留資格を選択してください。";
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

    if (bulk) {
      bulkNames.forEach(create);
      router.push("/cases");
      return;
    }
    const id = create(caseName.trim());
    // 作成直後は、次に行う書類の登録へ誘導するため「書類」タブを開く
    router.push(`/cases/${id}?tab=documents`);
  }

  if (!canEdit) {
    return (
      <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-6 text-sm">
        <p className="mb-3">案件を作成する権限がありません。事務所の所有者または管理者にご確認ください。</p>
        <Link href="/cases" className="text-blue-700 hover:underline">
          ← 案件一覧
        </Link>
      </div>
    );
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
            className={`rounded-md border px-3 py-1.5 ${bulk === m.v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-50"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {bulk && (
        <p className="mb-4 rounded-md bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
          同じ所属機関の複数の申請人について、手続種別と雇用・会社情報を1回入力し、人数分の案件をまとめて作成します。入管への申請は、申請人お一人につき1件の申請書が必要です。作成後の各案件は独立しており、以後は個別に編集します（案件間で情報は同期されません）。
        </p>
      )}
      <form onSubmit={submit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6">
        {!bulk && (
          <Field label="案件名" required error={errors.caseName} hint="例：李明さん 在留期間更新（内部管理用。正式な氏名としては扱いません）">
            <input className={inputClass} value={caseName} onChange={(e) => setCaseName(e.target.value)} />
          </Field>
        )}
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
        <Field label="現在の在留資格" hint={STATUS_HINTS.current}>
          <StatusSelect value={currentStatus} onChange={setCurrentStatus} />
        </Field>
        {needsTarget && (
          <Field label={procedureType === "change" ? "変更後の在留資格" : "希望する在留資格"} required error={errors.targetStatus} hint={STATUS_HINTS.target}>
            <StatusSelect value={targetStatus} onChange={setTargetStatus} />
          </Field>
        )}
        {showNoRuleGuide && (
          <p role="note" className="rounded-md bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
            {notApplicableMessage()}
            案件は、このまま作成できます。
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
          <Button type="button" variant="secondary" onClick={() => router.push("/cases")}>
            キャンセル
          </Button>
          <Button type="submit">{bulk ? `${names.length}件を作成` : "作成"}</Button>
        </div>
      </form>
    </div>
  );
}
