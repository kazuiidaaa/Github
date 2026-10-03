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

import { generateDocuments, getGeneratedDocuments } from "../lib/documents/store";
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
