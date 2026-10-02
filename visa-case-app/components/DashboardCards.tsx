import type { Summary } from "@/lib/caseMetrics";

export type CardKey = "total" | "review" | "missingDocs" | "checksPending" | "ready" | "within30";

const CARDS: { key: CardKey; label: string; field: keyof Summary }[] = [
  { key: "total", label: "案件総数", field: "total" },
  { key: "review", label: "確認待ち", field: "review" },
  { key: "missingDocs", label: "書類待ち", field: "missingDocs" },
  { key: "checksPending", label: "申請前チェック待ち", field: "checksPending" },
  { key: "ready", label: "申請準備完了", field: "ready" },
  { key: "within30", label: "期限30日以内", field: "within30" },
];

export function DashboardCards({
  summary,
  active,
  onSelect,
}: {
  summary: Summary;
  active: CardKey | null;
  onSelect: (key: CardKey) => void;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
      {CARDS.map((c) => (
        <button
          key={c.key}
          onClick={() => onSelect(c.key)}
          aria-pressed={active === c.key}
          className={`rounded-lg border bg-white p-4 text-left hover:bg-slate-50 ${
            active === c.key ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"
          }`}
        >
          <span className="block text-xs text-slate-500">{c.label}</span>
          <span className="mt-1 block text-2xl font-semibold">{summary[c.field]}</span>
        </button>
      ))}
    </div>
  );
}
