import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { POST } from "../app/api/documents/official-form/route";
import { fillOfficialExcel } from "../lib/documents/excelFill";
import { parseFillInput } from "../lib/documents/excelFill/input";
import { buildBlocks } from "../lib/documents/model";
import { OFFICIAL_FORM_SPECS, officialFormInputOf, officialFormScopeWarnings } from "../lib/documents/officialForms";
import { buildContent, titleOf } from "../lib/documents/snapshot";
import {
  INTERNAL_DOCUMENT_TYPES,
  OFFICIAL_FORM_NOTICES,
  OUTPUT_FORMAT_LABELS,
  type GeneratedDocument,
} from "../lib/documents/types";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

// 値はすべてダミー。実案件の個人情報は書かない。

function make(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "テスト案件 在留期間更新",
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "2026-10-01T00:00:00.000Z",
    applicant: {
      ...EMPTY_APPLICANT,
      legalName: "TARO YAMADA",
      nationality: "テスト国",
      residenceStatus: "技術・人文知識・国際業務",
      confirmationStatus: "confirmed",
    },
    employment: { ...EMPTY_EMPLOYMENT, companyName: "テスト株式会社" },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}

const scopeOf = (c: CaseRecord) => ({
  procedureType: c.procedureType,
  currentStatus: c.currentStatus,
  residenceStatus: c.applicant.residenceStatus,
});

describe("出力内容の選択肢と出力形式", () => {
  it("公式申請様式が選べ、転記補助シートは選べない", () => {
    expect(INTERNAL_DOCUMENT_TYPES).toContain("official_application_form");
    expect(INTERNAL_DOCUMENT_TYPES).not.toContain("transcription_aid");
  });
  it("出力形式にエクセルがある", () => {
    expect(OUTPUT_FORMAT_LABELS.xlsx).toBe("エクセル");
  });
  it("過去の転記補助シートの内容は、引き続き組み立てられる", () => {
    const c = buildContent(make(), "transcription_aid");
    expect(c.transcription).toBeDefined();
    expect(titleOf(make(), "transcription_aid")).toContain("転記補助シート");
  });
});

describe("対象範囲の注意", () => {
  it("更新×技術・人文知識・国際業務は、注意なし", () => {
    expect(officialFormScopeWarnings(scopeOf(make()))).toEqual([]);
  });
  it("専用の様式がない手続種別（その他）は、注意が出る", () => {
    expect(officialFormScopeWarnings(scopeOf(make({ procedureType: "other" })))).toHaveLength(1);
  });
  it("変更は、変更様式の対象として、注意なし（現在の在留資格によらない）", () => {
    expect(officialFormScopeWarnings(scopeOf(make({ procedureType: "change", currentStatus: "留学" })))).toEqual([]);
  });
  it("技術・人文知識・国際業務以外の在留資格は、注意が出る", () => {
    const c = make({ currentStatus: "留学" });
    c.applicant.residenceStatus = "留学";
    expect(officialFormScopeWarnings(scopeOf(c))).toHaveLength(1);
  });
  it("様式の定義は、手続種別をキーに引ける", () => {
    expect(OFFICIAL_FORM_SPECS.renewal?.procedureType).toBe("renewal");
  });
});

describe("公式申請様式の保存内容", () => {
  it("入力値を複製して保存し、warnings・出典・注意書きを持つ", () => {
    const c = make();
    const content = buildContent(c, "official_application_form", new Date(), ["テスト注意"]);
    const o = content.officialForm!;
    expect(o.warnings).toEqual(["テスト注意"]);
    expect(o.form.sourceUrl).toContain("moj.go.jp");
    expect(o.input.applicant.legalName).toBe("TARO YAMADA");
    c.applicant.legalName = "CHANGED";
    expect(o.input.applicant.legalName).toBe("TARO YAMADA");
    expect(content.notices).toEqual(expect.arrayContaining(OFFICIAL_FORM_NOTICES));
    expect(content.notices.join("")).toContain("A4");
    expect(content.notices.join("")).not.toContain("公式の申請様式ではありません");
  });
  it("画面用の構成に、様式・注意が含まれる", () => {
    const content = buildContent(make(), "official_application_form", new Date(), ["テスト注意"]);
    const doc = {
      id: "d1",
      caseId: "c1",
      outputFormat: "html",
      documentType: "official_application_form",
      title: "t",
      version: 1,
      content,
      status: "draft",
      createdAt: "",
    } as GeneratedDocument;
    const text = JSON.stringify(buildBlocks(doc));
    expect(text).toContain("930004095");
    expect(text).toContain("テスト注意");
    expect(text).toContain("提出前に、行政書士が原本");
  });
  it("入力値の写しは、案件から作る", () => {
    expect(officialFormInputOf(make()).employment.companyName).toBe("テスト株式会社");
  });
});

