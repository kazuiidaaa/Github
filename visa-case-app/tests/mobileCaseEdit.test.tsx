import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ role: "owner" as string | null }));
vi.mock("../lib/store", () => ({
  useCan: () => ctx.role === "owner" || ctx.role === "admin" || ctx.role === "staff",
  updateCase: () => {},
  settleWrites: () => Promise.resolve(""),
  logAudit: () => {},
}));

import { CaseEditAction, CaseEditSheet } from "../components/mobile/CaseEditSheet";
import { applyCaseEdit, cancelOutcome, draftFromRecord, isDraftDirty, submitCaseEdit, validateCaseEdit, type CaseEditDeps } from "../lib/caseEditDraft";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import { jaT } from "../lib/i18n/jaT";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

function makeCase(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1", caseName: "試験案件", procedureType: "change", currentStatus: "留学", targetStatus: "技術・人文知識・国際業務", memo: "試験のメモ",
    workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS }, requirementStates: {}, customRequirements: [], acceptedDate: "2026-05-01", plannedApplicationDate: "2026-06-01",
    checkMemo: "", checks: [], documents: [], ...over,
  };
}
const t = jaT;
const legend = "変更後の在留資格";
const record = makeCase();
const initial = draftFromRecord(record);

beforeEach(() => {
  ctx.role = "owner";
});

describe("編集の開閉と表示の制御", () => {
  it("権限があれば「編集」を出し、閉じている間はシートを出さない。押せる範囲は 44pt 以上", () => {
    const m = renderToStaticMarkup(<CaseEditAction record={record} />);
    expect(m).toContain("編集");
    expect(m).toContain('aria-haspopup="dialog"');
    expect(m).toContain("min-h-[44px]");
    expect(m).not.toContain('role="dialog"');
  });
  it("閲覧のみ（または役割の取得前）には「編集」を出さない", () => {
    ctx.role = "viewer";
    expect(renderToStaticMarkup(<CaseEditAction record={record} />)).toBe("");
    ctx.role = null;
    expect(renderToStaticMarkup(<CaseEditAction record={record} />)).toBe("");
  });
  it("シートは dialog の役割・aria-modal・見出しを持ち、左「キャンセル」・右「完了」が 44pt 以上", () => {
    const m = renderToStaticMarkup(<CaseEditSheet record={record} onClose={() => {}} />);
    expect(m).toContain('role="dialog"');
    expect(m).toContain('aria-modal="true"');
    expect(m).toContain("aria-labelledby");
    expect(m.indexOf("キャンセル")).toBeLessThan(m.indexOf("案件の編集"));
    expect(m.indexOf("案件の編集")).toBeLessThan(m.indexOf("完了"));
    expect(m.match(/min-h-\[44px\]/g)!.length).toBeGreaterThanOrEqual(6);
  });
  it("案件名・手続・在留資格・メモを出す。受任日など他の項目は出さない", () => {
    const m = renderToStaticMarkup(<CaseEditSheet record={record} onClose={() => {}} />);
    for (const s of ["試験案件", "現在の在留資格", "変更後の在留資格", "メモ", "試験のメモ", "留学"]) expect(m).toContain(s);
    expect(m).not.toContain("受任日");
    expect(m).not.toContain("申請予定日");
  });
  it("変更後の在留資格の欄は、手続種別（needsTargetStatus）に従って出し分ける", () => {
    const renewal = renderToStaticMarkup(<CaseEditSheet record={makeCase({ procedureType: "renewal", targetStatus: "" })} onClose={() => {}} />);
    expect(renewal).not.toContain("変更後の在留資格");
    expect(renewal).not.toContain("希望する在留資格");
    const coe = renderToStaticMarkup(<CaseEditSheet record={makeCase({ procedureType: "coe", targetStatus: "" })} onClose={() => {}} />);
    expect(coe).toContain("希望する在留資格");
  });
});

