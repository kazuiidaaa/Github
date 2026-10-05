import type { Summary } from "@/lib/caseMetrics";

export type CardKey = "total" | "review" | "missingDocs" | "unconfirmed" | "checksPending" | "ready" | "within30";

const CARDS: { key: CardKey; label: string; field: keyof Summary }[] = [
  { key: "total", label: "案件総数", field: "total" },
  { key: "review", label: "確認待ち", field: "review" },
  { key: "missingDocs", label: "書類待ち", field: "missingDocs" },
  { key: "unconfirmed", label: "確認未了", field: "unconfirmed" },
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
    <div className="anim-stagger mb-6 grid grid-cols-2 gap-3 md:grid-cols-7">
      {CARDS.map((c) => (
        <button
          key={c.key}
          onClick={() => onSelect(c.key)}
          aria-pressed={active === c.key}
          className={`rounded-2xl border bg-white p-4 text-left hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md ${
            active === c.key ? "border-accent ring-2 ring-accent" : "border-slate-200"
          }`}
        >
          <span className="block text-xs text-slate-500">{c.label}</span>
          <span className="mt-1 block text-2xl font-semibold">{summary[c.field]}</span>
        </button>
      ))}
    </div>
  );
}
