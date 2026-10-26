"use client";

import Link from "next/link";
import { Fragment, useState, type KeyboardEvent, type ReactNode } from "react";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { currentStatusOf, StatusTransition } from "@/components/StatusTransition";
import { Badge } from "@/components/ui";
import { GroupRelationBadge } from "@/components/GroupRelationBadge";
import { WorkflowBadge } from "@/components/WorkflowBadge";
import { headingGroupId, type GroupHeads } from "@/lib/caseGroups";
import { nextSort, sortState, type CaseFilter, type CaseMetrics, type CaseRow, type SortColumn } from "@/lib/caseMetrics";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import { sortDirKey } from "@/lib/i18n/caseList";
import { decideNextAction } from "@/lib/nextAction";
import { nextRowIndex } from "@/lib/listNav";
import { PROCEDURE_TYPES, type CaseRecord } from "@/lib/types";

export const procedureLabel = (c: CaseRecord) => PROCEDURE_TYPES.find((p) => p.value === c.procedureType)?.label;

/**
 * 一覧の「在留資格」表示。手続に合わせて「今 → 申請後」の形で示す（共通部品 StatusTransition。Issue #433）。
 * 現在の在留資格の値があり、申請人情報が確認済みでないときは「未確認」を付ける。
 */
export function ResidenceStatusCell({ record: c }: { record: CaseRecord }) {
  const t = useT();
  const current = currentStatusOf(c);
  return (
    <StatusTransition
      procedureType={c.procedureType}
      current={current}
      target={c.targetStatus}
      trailing={current && c.applicant.confirmationStatus !== "confirmed" ? <Badge tone="gray">{t("caseList.unconfirmedBadge")}</Badge> : undefined}
    />
  );
}

export function StatusBadges({ record: c, metrics: m }: { record: CaseRecord; metrics: CaseMetrics }) {
  const t = useT();
  return (
    <div className="flex flex-col items-start gap-1">
      <WorkflowBadge status={c.workflowStatus} />
      {m.missingCount > 0 && <Badge tone="yellow">{t("caseList.missingBadge", { count: m.missingCount })}</Badge>}
      {m.unconfirmed && <Badge tone="gray">{t("caseList.unconfirmedInfo")}</Badge>}
      {m.checksPending && <Badge tone="gray">{t("caseList.checksPendingBadge")}</Badge>}
    </div>
  );
}

