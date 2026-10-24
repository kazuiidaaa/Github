"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { procedureNeedsTarget, type ProcedureType } from "@/lib/types";

/**
 * 手続と在留資格を「今 → 申請後」の形で示す共通部品（Issue #433）。
 * 案件一覧・案件詳細の見出しで使う。
 *
 * - 更新：在留資格を1つだけ示し、「（更新）」を添える。例：技術・人文知識・国際業務（更新）
 * - 変更：現在 → 変更後。例：留学 → 技術・人文知識・国際業務
 * - 認定：（入国前） → 希望
 * - 取得：（出生など） → 希望
 * - その他・未選択：現在の在留資格だけを示す
 * 値のない側は「未入力」と薄く示す。
 */

/** 左側（今）の表示。status は在留資格の値、それ以外は手続で決まる定型の表示 */
export type TransitionFrom = { kind: "status"; value: string | null } | { kind: "beforeEntry" } | { kind: "byBirth" };

export interface TransitionParts {
  from: TransitionFrom;
  /** 右側（申請後）の値。null は未入力。undefined は右側を出さない（矢印も出さない） */
  to?: string | null;
  /** 「（更新）」を添えるか */
  renewal: boolean;
}

const clean = (v: string | undefined | null): string | null => (v ?? "").trim() || null;

/** 現在の在留資格。申請人情報の値を優先し、なければ案件側の値（案件一覧の従来の決め方と同じ） */
export function currentStatusOf(c: { applicant: { residenceStatus?: string }; currentStatus?: string }): string {
  return c.applicant.residenceStatus || c.currentStatus || "";
}

/** 手続種別と在留資格から、表示の組み立てを返す（文言は含まない） */
export function statusTransitionParts(procedureType: string, current: string | undefined, target: string | undefined): TransitionParts {
  const type = procedureType as ProcedureType | "";
  const now: TransitionFrom = { kind: "status", value: clean(current) };
  if (!procedureNeedsTarget(type)) return { from: now, renewal: type === "renewal" };
  const from: TransitionFrom = type === "coe" ? { kind: "beforeEntry" } : type === "acquisition" ? { kind: "byBirth" } : now;
  return { from, to: clean(target), renewal: false };
}

function Arrow() {
  const t = useT();
  return (
    <svg
      role="img"
      aria-label={t("display.statusArrow")}
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted"
    >
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  );
}

function Value({ value }: { value: string | null }) {
  const t = useT();
  if (value === null) return <span className="text-muted">{t("display.statusNotEntered")}</span>;
  return <span className="min-w-0 break-words">{value}</span>;
}

export function StatusTransition({
  procedureType,
  current,
  target,
  trailing,
  className = "",
}: {
  procedureType: string;
  current: string | undefined;
  target: string | undefined;
  /** 末尾に添える要素（例：一覧の「未確認」のバッジ） */
  trailing?: ReactNode;
  className?: string;
}) {
  const t = useT();
  const p = statusTransitionParts(procedureType, current, target);
  const from =
    p.from.kind === "status" ? (
      <Value value={p.from.value} />
    ) : (
      <span className="text-muted">{t(p.from.kind === "beforeEntry" ? "display.statusBeforeEntry" : "display.statusByBirth")}</span>
    );
  return (
    <span className={`inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`}>
      <span className="min-w-0 break-words">
        {from}
        {p.renewal && <span className="text-muted">{t("display.statusRenewalSuffix")}</span>}
      </span>
      {p.to !== undefined && (
        <>
          <Arrow />
          <Value value={p.to} />
        </>
      )}
      {trailing}
    </span>
  );
}
