import { beforeEach, describe, expect, it, vi } from "vitest";

// 値はすべてダミー。xlsx の保存などで途中失敗しても、保存済みの版が画面状態へ反映されることを検証する（M3）。
const mem = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
});
vi.mock("../lib/documents/officialFormClient", () => ({
  XLSX_MIME: "application/x",
  requestOfficialXlsx: vi.fn(async () => ({ blob: new Blob(["x"]), warnings: [] })),
}));
vi.mock("../lib/store", () => ({ logAudit: vi.fn(), newId: () => `id-${Math.random().toString(36).slice(2)}` }));

import { generateDocuments, getGeneratedDocuments, saveHspPointSheet } from "../lib/documents/store";
import { requestOfficialXlsx } from "../lib/documents/officialFormClient";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";

const record: CaseRecord = {
  id: "case-1",
  caseName: "テスト案件",
  procedureType: "renewal",
  currentStatus: "技術・人文知識・国際業務",
  targetStatus: "",
  memo: "",
  workflowStatus: "preparing",
  createdAt: "",
  updatedAt: "2026-10-01T00:00:00.000Z",
  applicant: { ...EMPTY_APPLICANT, legalName: "TARO YAMADA", residenceStatus: "技術・人文知識・国際業務" },
  employment: { ...EMPTY_EMPLOYMENT },
  formDetails: { ...EMPTY_FORM_DETAILS },
  requirementStates: {},
  customRequirements: [],
  acceptedDate: "",
  plannedApplicationDate: "",
  checkMemo: "",
  checks: [],
  documents: [],
};

describe("generateDocuments の途中失敗", () => {
  beforeEach(() => mem.clear());

  it("2種類目の API が失敗しても、1種類目で保存済みの版は画面状態に残り、例外は伝わる", async () => {
    const mock = vi.mocked(requestOfficialXlsx);
    mock.mockResolvedValueOnce({ blob: new Blob(["x"]), warnings: [] });
    mock.mockRejectedValueOnce(new Error("api down"));
    await expect(generateDocuments(record, ["official_application_form", "official_application_form"])).rejects.toThrow("api down");
    // 保存内容の再読込ではなく、画面状態（メモリ）そのものを確認する
    const shown = getGeneratedDocuments(record.id);
    expect(shown.map((d) => d.outputFormat).sort()).toEqual(["html", "xlsx"]);
  });
});

describe("確認前の版の更新（Issue #203）", () => {
  beforeEach(() => mem.clear());

  it("確認前の版があれば、新しい行を作らず、同じ行を更新して版番号を進める", async () => {
    await generateDocuments(record, ["case_summary"]);
    const first = getGeneratedDocuments(record.id).filter((d) => d.documentType === "case_summary");
    expect(first).toHaveLength(1);
    await generateDocuments(record, ["case_summary"]);
    const second = getGeneratedDocuments(record.id).filter((d) => d.documentType === "case_summary");
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(first[0].id);
    expect(second[0].version).toBe(first[0].version + 1);
  });

  it("確認済みの版が最新なら、上書きせず、新しい版を追加する", async () => {
    await generateDocuments(record, ["case_summary"]);
    const [d] = getGeneratedDocuments(record.id);
    const { changeStatus } = await import("../lib/documents/store");
    await changeStatus(d, "reviewed", "確認者");
    const out = await generateDocuments(record, ["case_summary"]);
    const all = getGeneratedDocuments(record.id).filter((x) => x.documentType === "case_summary");
    expect(all).toHaveLength(2);
    expect(all.find((x) => x.id === d.id)?.status).toBe("reviewed");
    expect(all.find((x) => x.id === d.id)?.version).toBe(d.version);
    expect(out[0].id).not.toBe(d.id);
  });
});

describe("ポイント計算表の版管理（Issue #186）", () => {
  beforeEach(() => mem.clear());
  const rec: CaseRecord = { ...record, id: "case-hsp", procedureType: "change", currentStatus: "技術・人文知識・国際業務", targetStatus: "高度専門職（1号イ）" };
  const input = () => ({
    applicant: rec.applicant,
    employment: rec.employment,
    formDetails: { ...EMPTY_FORM_DETAILS, hspPointChecks: ["A:14"] },
    currentStatus: rec.currentStatus,
    targetStatus: rec.targetStatus,
  });

  it("画面の版とエクセルの版を保存し、エクセルの版を返す。ポイント計算表の再生成には、画面の入力値を使う", async () => {
    const mock = vi.mocked(requestOfficialXlsx);
    mock.mockClear();
    const xlsx = await saveHspPointSheet(rec, input());
    expect(xlsx.outputFormat).toBe("xlsx");
    expect(xlsx.documentType).toBe("hsp_point_sheet");
    expect(mock.mock.calls[0][2]).toBe("hspPoint");
    const shown = getGeneratedDocuments(rec.id).filter((d) => d.documentType === "hsp_point_sheet");
    expect(shown.map((d) => d.outputFormat).sort()).toEqual(["html", "xlsx"]);
    const html = shown.find((d) => d.outputFormat === "html");
    expect(html?.content.officialForm?.kind).toBe("hspPoint");
    expect(html?.content.officialForm?.input.formDetails.hspPointChecks).toEqual(["A:14"]);
  });

  it("確認前の版があれば、再度保存したとき、行を増やさず更新する", async () => {
    await saveHspPointSheet(rec, input());
    await saveHspPointSheet(rec, input());
    const shown = getGeneratedDocuments(rec.id).filter((d) => d.documentType === "hsp_point_sheet");
    expect(shown).toHaveLength(2);
  });
});
