"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { CustomRequirementForm, type CustomRequirementInput } from "@/components/CustomRequirementForm";
import { todayString } from "@/lib/format";
import { evaluate, type EvaluatedItem, type Result } from "@/lib/requirements/evaluate";
import { isOverdue, progressOf } from "@/lib/requirements/progress";
import { logAudit, newId, updateCase } from "@/lib/store";
import {
  REQUIREMENT_STATUSES,
  REQUIREMENT_STATUS_LABELS,
  type CaseRecord,
  type CustomRequirement,
  type RequirementState,
  type RequirementStatus,
} from "@/lib/types";

const RESULT_LABEL: Record<Result, string> = { required: "必要", not_required: "不要", check: "要確認" };
const RESULT_TONE: Record<Result, "red" | "gray" | "yellow"> = { required: "red", not_required: "gray", check: "yellow" };
const PARTY_LABEL = { applicant: "申請人", organization: "所属機関" } as const;

const selectClass = "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs";

function StatusSelect({ label, value, onChange }: { label: string; value: RequirementStatus; onChange: (v: RequirementStatus) => void }) {
  return (
    <select aria-label={`${label} 状態`} className={selectClass} value={value} onChange={(e) => onChange(e.target.value as RequirementStatus)}>
      {REQUIREMENT_STATUSES.map((st) => (
        <option key={st} value={st}>
          {REQUIREMENT_STATUS_LABELS[st]}
        </option>
      ))}
    </select>
  );
}