describe("キャンセルの動き", () => {
  it("変更が無ければ、そのまま閉じる", () => {
    expect(isDraftDirty(initial, { ...initial })).toBe(false);
    expect(cancelOutcome(false)).toBe("close");
  });
  it("案件名・手続・在留資格・メモのどれかを変えると、確認を出す", () => {
    for (const patch of [{ caseName: "別名" }, { procedureType: "renewal" as const }, { currentStatus: "永住者" }, { targetStatus: "永住者" }, { memo: "" }]) {
      const dirty = isDraftDirty(initial, { ...initial, ...patch });
      expect(dirty).toBe(true);
      expect(cancelOutcome(dirty)).toBe("confirm");
    }
  });
  it("変更後が要らない手続では、隠れた変更後の欄の違いは変更に数えない", () => {
    const renewal = { ...initial, procedureType: "renewal" as const };
    expect(isDraftDirty({ ...renewal, targetStatus: "" }, { ...renewal, targetStatus: "永住者" })).toBe(false);
  });
  it("確認の文言は「変更を破棄」「編集を続ける」", () => {
    expect(t("mobileDetail.editDiscard")).toBe("変更を破棄");
    expect(t("mobileDetail.editKeep")).toBe("編集を続ける");
  });
});

describe("検証（PC 版の案件情報と同じ規則）", () => {
  it("案件名が空（空白のみ）だと誤り", () => {
    expect(validateCaseEdit({ ...initial, caseName: "  " }, t, legend).caseName).toBe(t("caseNew.errCaseNameRequired"));
  });
  it("案件名は 100 文字まで", () => {
    expect(validateCaseEdit({ ...initial, caseName: "あ".repeat(100) }, t, legend).caseName).toBeUndefined();
    expect(validateCaseEdit({ ...initial, caseName: "あ".repeat(101) }, t, legend).caseName).toBe(t("caseNew.errCaseNameTooLong"));
  });
  it("変更後の在留資格は、必要な手続でだけ必須", () => {
    expect(validateCaseEdit({ ...initial, targetStatus: " " }, t, legend).targetStatus).toContain(legend);
    expect(validateCaseEdit({ ...initial, procedureType: "renewal", targetStatus: "" }, t, legend).targetStatus).toBeUndefined();
  });
  it("保存では前後の空白を除き、不要な変更後は空にし、受任日などシートに無い項目は変えない", () => {
    const next = applyCaseEdit(record, { ...initial, caseName: " 新名 ", procedureType: "renewal", targetStatus: "永住者" });
    expect(next.caseName).toBe("新名");
    expect(next.targetStatus).toBe("");
    expect(next.acceptedDate).toBe("2026-05-01");
    expect(next.plannedApplicationDate).toBe("2026-06-01");
  });
});

describe("保存の成功と失敗", () => {
  const make = (settle: () => Promise<string>) => ({ update: vi.fn(), settle, audit: vi.fn() }) satisfies CaseEditDeps;
  const run = (deps: CaseEditDeps, draft = { ...initial, caseName: "新名" }) =>
    submitCaseEdit({ record, initial, draft, t, targetLegend: legend, deps });

  it("誤りがあると保存せず、最初の誤りの欄を返す", async () => {
    const deps = make(() => Promise.resolve(""));
    const r = await run(deps, { ...initial, caseName: "", targetStatus: "" });
    expect(r).toMatchObject({ kind: "invalid", first: "caseName" });
    expect(deps.update).not.toHaveBeenCalled();
  });
  it("変更が無ければ保存せずに終える", async () => {
    const deps = make(() => Promise.resolve(""));
    expect(await run(deps, { ...initial })).toEqual({ kind: "unchanged" });
    expect(deps.update).not.toHaveBeenCalled();
  });
  it("成功すると既存の保存処理（update）を呼び、監査ログを残す", async () => {
    const deps = make(() => Promise.resolve(""));
    expect(await run(deps)).toEqual({ kind: "saved" });
    expect(deps.update).toHaveBeenCalledWith("c1", expect.any(Function));
    expect(deps.audit).toHaveBeenCalledWith("c1", "case_info_saved");
  });
  it("保存の失敗（失敗の文・例外）は failed を返し、監査ログを残さない（シートは閉じない）", async () => {
    const a = make(() => Promise.resolve("保存に失敗しました：試験"));
    expect(await run(a)).toEqual({ kind: "failed" });
    expect(a.audit).not.toHaveBeenCalled();
    const b = make(() => Promise.reject(new Error("x")));
    expect(await run(b)).toEqual({ kind: "failed" });
  });
});
