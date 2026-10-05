import { evaluate } from "../requirements/evaluate";
import { progressOf } from "../requirements/progress";
import { sortChecks } from "../checks/definitions";
import { buildTranscription } from "./formMapping";
import { HSP_POINT_FORM, officialFormInputOf, officialFormSpecFor } from "./officialForms";
import { PROCEDURE_TYPES, WORKFLOW_LABELS, type CaseRecord } from "../types";
import {
  DOCUMENT_TYPE_LABELS,
  NOTICES,
  OFFICIAL_FORM_NOTICES,
  TRANSCRIPTION_NOTICES,
  type BuildableDocumentType,
  type ContentJson,
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
export function buildContent(
  c: CaseRecord,
  type: BuildableDocumentType,
  now: Date = new Date(),
  /** 公式様式（Excel）のみ。差し込みエンジン（API）が返した warnings。生成時点の注意として、そのまま保存する */
  officialFormWarnings: string[] = [],
): ContentJson {
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
    case "official_application_form":
      return {
        ...base,
        officialForm: {
          form: { ...officialFormSpecFor(c.procedureType).form },
          applicantConfirmed: c.applicant.confirmationStatus === "confirmed",
          warnings: [...officialFormWarnings],
          input: officialFormInputOf(c),
        },
        notices: [...OFFICIAL_FORM_NOTICES, NOTICES[1]],
      };
    case "hsp_point_sheet":
      return {
        ...base,
        officialForm: {
          kind: "hspPoint",
          form: { ...HSP_POINT_FORM },
          applicantConfirmed: c.applicant.confirmationStatus === "confirmed",
          warnings: [...officialFormWarnings],
          // 画面で編集中の内容を使う場合は、呼び出し側で input を差し替える（lib/documents/store.ts の saveHspPointSheet）
          input: { ...officialFormInputOf(c), targetStatus: c.targetStatus },
        },
        notices: [...OFFICIAL_FORM_NOTICES, NOTICES[1]],
      };
    case "transcription_aid":
      return {
        ...base,
        transcription: buildTranscription(a, e, c.formDetails, { procedureType: c.procedureType, currentStatus: c.currentStatus }),
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

export function titleOf(c: CaseRecord, type: BuildableDocumentType): string {
  return `${c.caseName} ${DOCUMENT_TYPE_LABELS[type]}`;
}
