import { describe, expect, it } from "vitest";
import { buildContent } from "../lib/documents/snapshot";
import { buildBlocks } from "../lib/documents/model";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";
import type { GeneratedDocument } from "../lib/documents/types";

function make(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "李明さん 在留期間更新",
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "2026-10-01T00:00:00.000Z",
    applicant: {
      ...EMPTY_APPLICANT,
      legalName: "LI MING",
      nationality: "中国",
      dateOfBirth: "1990-04-01",
      residenceStatus: "技術・人文知識・国際業務",
      residenceExpiryDate: "2026-12-31",
      confirmationStatus: "confirmed",
    },
    employment: { ...EMPTY_EMPLOYMENT, companyName: "株式会社A", monthlySalary: "300000" },
    requirementStates: {},
    customRequirements: [],
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}

const items = (c: CaseRecord) =>
  buildContent(c, "transcription_aid").transcription!.sheets.flatMap((s) => s.items);

describe("転記補助シート", () => {
  it("確定済みの申請人情報は『差し込み』、雇用情報は『要確認』になる", () => {
    const all = items(make());
    expect(all.find((i) => i.label === "国籍・地域")?.mode).toBe("auto");
    expect(all.find((i) => i.label === "国籍・地域")?.value).toBe("中国");
    expect(all.find((i) => i.label.startsWith("給与"))?.mode).toBe("confirm");
  });

  it("案件DBに無い項目は『手入力』で空欄になる", () => {
    const all = items(make());
    const passport = all.find((i) => i.label.startsWith("旅券"));
    expect(passport?.mode).toBe("missing");
    expect(passport?.value).toBe("");
  });

  it("申請人情報が下書きの場合は、差し込み項目も『要確認』になり、警告が付く", () => {
    const c = make();
    c.applicant.confirmationStatus = "draft";
    const t = buildContent(c, "transcription_aid").transcription!;
    expect(t.sheets[0].items.find((i) => i.label === "国籍・地域")?.mode).toBe("confirm");
    expect(t.warnings.some((w) => w.includes("確定していません"))).toBe(true);
  });

  it("更新申請・技術・人文知識・国際業務以外の案件には、対象外の警告が付く", () => {
    const t = buildContent(make({ procedureType: "change", currentStatus: "留学" }), "transcription_aid").transcription!;
    expect(t.warnings.some((w) => w.includes("対象外"))).toBe(true);
    expect(buildContent(make(), "transcription_aid").transcription!.warnings).toEqual([]);
  });

  it("公式様式の識別番号と確認日が写しに残り、生成後に案件を変えても変わらない", () => {
    const c = make();
    const content = buildContent(c, "transcription_aid");
    c.applicant.nationality = "変更後";
    expect(content.transcription!.form.fileId).toBe("930004094");
    expect(content.transcription!.sheets[0].items[0].value).toBe("中国");
  });

  it("出力の構成に、4枚の用紙と出典の注意書きが含まれる", () => {
    const content = buildContent(make(), "transcription_aid");
    const doc: GeneratedDocument = {
      id: "d1",
      caseId: "c1",
      outputFormat: "html",
      documentType: "transcription_aid",
      title: "t",
      version: 1,
      content,
      status: "draft",
      createdAt: "",
    };
    const blocks = buildBlocks(doc);
    const headings = blocks.filter((b) => b.kind === "heading").map((b) => (b as { text: string }).text);
    expect(headings).toEqual(expect.arrayContaining(["申請人等作成用1", "申請人等作成用2（N）", "所属機関等作成用1（N）", "所属機関等作成用2（N）"]));
    const notices = blocks.find((b) => b.kind === "notices") as { lines: string[] };
    expect(notices.lines.some((l) => l.includes("出典：出入国在留管理庁"))).toBe(true);
  });
});
