"use client";

import { useEffect, useState } from "react";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { Badge, Button, inputClass } from "@/components/ui";
import { missingChecks, sortChecks, unresolvedCount } from "@/lib/checks/definitions";
import { referenceFor, validPlannedDate } from "@/lib/checks/reference";
import { formatDateTime } from "@/lib/format";
import { logAudit, newId, updateCase } from "@/lib/store";
import { useAutoSave } from "@/lib/useAutoSave";
import {
  CHECK_STATUS_LABELS,
  CHECK_TYPE_LABELS,
  type CaseRecord,
  type CheckRecord,
  type CheckStatus,
  type CheckType,
} from "@/lib/types";

const STATUS_TONE: Record<CheckStatus, "gray" | "green" | "yellow" | "red"> = {
  pending: "gray",
  passed: "green",
  warning: "yellow",
  failed: "red",
  not_applicable: "gray",
};
const TYPES: CheckType[] = ["applicant", "document", "deadline", "manual"];

export function ChecksPanel({ record }: { record: CaseRecord }) {
  const [memo, setMemo] = useState(record.checkMemo);
  const [newName, setNewName] = useState("");
  const [planned, setPlanned] = useState(record.plannedApplicationDate);
  const ready = record.workflowStatus === "application_ready";
  const unresolved = unresolvedCount(record.checks);
  const flushMemo = useAutoSave(memo, record.checkMemo, (v) =>
    change((c) => ({ ...c, checkMemo: v }), "check_updated", { memo: true }),
  );

  // 初めて開いたとき、不足している項目を未確認で補い、「要確認」にする
  useEffect(() => {
    const added = missingChecks(record.checks);
    if (!added && ready) return;
    if (!added && record.workflowStatus === "review_required") return;
    updateCase(record.id, (c) => ({
      ...c,
      checks: [...c.checks, ...(missingChecks(c.checks) ?? [])],
      workflowStatus: c.workflowStatus === "application_ready" ? c.workflowStatus : "review_required",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id]);

  /** チェックを変更する。準備完了後の変更は「要確認」に戻す */
  function change(fn: (c: CaseRecord) => CaseRecord, action: string, detail?: Record<string, unknown>) {
    updateCase(record.id, (c) => ({
      ...fn(c),
      workflowStatus: c.workflowStatus === "application_ready" ? "review_required" : c.workflowStatus,
    }));
    logAudit(record.id, action, detail);
    if (ready) logAudit(record.id, "application_ready_reset");
  }

  function patchCheck(key: string, p: Partial<CheckRecord>) {
    change(
      (c) => ({
        ...c,
        checks: c.checks.map((k) =>
          k.key === key ? { ...k, ...p, checkedAt: new Date().toISOString(), checkedBy: "self" } : k,
        ),
      }),
      "check_updated",
      { checkKey: key, ...p },
    );
  }

  function addManual() {
    const name = newName.trim();
    if (!name) return;
    const key = `manual.${newId()}`;
    change(
      (c) => ({ ...c, checks: [...c.checks, { key, type: "manual", name, status: "pending", note: "" }] }),
      "check_added",
      { checkKey: key, name },
    );
    setNewName("");
  }

  function markReady() {
    if (
      unresolved > 0 &&
      !confirm("未確認のチェックがあります。\nそれでも申請準備完了にしますか？")
    ) {
      return;
    }
    updateCase(record.id, (c) => ({ ...c, checkMemo: memo, workflowStatus: "application_ready" }));
    logAudit(record.id, "application_ready_marked", { unresolved });
  }

  const sorted = sortChecks(record.checks);
  const plannedOk = validPlannedDate(planned);

  return (
    <div className="space-y-6">
      <DeadlineBanner date={record.applicant.residenceExpiryDate} />

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p className="flex items-center gap-2">
          状態：
          <Badge tone={ready ? "green" : "yellow"}>{ready ? "申請準備完了" : "未完了"}</Badge>
          <span className="text-slate-600">
            確認済み・対象外 {record.checks.length - unresolved}／{record.checks.length}件
          </span>
        </p>
        <label className="flex items-center gap-2">
          <span className="text-slate-600">申請予定日</span>
          <input
            type="date"
            className={`${inputClass} w-44`}
            value={planned}
            onChange={(e) => setPlanned(e.target.value)}
            onBlur={() => {
              if (plannedOk && planned !== record.plannedApplicationDate) {
                change((c) => ({ ...c, plannedApplicationDate: planned }), "check_updated", {
                  plannedApplicationDate: planned,
                });
              }
            }}
          />
        </label>
      </section>

      {TYPES.map((type) => {
        const items = sorted.filter((k) => k.type === type);
        if (items.length === 0 && type !== "manual") return null;
        return (
          <section key={type} className="rounded-lg border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-6 py-3 font-semibold">{CHECK_TYPE_LABELS[type]}</h2>
            <ul className="divide-y divide-slate-100">
              {items.map((k) => (
                <CheckRow
                  key={k.key}
                  check={k}
                  record={record}
                  onPatch={patchCheck}
                  onRemove={() =>
                    change((c) => ({ ...c, checks: c.checks.filter((x) => x.key !== k.key) }), "check_removed", {
                      checkKey: k.key,
                    })
                  }
                />
              ))}
            </ul>
            {type === "manual" && (
              <div className="flex gap-2 px-6 py-3">
                <input
                  className={inputClass}
                  placeholder="確認したい項目を追加"
                  value={newName}
                  maxLength={100}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Button variant="secondary" onClick={addManual} disabled={!newName.trim()}>
                  追加
                </Button>
              </div>
            )}
          </section>
        );
      })}

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-semibold">行政書士メモ</h2>
        <textarea
          className={inputClass}
          rows={4}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={flushMemo}
        />
      </section>

      <div className="rounded-md bg-slate-100 p-4 text-xs leading-relaxed text-slate-700">
        申請準備完了は、当事務所内の確認状態を示すものです。申請の可否、許可の見込み、必要書類の最終判断を保証するものではありません。
      </div>

      <div className="flex justify-end">
        <Button onClick={markReady} disabled={ready}>
          {ready ? "申請準備完了です" : "申請準備完了にする"}
        </Button>
      </div>
    </div>
  );
}

function CheckRow({
  check,
  record,
  onPatch,
  onRemove,
}: {
  check: CheckRecord;
  record: CaseRecord;
  onPatch: (key: string, p: Partial<CheckRecord>) => void;
  onRemove: () => void;
}) {
  const [note, setNote] = useState(check.note);
  const ref = referenceFor(record, check.key);
  const flushNote = useAutoSave(note, check.note, (v) => onPatch(check.key, { note: v }));
  return (
    <li className="grid gap-2 px-6 py-3 text-sm md:grid-cols-[1fr_11rem]">
      <div>
        <p>{check.name}</p>
        {ref.text && (
          <p className={`mt-1 text-xs ${ref.tone === "warn" ? "text-amber-800" : "text-slate-500"}`}>参考：{ref.text}</p>
        )}
        <input
          className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
          placeholder="メモ"
          aria-label={`${check.name} メモ`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={flushNote}
        />
        {check.checkedAt && <p className="mt-1 text-xs text-slate-400">最終確認：{formatDateTime(check.checkedAt)}</p>}
      </div>
      <div className="flex items-start gap-2">
        <select
          className="rounded-md border border-slate-300 bg-white px-2 py-1"
          aria-label={`${check.name} 状態`}
          value={check.status}
          onChange={(e) => onPatch(check.key, { status: e.target.value as CheckStatus })}
        >
          {(Object.keys(CHECK_STATUS_LABELS) as CheckStatus[]).map((s) => (
            <option key={s} value={s}>
              {CHECK_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Badge tone={STATUS_TONE[check.status]}>{CHECK_STATUS_LABELS[check.status]}</Badge>
        {check.type === "manual" && (
          <button onClick={onRemove} className="text-xs text-red-700 hover:underline">
            削除
          </button>
        )}
      </div>
    </li>
  );
}
