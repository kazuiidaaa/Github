import { evaluate } from "../requirements/evaluate";
import { progressOf } from "../requirements/progress";
import { sortChecks } from "../checks/definitions";
import { buildTranscription } from "./formMapping";
import { PROCEDURE_TYPES, WORKFLOW_LABELS, type CaseRecord } from "../types";
import {
  DOCUMENT_TYPE_LABELS,
  NOTICES,
  TRANSCRIPTION_NOTICES,
  type ContentJson,
  type InternalDocumentType,
  type SnapshotRequirement,
} from "./types";

function todayString(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

function requirementsOf(c: CaseRecord): NonNullable<ContentJson["requirements"]> {
  const ev = evaluate(c);
  const progress = progressOf(ev, c.customRequirements, todayString(new Date()));
  const items: SnapshotRequirement[] = [
    ...ev.items.map(
      (i): SnapshotRequirement => ({
        id: i.rule.id,
        name: i.rule.name,
        party: i.rule.party,
        category: i.effective,
        overridden: !!i.state.override,
        custom: false,
        status: i.state.status,
        dueDate: i.state.dueDate,
        note: i.state.note,
      }),
    ),
    ...c.customRequirements.map(
      (r): SnapshotRequirement => ({
        id: r.id,
        name: r.name,
        party: r.party,
        category: r.isRequired ? "required" : "not_required",
        overridden: false,
        custom: true,
        status: r.status,
        dueDate: r.dueDate,
        note: r.note,
      }),
    ),
  ];
  return { items, requiredCount: progress.requiredCount, receivedCount: progress.receivedCount };
}

/**
 * 案件の現在の内容から、生成時点の写し（content_json）を作る。
 * 値はすべて複製し、案件への参照は持たない。
 */
export function buildContent(c: CaseRecord, type: InternalDocumentType, now: Date = new Date()): ContentJson {
  const a = c.applicant;
  const e = c.employment;
  const base: ContentJson = {
    schemaVersion: 1,
    template: `${type}@1`,
    generatedAt: now.toISOString(),
    source: { caseId: c.id, caseUpdatedAt: c.updatedAt },
    case: {
      caseName: c.caseName,
      procedureType: c.procedureType,
      procedureLabel: PROCEDURE_TYPES.find((p) => p.value === c.procedureType)?.label ?? "",
      currentStatus: c.currentStatus,
      targetStatus: c.targetStatus,
      workflowStatus: c.workflowStatus,
      workflowLabel: WORKFLOW_LABELS[c.workflowStatus],
    },
    memo: c.memo,
    notices: [...NOTICES],
  };

  const applicant: ContentJson["applicant"] = {
    legalName: a.legalName,
    nationality: a.nationality,
    dateOfBirth: a.dateOfBirth,
    gender: a.gender,
    address: a.address,
    residenceStatus: a.residenceStatus,
    residenceExpiryDate: a.residenceExpiryDate,
    residenceCardNumber: a.residenceCardNumber,
    workRestriction: a.workRestriction,
    confirmationStatus: a.confirmationStatus,
    confirmedAt: a.confirmedAt,
    confirmedBy: a.confirmedBy,
  };
  const employment: ContentJson["employment"] = {
    companyName: e.companyName,
    companyAddress: e.companyAddress,
    industry: e.industry,
    capital: e.capital,
    employeeCount: e.employeeCount,
    category: e.category,
    jobDescription: e.jobDescription,
    employmentType: e.employmentType,
    monthlySalary: e.monthlySalary,
    employmentStartDate: e.employmentStartDate,
    contractPeriod: e.contractPeriod,
  };
  const checks: ContentJson["preApplicationChecks"] = {
    available: c.checks.length > 0,
    plannedApplicationDate: c.plannedApplicationDate,
    memo: c.checkMemo,
    items: sortChecks(c.checks).map((k) => ({
      key: k.key,
      type: k.type,
      name: k.name,
      status: k.status,
      note: k.note,
      checkedAt: k.checkedAt,
    })),
  };

  switch (type) {
    case "transcription_aid":
      return {
        ...base,
        transcription: buildTranscription(a, e, { procedureType: c.procedureType, currentStatus: c.currentStatus }),
        notices: [...TRANSCRIPTION_NOTICES, ...base.notices],
      };
    case "case_summary":
      return { ...base, applicant, employment, requirements: requirementsOf(c), preApplicationChecks: checks };
    case "applicant_summary":
      return { ...base, applicant, employment };
    case "application_checklist":
      return { ...base, applicant: { ...applicant, address: "", residenceCardNumber: "" }, requirements: requirementsOf(c), preApplicationChecks: checks };
  }
}

export function titleOf(c: CaseRecord, type: InternalDocumentType): string {
  return `${c.caseName} ${DOCUMENT_TYPE_LABELS[type]}`;
}
