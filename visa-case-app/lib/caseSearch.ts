import type { CaseMetrics } from "./caseMetrics";
import { formatDate } from "./format";
import type { T } from "./i18n/jaT";
import { decideNextAction } from "./nextAction";
import { procedureNeedsTarget, PROCEDURE_TYPES, type CaseRecord, type WorkflowStatus } from "./types";

/**
 * PC 版の案件一覧（表）で、検索が当たる語。表で見える列の語と、メモ。
 * - 案件名、申請人氏名
 * - 手続（表の「手続種別」の文字）
 * - 在留資格（今の在留資格と、変更後・希望の在留資格。表の「今 → 申請後」と同じ。変更後は必要な手続のときだけ）
 * - 期限（表に出る日付の形 2026/05/01 と、保存の形 2026-05-01）
 * - 次の作業（案内の文、状態の名前、未受領書類・確認未了などの札の文）
 * - メモ（案件のメモ。表には出ないが、探すときの手がかり）
 * 画面に出る文字（次の作業・札・状態の名前）は、表示言語の文を使う。氏名・案件名・在留資格名・手続名・メモは、保存値のまま。
 * iPhone 版の一覧は、これを使わず、従来の対象（案件名・申請人氏名・在留資格）のまま（lib/caseMetrics.ts の applyFilter）。
 */
export function listSearchTargets(c: CaseRecord, m: CaseMetrics, t: T, workflowLabel: (s: WorkflowStatus) => string): string[] {
  const expiry = c.applicant.residenceExpiryDate;
  return [
    c.caseName,
    c.applicant.legalName,
    PROCEDURE_TYPES.find((p) => p.value === c.procedureType)?.label ?? "",
    c.applicant.residenceStatus || c.currentStatus,
    procedureNeedsTarget(c.procedureType) ? c.targetStatus : "",
    expiry ? formatDate(expiry) : "",
    expiry,
    decideNextAction(c, t).message,
    workflowLabel(c.workflowStatus),
    m.missingCount > 0 ? t("caseList.missingBadge", { count: m.missingCount }) : "",
    m.unconfirmed ? t("caseList.unconfirmedInfo") : "",
    m.checksPending ? t("caseList.checksPendingBadge") : "",
    c.memo,
  ];
}

/** listSearchTargets を、案件の記録ごとに覚えておく版。入力のたびに全案件の語を作り直さないため（記録が更新されれば新しい記録として作り直す）。表示言語が変わったら、呼び出し側が作り直す */
export function cachedSearchTargets(t: T, workflowLabel: (s: WorkflowStatus) => string): (c: CaseRecord, m: CaseMetrics) => string[] {
  const cache = new WeakMap<CaseRecord, string[]>();
  return (c, m) => {
    let v = cache.get(c);
    if (!v) {
      v = listSearchTargets(c, m, t, workflowLabel);
      cache.set(c, v);
    }
    return v;
  };
}
