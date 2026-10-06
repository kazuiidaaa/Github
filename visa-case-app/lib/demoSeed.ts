import { CHECK_DEFINITIONS } from "./checks/definitions";
import { EMPTY_FORM_DETAILS } from "./formDetails";
import { evaluate } from "./requirements/evaluate";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type CheckRecord, type RequirementState } from "./types";

// デモ開始時に用意する、架空の案件。実在の個人・会社・書類とは無関係で、番号・住所・連絡先は含めない。
// 在留期限は、デモ開始日からの相対日数で作る（固定日付だと、日がたつと状態が変わるため）。

const DAY_MS = 86400000;
const SAMPLE_NOTE = "サンプルのため入力していません";

function dateString(base: Date, offsetDays: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function baseCase(
  now: Date,
  o: { id: string; name: string; applicantName: string; company: string; expiryInDays: number; updatedAgoDays: number },
): CaseRecord {
  const stamp = new Date(now.getTime() - o.updatedAgoDays * DAY_MS).toISOString();
  return {
    id: o.id,
    caseName: o.name,
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "デモ用の架空案件です。実在の人物・会社とは関係ありません。",
    workflowStatus: "preparing",
    createdAt: stamp,
    updatedAt: stamp,
    applicant: {
      ...EMPTY_APPLICANT,
      legalName: o.applicantName,
      nationality: "サンプル国",
      residenceStatus: "技術・人文知識・国際業務",
      residenceExpiryDate: dateString(now, o.expiryInDays),
    },
    employment: { ...EMPTY_EMPLOYMENT, companyName: o.company, category: "3" },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  };
}

/** 必要な書類をすべて「確認済み」にした記録を返す（必要書類は規則から求め、ここでは固定しない） */
function allRequiredReviewed(c: CaseRecord): Record<string, RequirementState> {
  const states: Record<string, RequirementState> = {};
  for (const item of evaluate(c).items) {
    if (item.effective === "required") states[item.rule.id] = { status: "reviewed" };
  }
  return states;
}

function checks(status: CheckRecord["status"], stamp: string): CheckRecord[] {
  return CHECK_DEFINITIONS.map((d) =>
    // 氏名・生年月日以外の個人情報は入力しないため、入力有無の項目は対象外として記録する
    d.key === "applicant.date_of_birth"
      ? { key: d.key, type: d.type, name: d.name, status: "not_applicable", note: SAMPLE_NOTE, checkedAt: stamp }
      : { key: d.key, type: d.type, name: d.name, status, note: "", checkedAt: stamp },
  );
}

/**
 * デモ用の架空案件を3件作る。
 * - サンプル案件A：対応が必要（要確認。申請人情報が未確認で、書類が未受領）
 * - サンプル案件B：申請準備完了（申請人情報確認済み、必要書類・申請前チェックとも完了）
 * - サンプル案件C：期限が近い（在留期限まで14日。書類は一部のみ受領）
 */
export function buildDemoSeedCases(now: Date = new Date()): CaseRecord[] {
  const a = baseCase(now, {
    id: "demo-sample-a",
    name: "サンプル案件A",
    applicantName: "サンプル申請人A",
    company: "サンプル株式会社A",
    expiryInDays: 120,
    updatedAgoDays: 0,
  });
  a.workflowStatus = "review_required";
  a.acceptedDate = dateString(now, -30);
  a.plannedApplicationDate = dateString(now, 60);

  const b = baseCase(now, {
    id: "demo-sample-b",
    name: "サンプル案件B",
    applicantName: "サンプル申請人B",
    company: "サンプル株式会社B",
    expiryInDays: 200,
    updatedAgoDays: 1,
  });
  b.workflowStatus = "application_ready";
  b.applicant = { ...b.applicant, confirmationStatus: "confirmed", confirmedAt: b.updatedAt, confirmedBy: "サンプル担当者" };
  b.requirementStates = allRequiredReviewed(b);
  b.checks = checks("passed", b.updatedAt);
  b.acceptedDate = dateString(now, -20);
  b.plannedApplicationDate = dateString(now, 100);

  const c = baseCase(now, {
    id: "demo-sample-c",
    name: "サンプル案件C",
    applicantName: "サンプル申請人C",
    company: "サンプル株式会社C",
    expiryInDays: 14,
    updatedAgoDays: 2,
  });
  c.workflowStatus = "applicant_confirmed";
  c.applicant = { ...c.applicant, confirmationStatus: "confirmed", confirmedAt: c.updatedAt, confirmedBy: "サンプル担当者" };
  const first = Object.keys(allRequiredReviewed(c)).slice(0, 2);
  c.requirementStates = Object.fromEntries(first.map((id) => [id, { status: "received" } as RequirementState]));
  c.acceptedDate = dateString(now, -45);
  c.plannedApplicationDate = dateString(now, 7);

  return [a, b, c];
}
