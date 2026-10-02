import { daysUntil, isValidDate } from "../format";
import { evaluate } from "../requirements/evaluate";
import { progressOf } from "../requirements/progress";
import type { CaseRecord } from "../types";

export interface Reference {
  text: string;
  tone: "ok" | "warn" | "none";
}

const NONE: Reference = { text: "", tone: "none" };

function filled(value: string): Reference {
  return value.trim() ? { text: "入力あり", tone: "ok" } : { text: "未入力", tone: "warn" };
}

/**
 * 項目の確認の参考にする表示。状態（passed など）は決めず、法的な判断も行わない。
 */
export function referenceFor(c: CaseRecord, key: string): Reference {
  const a = c.applicant;
  switch (key) {
    case "applicant.legal_name":
      return filled(a.legalName);
    case "applicant.nationality":
      return filled(a.nationality);
    case "applicant.date_of_birth":
      return filled(a.dateOfBirth);
    case "applicant.residence_status":
      return filled(a.residenceStatus);
    case "applicant.residence_expiry":
      return filled(a.residenceExpiryDate);
    case "applicant.confirmed":
      return a.confirmationStatus === "confirmed"
        ? { text: "確認済みの記録あり", tone: "ok" }
        : { text: "未確認", tone: "warn" };
    case "document.all_received":
    case "document.no_missing": {
      const ev = evaluate(c);
      if (!ev.ruleSet && c.customRequirements.length === 0) {
        return { text: "必要書類の規則が未整備です（手動で確認）", tone: "none" };
      }
      const today = new Date().toISOString().slice(0, 10);
      const p = progressOf(ev, c.customRequirements, today);
      const overdue = p.overdue.length > 0 ? `／期限超過${p.overdue.length}件` : "";
      return {
        text: `必要${p.requiredCount}件／収集済み${p.receivedCount}件／不足${p.missing.length}件${overdue}`,
        tone: p.missing.length > 0 ? "warn" : "ok",
      };
    }
    case "deadline.expiry_checked": {
      const days = daysUntil(a.residenceExpiryDate);
      if (days === null) return { text: "満了日が未入力", tone: "warn" };
      if (days < 0) return { text: `満了日を${-days}日超過`, tone: "warn" };
      if (days === 0) return { text: "本日が満了日（オンライン申請不可）", tone: "warn" };
      return { text: `残り${days}日`, tone: days < 30 ? "warn" : "ok" };
    }
    case "deadline.planned_date_checked": {
      if (!c.plannedApplicationDate) return { text: "申請予定日が未入力", tone: "warn" };
      const planned = daysUntil(c.plannedApplicationDate);
      const expiry = daysUntil(a.residenceExpiryDate);
      if (planned !== null && expiry !== null && planned >= expiry) {
        return { text: "申請予定日が満了日以降です", tone: "warn" };
      }
      return { text: `申請予定日：${c.plannedApplicationDate}`, tone: "ok" };
    }
    default:
      return NONE;
  }
}

export function validPlannedDate(value: string): boolean {
  return value === "" || isValidDate(value);
}
