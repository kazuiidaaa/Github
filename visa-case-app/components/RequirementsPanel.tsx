"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import { evaluate, type EvaluatedItem, type Result } from "@/lib/requirements/evaluate";
import { logAudit, updateCase } from "@/lib/store";
import type { CaseRecord, RequirementState } from "@/lib/types";

const RESULT_LABEL: Record<Result, string> = { required: "必要", not_required: "不要", check: "要確認" };
const RESULT_TONE: Record<Result, "red" | "gray" | "yellow"> = { required: "red", not_required: "gray", check: "yellow" };
const PARTY_LABEL = { applicant: "申請人", organization: "所属機関" } as const;

export function RequirementsPanel({ record, onGoEmployment }: { record: CaseRecord; onGoEmployment: () => void }) {
  const ev = evaluate(record);
  const [copied, setCopied] = useState(false);

  function patch(id: string, change: Partial<RequirementState>, action: string) {
    updateCase(record.id, (c) => {
      const prev = c.requirementStates[id] ?? { submitted: false };
      return { ...c, requirementStates: { ...c.requirementStates, [id]: { ...prev, ...change } } };
    });
    logAudit(record.id, action, { requirementId: id, ...change });
  }

  async function copyMissing() {
    const lines = ev.missing.map((i) => `・${i.rule.name}`);
    try {
      await navigator.clipboard.writeText(`不足している書類\n${lines.join("\n")}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!ev.ruleSet) {
    return <p className="rounded-md bg-slate-100 p-4 text-sm text-slate-700">{ev.notApplicableReason}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <p className="font-medium">{ev.ruleSet.title}（規則の確認日：{ev.ruleSet.checkedAt}）</p>
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
      </div>

      {ev.needsCategory && (
        <p className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
          所属機関のカテゴリーが未入力のため、全カテゴリー共通の書類のみ表示しています。
          <button onClick={onGoEmployment} className="ml-2 underline">
            「雇用・会社」タブで入力する
          </button>
        </p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p>
          必要書類：{ev.requiredCount}件／提出済み：{ev.submittedCount}件／
          <span className={ev.missing.length > 0 ? "font-semibold text-red-700" : "text-green-700"}>不足：{ev.missing.length}件</span>
          {ev.toCheck.length > 0 && <span className="ml-2 text-yellow-800">（要確認：{ev.toCheck.length}件）</span>}
        </p>
        {ev.missing.length > 0 && (
          <div className="mt-3">
            <ul className="list-inside list-disc text-slate-700">
              {ev.missing.map((i) => (
                <li key={i.rule.id}>{i.rule.name}</li>
              ))}
            </ul>
            <button onClick={() => void copyMissing()} className="mt-2 rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">
              不足書類をコピー
            </button>
            {copied && <span className="ml-2 text-green-700">コピーしました。</span>}
          </div>
        )}
      </section>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">書類</th>
              <th className="px-4 py-3">提出者</th>
              <th className="px-4 py-3">判定</th>
              <th className="px-4 py-3">提出済み</th>
              <th className="px-4 py-3">行政書士の判断</th>
            </tr>
          </thead>
          <tbody>
            {ev.items.map((i) => (
              <Row key={i.rule.id} item={i} onPatch={patch} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  item,
  onPatch,
}: {
  item: EvaluatedItem;
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
        <input
          type="checkbox"
          aria-label={`${rule.name} 提出済み`}
          checked={state.submitted}
          onChange={(e) => onPatch(rule.id, { submitted: e.target.checked }, "requirement_submitted")}
        />
      </td>
      <td className="px-4 py-3">
        <select
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
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