describe("API の入力検証", () => {
  it("手続種別が不正なら、受け付けない", () => {
    expect(parseFillInput({ procedureType: "x" })).toBeNull();
    expect(parseFillInput(null)).toBeNull();
  });
  it("想定外の型の値は、初期値にする", () => {
    const r = parseFillInput({
      procedureType: "renewal",
      applicant: { legalName: 123, nationality: "テスト国", confirmationStatus: "confirmed" },
      employment: { companyName: ["x"], withholdingSpecial: true },
      formDetails: null,
    })!;
    expect(r.applicant.legalName).toBe("");
    expect(r.applicant.nationality).toBe("テスト国");
    expect(r.applicant.confirmationStatus).toBe("confirmed");
    expect(r.employment.companyName).toBe("");
    expect(r.employment.withholdingSpecial).toBe(true);
    expect(r.formDetails.relatives).toEqual([]);
  });
});

describe("差し込み（手続種別の入口）", () => {
  it("対象外の案件でも生成でき、対象外の注意が先頭に付く", async () => {
    const c = make({ procedureType: "other", currentStatus: "留学" });
    const r = await fillOfficialExcel({ ...officialFormInputOf(c), procedureType: c.procedureType });
    expect(r.buffer.subarray(0, 2).toString()).toBe("PK");
    expect(r.warnings[0]).toContain("対象外");
  });
  it("対象の案件は、対象外の注意が付かない", async () => {
    const c = make();
    const r = await fillOfficialExcel({ ...officialFormInputOf(c), procedureType: c.procedureType });
    expect(r.warnings.join("")).not.toContain("対象外");
  });
});

describe("差し込み（変更）", () => {
  it("変更の案件は、変更様式に差し込まれ、変更後の在留資格が項目13に入る", async () => {
    const c = make({ procedureType: "change", currentStatus: "留学", targetStatus: "技術・人文知識・国際業務" });
    const r = await fillOfficialExcel({ ...officialFormInputOf(c), procedureType: c.procedureType });
    expect(r.warnings.join("")).not.toContain("対象外");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(r.buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets.find((s) => s.name.startsWith("申請人用（変更）"))!;
    expect(ws.getCell("I45").value).toBe("技術・人文知識・国際業務");
  });
  it("API の入力検証は、変更後の在留資格を受け取る（型が違えば空）", () => {
    expect(parseFillInput({ procedureType: "change", targetStatus: "経営・管理" })!.targetStatus).toBe("経営・管理");
    expect(parseFillInput({ procedureType: "change", targetStatus: 1 })!.targetStatus).toBe("");
  });
});

describe("API ルート", () => {
  const post = (body: string) =>
    POST(new Request("http://localhost/api/documents/official-form", { method: "POST", body }));
  it("正しい入力で、エクセル（base64）と warnings を返す", async () => {
    const c = make();
    const res = await post(JSON.stringify({ procedureType: c.procedureType, ...officialFormInputOf(c) }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { warnings: string[]; xlsxBase64: string };
    expect(Buffer.from(body.xlsxBase64, "base64").subarray(0, 2).toString()).toBe("PK");
    expect(Array.isArray(body.warnings)).toBe(true);
  });
  it("不正な入力は 400、大きすぎる入力は 413", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post(JSON.stringify({ procedureType: "x" }))).status).toBe(400);
    expect((await post(" ".repeat(1_000_001))).status).toBe(413);
  });
});

describe("マイグレーション 0016", () => {
  const sql = readFileSync("supabase/migrations/0016_generated_documents_xlsx.sql", "utf8");
  it("制約・バケット・登録関数が xlsx に対応している", () => {
    expect(sql).toContain("output_format in ('html', 'docx', 'pdf', 'xlsx')");
    expect(sql).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(sql).toContain("p_output_format not in ('docx', 'pdf', 'xlsx')");
  });
});