/** 並び替えの見出し。押すと並び順を切り替える（aria-sort は th に付ける）。高さ 44px。 */
function SortHeader({ column, label, filter, onSort }: { column: SortColumn; label: string; filter: CaseFilter; onSort: (k: CaseFilter["sort"]) => void }) {
  const t = useT();
  const st = sortState(filter.sort);
  const current = st.column === column;
  const dirLabel = t(sortDirKey(st.column, st.dir));
  return (
    <th scope="col" className="px-3 py-0 text-left align-middle" aria-sort={current ? (st.dir === "asc" ? "ascending" : "descending") : undefined}>
      <button
        type="button"
        onClick={() => onSort(nextSort(filter.sort, column))}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-mac-control font-bold hover:underline"
      >
        {label}
        <span aria-hidden="true" className={current ? "text-foreground" : "text-muted"}>
          {current ? (st.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
        <span className="sr-only">{current ? t("caseList.sortCurrent", { dir: dirLabel }) : t("caseList.sortHint")}</span>
      </button>
    </th>
  );
}

function PlainHeader({ children }: { children: ReactNode }) {
  return (
    <th scope="col" className="px-3 py-0 text-left align-middle">
      <span className="inline-flex min-h-[44px] items-center font-bold">{children}</span>
    </th>
  );
}

const NO_GROUPS: GroupHeads = new Map();

/**
 * 案件一覧の表（PC 版）。Finder の一覧表示のように、列（案件名／手続／在留資格／期限／次の作業）と、見出しでの並べ替え、行の選択を持つ。
 * - 行の選択：上下の矢印・Home・End で行を移り（フォーカスと選択が同じ）、Enter で開く。選択中の行は、面の色に加えて、左の太い線と太字で示す（色だけに頼らない）。
 * - 行のどこを押しても、案件詳細へ移る（従来どおり）。
 * - 幅は、置き場所（コンテナ）の幅で切り替える（親の `@container`）。文字を拡大して幅が足りなくなったときは、この表を隠し、呼び出し側のカード表示に任せる。
 */
export function CaseListTable({
  rows,
  groupHeads = NO_GROUPS,
  filter,
  onSort,
  stagger,
  empty,
}: {
  rows: CaseRow[];
  /** グループの見出し用（グループの機能が使えない間・グループが無いときは空） */
  groupHeads?: GroupHeads;
  filter: CaseFilter;
  onSort: (k: CaseFilter["sort"]) => void;
  stagger: string;
  empty: ReactNode;
}) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  function onKeyDown(e: KeyboardEvent<HTMLTableSectionElement>) {
    const links = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>("a[data-row-link]"));
    const current = links.findIndex((a) => a === e.target);
    if (current < 0) return;
    const next = nextRowIndex(e.key, current, links.length);
    if (next === null) return;
    e.preventDefault();
    links[next].focus();
  }
  return (
    <div className="hidden overflow-hidden rounded-mac-group border border-separator bg-grouped-surface @[44rem]:block [&_span.rounded-full]:whitespace-normal">
      <table className="w-full table-fixed text-left text-mac-body">
        <caption className="sr-only">{t("caseList.tableCaption")}</caption>
        <colgroup>
          <col className="w-[27%]" />
          <col className="w-[14%]" />
          <col className="w-[22%]" />
          <col className="w-[17%]" />
          <col className="w-[20%]" />
        </colgroup>
        <thead className="bg-window text-mac-footnote text-muted">
          <tr>
            <SortHeader column="name" label={t("caseList.colName")} filter={filter} onSort={onSort} />
            <PlainHeader>{t("caseList.colProcedure")}</PlainHeader>
            <PlainHeader>{t("caseList.colStatus")}</PlainHeader>
            <SortHeader column="expiry" label={t("caseList.colExpiry")} filter={filter} onSort={onSort} />
            <PlainHeader>{t("caseList.colNext")}</PlainHeader>
          </tr>
        </thead>
        <tbody className={stagger} onKeyDown={onKeyDown}>
          {empty && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted">
                {empty}
              </td>
            </tr>
          )}
          {rows.map(({ record: c, metrics: m }, i) => {
            const isSelected = selected === c.id;
            const headId = headingGroupId(rows[i - 1]?.record, c, groupHeads);
            const inGroup = Boolean(c.groupId && groupHeads.has(c.groupId));
            return (
              <Fragment key={c.id}>
              {headId && (
                <tr className="border-t border-separator bg-window">
                  <th scope="colgroup" colSpan={5} className="px-3 py-2 text-left text-mac-footnote font-bold">
                    <GroupHeading name={groupHeads.get(headId)!.name} count={groupHeads.get(headId)!.count} />
                  </th>
                </tr>
              )}
              <tr
                data-selected={isSelected ? "true" : undefined}
                className={`relative border-t border-separator align-top transition-colors hover:bg-window active:bg-sidebar data-[selected=true]:bg-sidebar-selected data-[selected=true]:shadow-[inset_4px_0_0_var(--focus-ring)]`}
              >
                <td className={`min-w-0 py-3 pr-3 break-words ${inGroup ? "pl-7" : "pl-3"}`}>
                  <Link
                    href={`/cases/${c.id}`}
                    data-row-link
                    aria-current={isSelected ? "true" : undefined}
                    onFocus={() => setSelected(c.id)}
                    className={`rounded-mac-control text-blue-700 after:absolute after:inset-0 hover:underline ${isSelected ? "font-bold" : "font-medium"}`}
                  >
                    {c.caseName}
                  </Link>
                  <span className="mt-0.5 block text-mac-footnote text-muted">
                    {c.applicant.legalName || t("caseList.notEntered")}
                  </span>
                  {inGroup && c.groupRelation && (
                    <span className="mt-1 block">
                      <GroupRelationBadge relation={c.groupRelation} />
                    </span>
                  )}
                </td>
                <td className="min-w-0 px-3 py-3 break-words">{procedureLabel(c)}</td>
                <td className="min-w-0 px-3 py-3 break-words">
                  <ResidenceStatusCell record={c} />
                </td>
                <td className="min-w-0 px-3 py-3 break-words">
                  <ExpiryBadge date={c.applicant.residenceExpiryDate} />
                </td>
                <td className="min-w-0 px-3 py-3 break-words">
                  <span className="block">{decideNextAction(c, t).message}</span>
                  <span className="mt-2 block">
                    <StatusBadges record={c} metrics={m} />
                  </span>
                  <span className="mt-1 block text-mac-caption text-muted">
                    {t("caseList.colUpdated")}：{formatDateTime(c.updatedAt)}
                  </span>
                </td>
              </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** グループの見出しの中身（フォルダの印・名前・件数）。表とカード表示で共用する */
export function GroupHeading({ name, count }: { name: string; count: number }) {
  const t = useT();
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2.5 5.5a1 1 0 0 1 1-1h4l1.5 2h7.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z" strokeLinejoin="round" />
      </svg>
      <span className="min-w-0 break-words">{name}</span>
      <span className="shrink-0 font-normal text-muted">{t("caseGroup.countLabel", { count })}</span>
    </span>
  );
}
