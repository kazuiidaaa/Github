"use client";

import type { ReactNode } from "react";
import { GroupedList, GroupedRow } from "@/components/mobile/GroupedList";
import { nextSelection } from "@/components/mobile/FilterChips";
import { Sheet } from "@/components/mobile/Sheet";
import { DEFAULT_FILTER, SORT_KEYS, type CaseFilter, type SortKey } from "@/lib/caseMetrics";
import { useLabels } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { PROCEDURE_TYPES, WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/types";

/** 並び替えの文言（SortKey に値を足すと、ここの漏れを tsc が検出する） */
export const SORT_LABEL_KEYS: Record<SortKey, MessageKey> = {
  updated: "mobile.casesSortUpdated",
  updatedAsc: "mobile.casesSortUpdatedAsc",
  expiry: "mobile.casesSortExpiry",
  expiryDesc: "mobile.casesSortExpiryDesc",
  name: "mobile.casesSortName",
  nameDesc: "mobile.casesSortNameDesc",
  applicant: "mobile.casesSortApplicant",
  applicantDesc: "mobile.casesSortApplicantDesc",
};

/** 条件（複数選択）。要点カードが近道として出していた指標（期限 30 日以内・未受領書類・確認未了・申請前チェック未完了）を含む */
export const CONDITIONS = [
  { value: "within30", label: "caseList.within30" },
  { value: "missingDocs", label: "caseList.missingDocs" },
  { value: "unconfirmed", label: "caseList.unconfirmed" },
  { value: "checksPending", label: "caseList.checksPending" },
  { value: "noCard", label: "caseList.noCard" },
] as const satisfies readonly { value: keyof CaseFilter; label: MessageKey }[];

export type ConditionKey = (typeof CONDITIONS)[number]["value"];

/**
 * 指定中の条件の数（検索語は数えない）。状態・手続の種類（「すべて」以外）、条件の各項目、
 * 既定と違う並び順を、それぞれ 1 つと数える。ボタンのバッジと読み上げに使う。
 */
export function countActiveConditions(f: CaseFilter): number {
  return (
    (f.status !== "all" ? 1 : 0) +
    (f.procedure !== "all" ? 1 : 0) +
    CONDITIONS.filter((c) => f[c.value]).length +
    (f.sort !== DEFAULT_FILTER.sort ? 1 : 0)
  );
}

/** 選択の行の右に出す印（選択中はチェック。色だけにしない） */
function Check({ on }: { on: boolean }) {
  return (
    <span className="flex h-4 w-4 items-center justify-center text-accent" aria-hidden="true">
      {on && (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 8.5 3.2 3.2L13 4.5" />
        </svg>
      )}
    </span>
  );
}

function Option({ label, on, onSelect }: { label: ReactNode; on: boolean; onSelect: () => void }) {
  return <GroupedRow title={<span className={on ? "font-bold" : undefined}>{label}</span>} trailing={<Check on={on} />} chevron={false} pressed={on} onClick={onSelect} />;
}

/**
 * 案件一覧の「絞り込みと並び替え」シート（iPhone 版）。状態・手続の種類・条件・並び順を 1 つの画面にまとめる。
 * 選んだ内容は、すぐに一覧へ反映する（onChange）。「完了」・Escape・背景で閉じる。条件が 1 つでもあるときは、先頭に「条件をリセット」を出す。
 * 開いているときだけ描画する（親は {open && <CaseFilterSheet />}）。
 *
 * props:
 * - filter    今の絞り込み条件
 * - onChange  条件を変えるとき、変更する項目だけを渡す
 * - onReset   条件をすべて既定に戻す（検索語も含めるかは親が決める）
 * - onClose   閉じるとき
 * - resultText 今の該当件数の文（シート内に出し、条件を変えると読み上げる）
 */
export function CaseFilterSheet({
  filter,
  onChange,
  onReset,
  onClose,
  resultText,
}: {
  filter: CaseFilter;
  onChange: (patch: Partial<CaseFilter>) => void;
  onReset: () => void;
  onClose: () => void;
  resultText: string;
}) {
  const t = useT();
  const labels = useLabels();
  const selectedConditions: string[] = CONDITIONS.filter((c) => filter[c.value]).map((c) => c.value);
  const statuses = Object.keys(WORKFLOW_LABELS) as WorkflowStatus[];
  return (
    <Sheet title={t("mobile.casesFilterTitle")} doneLabel={t("mobile.casesFilterDone")} onClose={onClose}>
      <p role="status" aria-live="polite" className="mx-4 mt-3 text-sm font-bold">
        {resultText}
      </p>
      {countActiveConditions(filter) > 0 && (
        <button type="button" onClick={onReset} className="mx-2 mt-1 min-h-[44px] px-2 text-left text-base font-bold text-accent">
          {t("caseList.resetConditions")}
        </button>
      )}

      <GroupedList header={t("mobile.casesFilterStatus")}>
        <Option label={t("mobile.casesAll")} on={filter.status === "all"} onSelect={() => onChange({ status: "all" })} />
        {statuses.map((k) => (
          <Option key={k} label={labels.workflow(k)} on={filter.status === k} onSelect={() => onChange({ status: k })} />
        ))}
      </GroupedList>

      <GroupedList header={t("mobile.casesFilterProcedure")}>
        <Option label={t("mobile.casesAll")} on={filter.procedure === "all"} onSelect={() => onChange({ procedure: "all" })} />
        {PROCEDURE_TYPES.map((p) => (
          <Option key={p.value} label={p.label} on={filter.procedure === p.value} onSelect={() => onChange({ procedure: p.value })} />
        ))}
      </GroupedList>

      <GroupedList header={t("mobile.casesFilterConditions")}>
        {CONDITIONS.map((c) => (
          <Option
            key={c.value}
            label={t(c.label)}
            on={filter[c.value]}
            onSelect={() => {
              const next = nextSelection(selectedConditions, c.value, true);
              onChange(Object.fromEntries(CONDITIONS.map((x) => [x.value, next.includes(x.value)])));
            }}
          />
        ))}
      </GroupedList>

      <GroupedList header={t("mobile.casesSortTitle")}>
        {SORT_KEYS.map((k) => (
          <Option key={k} label={t(SORT_LABEL_KEYS[k])} on={filter.sort === k} onSelect={() => onChange({ sort: k })} />
        ))}
      </GroupedList>
    </Sheet>
  );
}
