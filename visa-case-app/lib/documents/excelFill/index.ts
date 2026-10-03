import type { FormDetails } from "../../formDetails";
import type { Applicant, EmploymentInfo, ProcedureType } from "../../types";
import { officialFormScopeWarnings } from "../officialForms";
import { fillCoeExcel } from "./coe";
import { fillChangeExcel } from "./change";
import { fillAcquisitionExcel } from "./acquisition";
import { fillRenewalExcel } from "./renewal";

// 手続種別から差し込み関数を選ぶ入口（サーバー専用。node:fs を使うため、画面のコードから import しない）。
// 後続の #84・#86・#88 は、FILLERS に差し込み関数を足す（対象範囲の定義は lib/documents/officialForms.ts）。

export interface FillInput {
  procedureType: ProcedureType;
  currentStatus: string;
  applicant: Applicant;
  employment: EmploymentInfo;
  formDetails: FormDetails;
  /** 案件の「変更後（希望）の在留資格」。変更様式の項目13に使う。省略時は空 */
  targetStatus?: string;
}

type Filler = (a: Applicant, e: EmploymentInfo, f: FormDetails, targetStatus: string) => Promise<{ buffer: Buffer; warnings: string[] }>;

export const FILLERS: Partial<Record<ProcedureType, Filler>> = {
  renewal: fillRenewalExcel,
  coe: fillCoeExcel,
  change: fillChangeExcel,
  // 取得様式は雇用情報を使わない。希望する在留資格（targetStatus）は案件の値を渡す
  acquisition: (a, _e, f, targetStatus) => fillAcquisitionExcel(a, f, targetStatus),
};

/**
 * 手続種別の様式へ差し込む。専用の様式がない手続種別・対象外の案件でも、生成は妨げず、
 * 更新の様式で作り、対象外の注意を warnings の先頭へ加える。
 */
export async function fillOfficialExcel(input: FillInput): Promise<{ buffer: Buffer; warnings: string[] }> {
  const fill = FILLERS[input.procedureType] ?? fillRenewalExcel;
  const { buffer, warnings } = await fill(input.applicant, input.employment, input.formDetails, input.targetStatus ?? "");
  const scope = officialFormScopeWarnings({
    procedureType: input.procedureType,
    currentStatus: input.currentStatus,
    residenceStatus: input.applicant.residenceStatus,
  });
  return { buffer, warnings: [...scope, ...warnings] };
}

