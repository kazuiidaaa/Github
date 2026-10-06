import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildDocx } from "../lib/documents/docx";
import { buildContent } from "../lib/documents/snapshot";
import type { GeneratedDocument } from "../lib/documents/types";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

const record: CaseRecord = {
  id: "c1",
  caseName: "李明さん 在留期間更新",
  procedureType: "renewal",
  currentStatus: "技術・人文知識・国際業務",
  targetStatus: "",
  memo: "確認メモ",
  workflowStatus: "preparing",
  createdAt: "",
  updatedAt: "2026-10-01T00:00:00.000Z",
  applicant: { ...EMPTY_APPLICANT, legalName: "LI MING" },
  employment: { ...EMPTY_EMPLOYMENT, category: "3", companyName: "株式会社A" },
  formDetails: { ...EMPTY_FORM_DETAILS },
  requirementStates: {},
  customRequirements: [],
  acceptedDate: "",
  plannedApplicationDate: "",
  checkMemo: "",
  checks: [],
  documents: [],
};

function make(type: "case_summary" | "application_checklist", status: GeneratedDocument["status"]): GeneratedDocument {
  return {
    id: "d1",
    caseId: "c1",
    outputFormat: "docx",
    documentType: type,
    title: "t",
    version: 2,
    content: buildContent(record, type),
    status,
    createdAt: "",
  };
}

async function xmlOf(doc: GeneratedDocument): Promise<string> {
  const blob = await buildDocx(doc);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return zip.file("word/document.xml")!.async("string");
}

describe("buildDocx", () => {
  it("保存済みの内容と「行政書士確認前」の表示を含む", async () => {
    const xml = await xmlOf(make("case_summary", "draft"));
    expect(xml).toContain("行政書士確認前");
    expect(xml).toContain("LI MING");
    expect(xml).toContain("株式会社A");
    expect(xml).toContain("公式様式ではありません");
    expect(xml).toContain("未実施");
  });

  it("確認済みの版には確認前の表示を出さない", async () => {
    const xml = await xmlOf(make("case_summary", "reviewed"));
    expect(xml).not.toContain("行政書士確認前");
    expect(xml).toContain("行政書士確認済み");
  });

  it("文書の種類により、含める項目が異なる", async () => {
    const xml = await xmlOf(make("application_checklist", "draft"));
    expect(xml).toContain("必要書類チェックリスト");
    expect(xml).not.toContain("雇用・会社情報");
  });
});
