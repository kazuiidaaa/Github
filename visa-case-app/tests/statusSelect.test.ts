import { describe, expect, it } from "vitest";
import { ADVANCED_PROFESSIONAL_GRADE_2, ADVANCED_PROFESSIONAL_GRADES, ADVANCED_PROFESSIONAL_STATUS, baseResidenceStatus } from "../lib/types";
import { COE_PURPOSE_LABELS } from "../lib/documents/excelFill/coeMapping";

describe("高度専門職2号（Issue #186）", () => {
  it("号つきの値は、基本の在留資格「高度専門職」に戻せる（2号を含む）", () => {
    for (const g of [...ADVANCED_PROFESSIONAL_GRADES, ADVANCED_PROFESSIONAL_GRADE_2]) {
      expect(baseResidenceStatus(g)).toBe(ADVANCED_PROFESSIONAL_STATUS);
    }
  });

  it("2号は、認定の入国目的の選択肢（34個）に含まれない（認定には2号の様式がない）", () => {
    expect(COE_PURPOSE_LABELS).not.toContain(ADVANCED_PROFESSIONAL_GRADE_2);
    expect((ADVANCED_PROFESSIONAL_GRADES as readonly string[]).includes(ADVANCED_PROFESSIONAL_GRADE_2)).toBe(false);
  });
});
