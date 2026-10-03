import { normalizeFormDetails } from "../../formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, PROCEDURE_TYPES, type Applicant, type EmploymentInfo } from "../../types";
import type { FillInput } from "./index";

// API が受け取る JSON の検証。想定外の型の値は、初期値（空欄）として扱う（差し込みエンジンに不正な型を渡さない）。

function strings<T extends object>(empty: T, raw: unknown): T {
  const src = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...(empty as Record<string, unknown>) };
  for (const [k, v] of Object.entries(empty)) {
    if ((typeof v === "string" || typeof v === "boolean") && typeof src[k] === typeof v) out[k] = src[k];
  }
  return out as T;
}

/** 検証に通らなければ null */
export function parseFillInput(raw: unknown): FillInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const procedureType = PROCEDURE_TYPES.find((p) => p.value === r.procedureType)?.value;
  if (!procedureType) return null;
  const applicant = strings<Applicant>(EMPTY_APPLICANT, r.applicant);
  if (applicant.confirmationStatus !== "confirmed") applicant.confirmationStatus = "draft";
  return {
    procedureType,
    currentStatus: typeof r.currentStatus === "string" ? r.currentStatus : "",
    applicant,
    employment: strings<EmploymentInfo>(EMPTY_EMPLOYMENT, r.employment),
    formDetails: normalizeFormDetails(r.formDetails),
  };
}
