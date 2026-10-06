import { daysUntil, isValidDate } from "../format";
import { jaT, type T } from "../i18n/caseRequirements";
import { evaluate } from "../requirements/evaluate";
import { progressOf } from "../requirements/progress";
import type { CaseRecord } from "../types";

export interface Reference {
  text: string;
  tone: "ok" | "warn" | "none";
}

const NONE: Reference = { text: "", tone: "none" };

function filled(t: T, value: string): Reference {
  return value.trim() ? { text: t("caseChecks.refFilled"), tone: "ok" } : { text: t("caseChecks.refEmpty"), tone: "warn" };
}

/**
 * 項目の確認の参考にする表示。状態（passed など）は決めず、法的な判断も行わない。
 * 文言は、訳表（caseChecks 区分）から t で引く。省略時は日本語（元の出力と同じ）。
 */
export function referenceFor(c: CaseRecord, key: string, t: T = jaT): Reference {
  const a = c.applicant;
  switch (key) {
    case "applicant.legal_name":
      return filled(t, a.legalName);
    case "applicant.nationality":
      return filled(t, a.nationality);
    case "applicant.date_of_birth":
      return filled(t, a.dateOfBirth);
    case "applicant.residence_status":
      return filled(t, a.residenceStatus);
    case "applicant.residence_expiry":
      return filled(t, a.residenceExpiryDate);
    case "applicant.confirmed":
      return a.confirmationStatus === "confirmed"
        ? { text: t("caseChecks.refConfirmedRecord"), tone: "ok" }
        : { text: t("caseChecks.refUnconfirmed"), tone: "warn" };
    case "document.all_received":
    case "document.no_missing": {
      const ev = evaluate(c);
      if (!ev.ruleSet && c.customRequirements.length === 0) {
        return { text: t("caseChecks.refNoRules"), tone: "none" };
      }
      const today = new Date().toISOString().slice(0, 10);
      const p = progressOf(ev, c.customRequirements, today);
      const overdue = p.overdue.length > 0 ? t("caseChecks.refProgressOverdue", { count: p.overdue.length }) : "";
      return {
        text: t("caseChecks.refProgress", { required: p.requiredCount, received: p.receivedCount, missing: p.missing.length, overdue }),
        tone: p.missing.length > 0 ? "warn" : "ok",
      };
    }
    case "deadline.expiry_checked": {
      const days = daysUntil(a.residenceExpiryDate);
      if (days === null) return { text: t("caseChecks.refExpiryUnknown"), tone: "warn" };
      if (days < 0) return { text: t("caseChecks.refExpiryPassed", { days: -days }), tone: "warn" };
      if (days === 0) return { text: t("caseChecks.refExpiryToday"), tone: "warn" };
      return { text: t("caseChecks.refExpiryRemaining", { days }), tone: days < 30 ? "warn" : "ok" };
    }
    case "deadline.planned_date_checked": {
      if (!c.plannedApplicationDate) return { text: t("caseChecks.refPlannedUnset"), tone: "warn" };
      const planned = daysUntil(c.plannedApplicationDate);
      const expiry = daysUntil(a.residenceExpiryDate);
      if (planned !== null && expiry !== null && planned >= expiry) {
        return { text: t("caseChecks.refPlannedAfter"), tone: "warn" };
      }
      return { text: t("caseChecks.refPlanned", { date: c.plannedApplicationDate }), tone: "ok" };
    }
    default:
      return NONE;
  }
}

export function validPlannedDate(value: string): boolean {
  return value === "" || isValidDate(value);
}