function DueInput({ label, value, overdue, onChange }: { label: string; value?: string; overdue: boolean; onChange: (v: string) => void }) {
  return (
    <div>
      <input
        type="date"
        aria-label={`${label} 期限`}
        className={`${selectClass} ${overdue ? "border-red-400 bg-red-50" : ""}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {overdue && <p className="mt-1 text-xs font-medium text-red-700">期限超過</p>}
    </div>
  );
}

export function RequirementsPanel({ record, onGoEmployment }: { record: CaseRecord; onGoEmployment: () => void }) {
  const ev = evaluate(record);
  const today = todayString();
  const progress = progressOf(ev, record.customRequirements, today);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function patchCustom(id: string, change: Partial<CustomRequirement>, action: string) {
    updateCase(record.id, (c) => ({
      ...c,
      customRequirements: c.customRequirements.map((r) => (r.id === id ? { ...r, ...change } : r)),
    }));
    logAudit(record.id, action, { requirementId: id, ...change });
  }

  function addCustom(v: CustomRequirementInput) {
    const item: CustomRequirement = { id: newId(), status: "not_received", ...v };
    updateCase(record.id, (c) => ({ ...c, customRequirements: [...c.customRequirements, item] }));
    logAudit(record.id, "custom_requirement_added", { requirementId: item.id, name: item.name });
    setAdding(false);
  }

  function editCustom(id: string, v: CustomRequirementInput) {
    patchCustom(id, v, "custom_requirement_updated");
    setEditingId(null);
  }

  function removeCustom(r: CustomRequirement) {
    if (!window.confirm(`「${r.name}」を削除します。よろしいですか。`)) return;
    updateCase(record.id, (c) => ({ ...c, customRequirements: c.customRequirements.filter((x) => x.id !== r.id) }));
    logAudit(record.id, "custom_requirement_deleted", { requirementId: r.id, name: r.name });
  }

  function patch(id: string, change: Partial<RequirementState>, action: string) {
    updateCase(record.id, (c) => {
      const prev = c.requirementStates[id] ?? { status: "not_received" as const };
      return { ...c, requirementStates: { ...c.requirementStates, [id]: { ...prev, ...change } } };
    });
    logAudit(record.id, action, { requirementId: id, ...change });
  }

  async function copyMissing() {
    const lines = progress.missing.map((i) => `・${i.name}${i.dueDate ? `（期限：${i.dueDate}）` : ""}`);
    try {
      await navigator.clipboard.writeText(`不足している書類\n${lines.join("\n")}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <p className="font-medium">
          表示される書類は管理用の候補です。申請時の必要書類は、最新の公式案内および個別案件を確認してください。
        </p>
        {ev.ruleSet && (
          <>
            <p className="mt-2">
              {ev.ruleSet.title}（規則の確認日：{ev.ruleSet.checkedAt}）
            </p>
            <p className="mt-1">
              判定は参考情報です。法令・運用の改正により変わる場合があるため、最終的な要否は出典と最新の案内で確認してください。
            </p>
            <ul className="mt-1 list-inside list-disc">
              {ev.ruleSet.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {!ev.ruleSet && <p className="rounded-md bg-slate-100 p-4 text-sm text-slate-700">{ev.notApplicableReason}</p>}

      {ev.ruleSet && ev.needsCategory && (
        <p className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
          所属機関のカテゴリーが未入力のため、全カテゴリー共通の書類のみ表示しています。
          <button onClick={onGoEmployment} className="ml-2 underline">
            「雇用・会社」タブで入力する
          </button>
        </p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p>
          必要書類：{progress.requiredCount}件／受領済み：{progress.receivedCount}件／
          <span className={progress.missing.length > 0 ? "font-semibold text-red-700" : "text-green-700"}>不足：{progress.missing.length}件</span>
          {progress.overdue.length > 0 && <span className="ml-2 font-semibold text-red-700">（期限超過：{progress.overdue.length}件）</span>}
          {ev.toCheck.length > 0 && <span className="ml-2 text-yellow-800">（要確認：{ev.toCheck.length}件）</span>}
        </p>
        {progress.missing.length > 0 && (
          <div className="mt-3">
            <ul className="list-inside list-disc text-slate-700">
              {progress.missing.map((i) => (
                <li key={i.key}>
                  {i.name}
                  {i.dueDate && <span className="ml-1 text-xs text-slate-500">（期限：{i.dueDate}）</span>}
                </li>
              ))}
            </ul>
            <button onClick={() => void copyMissing()} className="mt-2 rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">
              不足書類をコピー
            </button>
            {copied && <span className="ml-2 text-green-700">コピーしました。</span>}
          </div>
        )}
      </section>

      {ev.ruleSet && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">書類</th>
                <th className="px-4 py-3">提出者</th>
                <th className="px-4 py-3">判定</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">期限</th>
                <th className="px-4 py-3">行政書士の判断</th>
              </tr>
            </thead>
            <tbody>
              {ev.items.map((i) => (
                <Row key={i.rule.id} item={i} today={today} onPatch={patch} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">追加した書類</h3>
          {!adding && (
            <Button variant="secondary" onClick={() => setAdding(true)}>
              書類を追加
            </Button>
          )}
        </div>
        {adding && <CustomRequirementForm onSubmit={addCustom} onCancel={() => setAdding(false)} />}
        {record.customRequirements.length === 0 && !adding && (
          <p className="text-sm text-slate-500">規則にない書類は、「書類を追加」から登録できます。</p>
        )}
        {record.customRequirements.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">書類</th>
                  <th className="px-4 py-3">提出者</th>
                  <th className="px-4 py-3">必須・任意</th>
                  <th className="px-4 py-3">状態</th>
                  <th className="px-4 py-3">期限</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {record.customRequirements.map((r) =>
                  editingId === r.id ? (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td colSpan={6} className="px-4 py-3">
                        <CustomRequirementForm initial={r} onSubmit={(v) => editCustom(r.id, v)} onCancel={() => setEditingId(null)} />
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <p>{r.name}</p>
                        {r.note && <p className="mt-1 text-xs text-slate-500">{r.note}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{PARTY_LABEL[r.party]}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.isRequired ? "必須" : "任意"}</td>
                      <td className="px-4 py-3">
                        <StatusSelect label={r.name} value={r.status} onChange={(v) => patchCustom(r.id, { status: v }, "requirement_status_changed")} />
                      </td>
                      <td className="px-4 py-3">
                        <DueInput
                          label={r.name}
                          value={r.dueDate}
                          overdue={isOverdue(r.status, r.dueDate, today)}
                          onChange={(v) => patchCustom(r.id, { dueDate: v || undefined }, "requirement_due_changed")}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => setEditingId(r.id)} className="mr-3 text-blue-700 underline">
                          編集
                        </button>
                        <button onClick={() => removeCustom(r)} className="text-red-700 underline">
                          削除
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({
  item,
  today,
  onPatch,
}: {
  item: EvaluatedItem;
  today: string;
  onPatch: (id: string, change: Partial<RequirementState>, action: string) => void;
}) {
  const { rule, state } = item;
  const [note, setNote] = useState(state.note ?? "");
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-4 py-3">
        <p className={item.effective === "not_required" ? "text-slate-400" : ""}>{rule.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {item.reason}
          {rule.note ? `／${rule.note}` : ""}
        </p>
        {rule.verify && <Badge tone="yellow">内容要確認</Badge>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{PARTY_LABEL[rule.party]}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge tone={RESULT_TONE[item.result]}>{RESULT_LABEL[item.result]}</Badge>
        {state.override && (
          <p className="mt-1 text-xs text-slate-500">→ {RESULT_LABEL[item.effective]}（上書き）</p>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusSelect label={rule.name} value={state.status} onChange={(v) => onPatch(rule.id, { status: v }, "requirement_status_changed")} />
      </td>
      <td className="px-4 py-3">
        <DueInput
          label={rule.name}
          value={state.dueDate}
          overdue={item.effective === "required" && isOverdue(state.status, state.dueDate, today)}
          onChange={(v) => onPatch(rule.id, { dueDate: v || undefined }, "requirement_due_changed")}
        />
      </td>
      <td className="px-4 py-3">
        <select
          className={selectClass}
          value={state.override ?? ""}
          onChange={(e) =>
            onPatch(rule.id, { override: (e.target.value || undefined) as RequirementState["override"] }, "requirement_overridden")
          }
        >
          <option value="">規則どおり</option>
          <option value="required">必要とする</option>
          <option value="not_required">不要とする</option>
        </select>
        {state.override && (
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
            placeholder="理由を記録"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (state.note ?? "") && onPatch(rule.id, { note }, "requirement_note")}
          />
        )}
      </td>
    </tr>
  );
}
