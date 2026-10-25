import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/m/cases", useRouter: () => ({ replace: () => {}, push: () => {} }) }));

import { CaseFilterSheet, CONDITIONS, countActiveConditions } from "../components/mobile/CaseFilterSheet";
import { CaseRow } from "../components/mobile/CaseRow";
import { Sheet } from "../components/mobile/Sheet";
import { DEFAULT_FILTER, expiryLevel, metricsOf, type CaseFilter, type CaseRow as CaseRowData } from "../lib/caseMetrics";
import { buildDemoSeedCases } from "../lib/demoSeed";
import { CATALOG } from "../lib/i18n/messages";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";

// 架空のデモ案件だけを使う
const base = buildDemoSeedCases(new Date())[0];
/** 残り日数だけを差し替えた行（期限の日付は、行に出ないことを確かめるため、そのまま残す） */
function rowWith(days: number | null, missingCount = 0): CaseRowData {
  const level = expiryLevel(days);
  const metrics = { ...metricsOf(base), days, level, within30: level === "urgent" || level === "overdue", missingCount };
  return { record: base, metrics };
}
const html = (row: CaseRowData) => renderToStaticMarkup(<CaseRow row={row} />);

describe("CaseRow（iPhone 版）", () => {
  it("通常の案件：案件名と状態（図形＋文字）、申請人・手続だけ。期限の日付・段階・残り日数・書類件数は出さない", () => {
    const m = html(rowWith(200, 3));
    expect(m).toContain(base.caseName);
    expect(m).toContain(base.applicant.legalName);
    expect(m).toContain(" ・ ");
    // 状態は WorkflowBadge（svg の図形つき）
    expect(m).toMatch(/<svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>[^<]*(要確認|申請準備完了|確認済み|確認前|[^<]+)<\/span>/);
    expect(m).not.toContain("あと");
    expect(m).not.toContain("超過");
    expect(m).not.toContain("在留期限");
    expect(m).not.toContain("未受領書類");
    expect(m).not.toContain("通常");
    expect(m).not.toContain("注意");
    expect(m).not.toMatch(/\d{4}[/年-]\d{1,2}/); // 日付そのもの
    expect(m).toContain("min-h-[44px]");
    expect(m).not.toMatch(/(?<![-\w])h-(\[|\d)/); // 固定の高さを持たない
  });
  it("期限が 31 日以上先なら、残り日数を出さない（境界）", () => {
    expect(html(rowWith(31))).not.toContain("あと");
    expect(html(rowWith(30))).toContain("あと30日");
  });
  it("30 日以内：末尾に図形つきで「あと N 日」を足す（読み上げ用に「在留期限：」を前置）", () => {
    const m = html(rowWith(12));
    expect(m).toContain("あと12日");
    expect(m).toContain('<span class="sr-only">在留期限：</span>');
    expect(m).toMatch(/<svg[^>]*><path d="M6 \.8[^>]*><\/path><path[^>]*><\/path><\/svg><span class="sr-only">/); // 赤のひし形の図形
    expect(m).not.toContain("超過");
  });
  it("当日は「本日まで」、過ぎていれば「超過」", () => {
    expect(html(rowWith(0))).toContain("本日まで");
    const over = html(rowWith(-5));
    expect(over).toContain("超過");
    expect(over).not.toContain("あと");
  });
  it("期限が未入力なら、何も足さない", () => {
    const m = html(rowWith(null));
    expect(m).not.toContain("あと");
    expect(m).not.toContain("超過");
    expect(m).not.toContain("本日");
  });
  it("案件名と状態の行は折り返せる（flex-wrap）", () => {
    expect(html(rowWith(10))).toContain("flex-wrap");
  });
});

const noop = () => {};
const sheet = (filter: CaseFilter = DEFAULT_FILTER) =>
  renderToStaticMarkup(<CaseFilterSheet filter={filter} onChange={noop} onReset={noop} onClose={noop} resultText="該当 3 件（全 3 件）" />);

describe("countActiveConditions", () => {
  it("既定は 0。状態・手続・条件・並び順を数え、検索語は数えない", () => {
    expect(countActiveConditions(DEFAULT_FILTER)).toBe(0);
    expect(countActiveConditions({ ...DEFAULT_FILTER, query: "x" })).toBe(0);
    expect(countActiveConditions({ ...DEFAULT_FILTER, status: "review_required" })).toBe(1);
    expect(countActiveConditions({ ...DEFAULT_FILTER, procedure: "renewal" })).toBe(1);
    expect(countActiveConditions({ ...DEFAULT_FILTER, sort: "expiry" })).toBe(1);
    const all = { ...DEFAULT_FILTER, status: "review_required", procedure: "renewal", sort: "name" as const, within30: true, missingDocs: true, unconfirmed: true, checksPending: true, noCard: true };
    expect(countActiveConditions(all)).toBe(3 + CONDITIONS.length);
  });
});

describe("絞り込みと並び替えのシート", () => {
  it("ダイアログとして出る：role・aria-modal・見出しとの結び付き・「完了」", () => {
    const m = sheet();
    expect(m).toContain('role="dialog"');
    expect(m).toContain('aria-modal="true"');
    const labelledby = m.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(labelledby).toBeTruthy();
    expect(m).toContain(`<h2 id="${labelledby}"`);
    expect(m).toContain("絞り込みと並び替え");
    expect(m).toMatch(/<button[^>]*data-autofocus[^>]*>完了<\/button>/);
    expect(m).toContain("min-h-[44px]");
    expect(m).toContain("該当 3 件（全 3 件）");
  });
  it("4 つのまとまり（状態・手続の種類・条件・並び順）を出し、要点カードの近道だった条件を含む", () => {
    const m = sheet();
    for (const h of ["状態", "手続の種類", "条件", "並び順"]) expect(m).toContain(`>${h}</h2>`);
    for (const c of ["期限30日以内（超過を含む）", "未受領書類あり", "申請人情報の確認未了", "申請前チェック未完了"]) expect(m).toContain(c);
    for (const s of ["準備中", "要確認", "申請準備完了"]) expect(m).toContain(s);
    expect(m).toContain("在留期間更新許可申請");
    expect(m).toContain("最終更新が新しい順");
    expect(m).toContain("在留期限が近い順");
    // 1 つの画面に、見出しの h2 は 4 つの区分＋シート自身
    expect(m.match(/<h2/g)).toHaveLength(5);
  });
  it("選択中の行は aria-pressed とチェックの印で示す（色だけにしない）。既定は「すべて」と既定の並び順", () => {
    const m = sheet();
    // 状態・手続の「すべて」と、並び順の既定の 3 行
    expect(m.match(/aria-pressed="true"/g)).toHaveLength(3);
    expect(m.match(/aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*?<path d="m3 8\.5/g)).toHaveLength(3);
    const picked = sheet({ ...DEFAULT_FILTER, within30: true, sort: "expiry" });
    expect(picked.match(/aria-pressed="true"/g)).toHaveLength(2 /* すべて×2 */ + 2 /* 条件と並び順 */);
  });
  it("条件があるときだけ「条件をリセット」を出す", () => {
    expect(sheet()).not.toContain("条件をリセット");
    expect(sheet({ ...DEFAULT_FILTER, missingDocs: true })).toContain("条件をリセット");
  });
  it("Sheet 本体：背景（スクリム）の上に、高さを固定しない面を置き、中身だけスクロールする", () => {
    const m = renderToStaticMarkup(
      <Sheet title="見出し" doneLabel="完了" onClose={noop}>
        <p>中身</p>
      </Sheet>,
    );
    expect(m).toContain("motion-scrim");
    expect(m).toContain("motion-panel");
    expect(m).toContain("max-h-[90dvh]");
    expect(m).toContain("overflow-y-auto");
    expect(m).not.toMatch(/(?<![-\w])h-(\[|\d)/);
  });
});

describe("文言（ja / en / ko）", () => {
  it("追加した文言が 3 言語に揃い、英語・韓国語は下書きのまま", () => {
    const m = CATALOG.mobile as unknown as Record<string, Record<string, string>>;
    const keys = Object.keys(m.ja).filter((k) => k.startsWith("casesFilter") || k.startsWith("caseRow"));
    expect(keys.length).toBeGreaterThanOrEqual(10);
    for (const k of keys) {
      expect(m.en[k], k).toBeTruthy();
      expect(m.ko[k], k).toBeTruthy();
    }
    // プレースホルダーの一致
    for (const k of ["casesFilterButtonAriaCount", "caseRowDaysLeft"]) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(ph(m.en[k]), k).toBe(ph(m.ja[k]));
      expect(ph(m.ko[k]), k).toBe(ph(m.ja[k]));
    }
    expect(REVIEW_STATUS.mobile).toEqual({ en: "draft", ko: "draft" });
  });
  it("使わなくなった文言を残さない", () => {
    const m = CATALOG.mobile as unknown as Record<string, Record<string, string>>;
    for (const k of ["casesSummaryAria", "casesStatusChipsAria", "casesProcedureButton", "casesConditionButton", "casesSortButtonAria", "casesSortedBy"]) {
      expect(m.ja[k], k).toBeUndefined();
    }
  });
});
