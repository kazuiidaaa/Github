import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ role: "owner" as string | null }));
vi.mock("../lib/store", () => ({
  useCan: () => ctx.role === "owner" || ctx.role === "admin" || ctx.role === "staff",
  updateCase: () => {},
  settleWrites: () => Promise.resolve(""),
  logAudit: () => {},
}));

import { DateRow } from "../components/mobile/FormRows";
import { CaseEditAction, CaseEditSheet } from "../components/mobile/CaseEditSheet";
import { applyCaseEdit, CASE_EDIT_ERROR_ORDER, cancelOutcome, draftFromRecord, isDraftDirty, submitCaseEdit, validateCaseEdit, type CaseEditDeps } from "../lib/caseEditDraft";
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
  it("案件名・手続・在留資格・受任日・メモを出す。申請予定日など他の項目は出さない", () => {
    const m = renderToStaticMarkup(<CaseEditSheet record={record} onClose={() => {}} />);
    for (const s of ["試験案件", "現在の在留資格", "変更後の在留資格", "受任日", "2026/05/01", "メモ", "試験のメモ", "留学"]) expect(m).toContain(s);
    expect(m).not.toContain("申請予定日（");
  });
  it("受任日の欄：見出しと入力欄が結び付き、数字のキーボード・16px・44pt 以上で、補足の文が入力欄に結び付く", () => {
    const m = renderToStaticMarkup(<CaseEditSheet record={record} onClose={() => {}} />);
    expect(m).toMatch(/<label for="m-case-edit-acceptedDate"[^>]*>受任日/);
    const input = m.match(/<input[^>]*id="m-case-edit-acceptedDate"[^>]*>/)![0];
    expect(input).toContain('inputMode="numeric"');
    expect(input).toContain("min-h-[44px]");
    expect(input).toContain("text-base");
    expect(input).toContain("aria-describedby");
    expect(m).toContain(t("input.acceptedDateField_hint"));
  });
  it("受任日が未入力の案件でも欄を出す（空欄）", () => {
    const m = renderToStaticMarkup(<CaseEditSheet record={makeCase({ acceptedDate: "" })} onClose={() => {}} />);
    expect(m.match(/<input[^>]*id="m-case-edit-acceptedDate"[^>]*>/)![0]).toContain('value=""');
  });
  it("受任日が申請予定日より後なら、三角の印と文で注意を出す（保存は止めない）", () => {
    const m = renderToStaticMarkup(<CaseEditSheet record={makeCase({ acceptedDate: "2026-07-01" })} onClose={() => {}} />);
    expect(m).toContain('role="note"');
    expect(m).toContain("注意：受任日が、申請予定日（2026-06-01）より後");
    expect(renderToStaticMarkup(<CaseEditSheet record={record} onClose={() => {}} />)).not.toContain('role="note"');
  });
  it("閲覧のみの役割には、受任日を含め編集を出さない", () => {
    ctx.role = "viewer";
    expect(renderToStaticMarkup(<CaseEditAction record={record} />)).not.toContain("受任日");
  });
  it("変更後の在留資格の欄は、手続種別（needsTargetStatus）に従って出し分ける", () => {
    const renewal = renderToStaticMarkup(<CaseEditSheet record={makeCase({ procedureType: "renewal", targetStatus: "" })} onClose={() => {}} />);
    expect(renewal).not.toContain("変更後の在留資格");
    expect(renewal).not.toContain("希望する在留資格");
    const coe = renderToStaticMarkup(<CaseEditSheet record={makeCase({ procedureType: "coe", targetStatus: "" })} onClose={() => {}} />);
    expect(coe).toContain("希望する在留資格");
  });
});

describe("受任日の行の誤り表示", () => {
  it("誤りは図形の印（svg）と文で示し、入力欄に aria-invalid と説明を結び付け、折り返せる", () => {
    const m = renderToStaticMarkup(<DateRow id="d1" label="受任日" value="2026-02-30" onChange={() => {}} error="日付が正しくありません" hint="補足" />);
    expect(m).toContain("日付が正しくありません");
    expect(m).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(m).toContain("break-words");
    expect(m).toContain('aria-invalid="true"');
    expect(m).toMatch(/aria-describedby="[^"]+ [^"]+"/);
  });
});

