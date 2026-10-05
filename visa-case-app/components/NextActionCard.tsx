import Link from "next/link";
import { Button } from "@/components/ui";
import { decideNextAction, type NextActionTarget } from "@/lib/nextAction";
import type { CaseRecord } from "@/lib/types";

/** 概要タブの「次に行うこと」。進み具合は文字と図形で示し、色だけに頼らない。 */
export function NextActionCard({
  record,
  canEdit,
  onGoTab,
}: {
  record: CaseRecord;
  canEdit: boolean;
  onGoTab: (target: Exclude<NextActionTarget, "generate">) => void;
}) {
  const a = decideNextAction(record);
  const buttonClass =
    "rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-text hover:bg-accent-hover";
  return (
    <section
      aria-label="次に行うこと"
      className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold">
            進み具合：{a.total}段階中 {a.step}段階目
          </p>
          <p>次に行うこと：{a.message}</p>
        </div>
        {canEdit &&
          (a.target === "generate" ? (
            <Link href={`/cases/${record.id}/documents`} className={buttonClass}>
              {a.buttonLabel}
            </Link>
          ) : (
            <Button type="button" onClick={() => onGoTab(a.target as Exclude<NextActionTarget, "generate">)}>
              {a.buttonLabel}
            </Button>
          ))}
      </div>
      <ol className="mt-3 flex gap-1" aria-hidden="true">
        {Array.from({ length: a.total }, (_, i) => (
          <li
            key={i}
            className={`h-2 flex-1 rounded-full ${i < a.step ? "bg-accent" : "border border-line-strong bg-white"}`}
          />
        ))}
      </ol>
    </section>
  );
}
