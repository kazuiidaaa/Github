"use client";

import Link from "next/link";
import { useState } from "react";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { useCases, useStoreLoaded } from "@/lib/store";
import { PROCEDURE_TYPES, WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/types";

export default function CasesPage() {
  const cases = useCases();
  const loaded = useStoreLoaded();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | WorkflowStatus>("all");

  const filtered = cases.filter((c) => {
    const text = `${c.caseName} ${c.applicant.legalName}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "all" || c.workflowStatus === status);
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">案件一覧</h1>
        <Link href="/cases/new" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          新規案件
        </Link>
      </div>
      <div className="mb-4 flex gap-3">
        <input
          className="w-72 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          placeholder="氏名・案件名で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | WorkflowStatus)}
        >
          <option value="all">状態：すべて</option>
          {Object.entries(WORKFLOW_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">案件名</th>
              <th className="px-4 py-3">申請人氏名</th>
              <th className="px-4 py-3">手続種別</th>
              <th className="px-4 py-3">在留資格</th>
              <th className="px-4 py-3">在留期限</th>
              <th className="px-4 py-3">状態</th>
              <th className="px-4 py-3">最終更新</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {!loaded ? "読み込み中……" : cases.length === 0 ? "案件がありません。「新規案件」から作成してください。" : "該当する案件がありません。"}
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/cases/${c.id}`} className="text-blue-700 hover:underline">
                    {c.caseName}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.applicant.legalName || <span className="text-slate-400">未入力</span>}</td>
                <td className="px-4 py-3">{PROCEDURE_TYPES.find((p) => p.value === c.procedureType)?.label}</td>
                <td className="px-4 py-3">{c.applicant.residenceStatus || c.currentStatus || "-"}</td>
                <td className="px-4 py-3">
                  <ExpiryBadge date={c.applicant.residenceExpiryDate} />
                </td>
                <td className="px-4 py-3">
                  <Badge tone={c.workflowStatus === "applicant_confirmed" ? "green" : "gray"}>
                    {WORKFLOW_LABELS[c.workflowStatus]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