describe("キャンセルの動き", () => {
  it("変更が無ければ、そのまま閉じる", () => {
    expect(isDraftDirty(initial, { ...initial })).toBe(false);
    expect(cancelOutcome(false)).toBe("close");
  });
  it("案件名・手続・在留資格・メモのどれかを変えると、確認を出す", () => {
    for (const patch of [{ caseName: "別名" }, { procedureType: "renewal" as const }, { currentStatus: "永住者" }, { targetStatus: "永住者" }, { acceptedDate: "2026-05-02" }, { acceptedDate: "" }, { memo: "" }]) {
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
  it("受任日：未入力は正常、存在しない日付は誤り（PC 版と同じ文言）", () => {
    expect(validateCaseEdit({ ...initial, acceptedDate: "" }, t, legend).acceptedDate).toBeUndefined();
    expect(validateCaseEdit({ ...initial, acceptedDate: "2026-02-28" }, t, legend).acceptedDate).toBeUndefined();
    expect(validateCaseEdit({ ...initial, acceptedDate: "2026-02-30" }, t, legend).acceptedDate).toBe(t("caseNew.errAcceptedDate"));
  });
  it("誤りの順は、案件名・変更後の在留資格・受任日", () => {
    const e = validateCaseEdit({ ...initial, caseName: "", targetStatus: "", acceptedDate: "2026-13-40" }, t, legend);
    expect(CASE_EDIT_ERROR_ORDER.filter((k) => e[k])).toEqual(["caseName", "targetStatus", "acceptedDate"]);
  });
  it("保存では前後の空白を除き、不要な変更後は空にし、申請予定日などシートに無い項目は変えない", () => {
    const next = applyCaseEdit(record, { ...initial, caseName: " 新名 ", procedureType: "renewal", targetStatus: "永住者", acceptedDate: "2026-05-09" });
    expect(next.caseName).toBe("新名");
    expect(next.targetStatus).toBe("");
    expect(next.acceptedDate).toBe("2026-05-09");
    expect(applyCaseEdit(record, { ...initial, acceptedDate: "" }).acceptedDate).toBe("");
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
    expect(deps.audit).toHaveBeenCalledWith("c1", "case_info_saved", undefined);
  });
  it("受任日を変えた保存は、PC 版と同じく変わった項目名つきで監査ログを残す。変えなければ項目名なし", async () => {
    const deps = make(() => Promise.resolve(""));
    expect(await run(deps, { ...initial, acceptedDate: "2026-05-09" })).toEqual({ kind: "saved" });
    expect(deps.audit).toHaveBeenCalledWith("c1", "case_info_saved", { acceptedDate: "2026-05-09" });
    expect(deps.update).toHaveBeenCalledWith("c1", expect.any(Function));
    const fn = deps.update.mock.calls[0][1] as (c: CaseRecord) => CaseRecord;
    expect(fn(record).acceptedDate).toBe("2026-05-09");
  });
  it("不正な受任日では保存せず、受任日の欄を返す", async () => {
    const deps = make(() => Promise.resolve(""));
    expect(await run(deps, { ...initial, acceptedDate: "2026-02-30" })).toMatchObject({ kind: "invalid", first: "acceptedDate" });
    expect(deps.update).not.toHaveBeenCalled();
  });
  it("保存の失敗（失敗の文・例外）は failed を返し、監査ログを残さない（シートは閉じない）", async () => {
    const a = make(() => Promise.resolve("保存に失敗しました：試験"));
    expect(await run(a)).toEqual({ kind: "failed" });
    expect(a.audit).not.toHaveBeenCalled();
    const b = make(() => Promise.reject(new Error("x")));
    expect(await run(b)).toEqual({ kind: "failed" });
  });
});
