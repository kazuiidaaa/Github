import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 値はすべてダミー。iPhone 版のグループ表示（一覧の行の関係の印、詳細のグループ欄）を検証する。
const store = vi.hoisted(() => ({
  available: true,
  canEdit: true,
  groups: [] as { id: string; name: string; createdAt: string }[],
  cases: [] as unknown[],
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("../lib/store", () => ({
  useGroupsAvailable: () => store.available,
  useGroups: () => store.groups,
  useCases: () => store.cases,
  useCan: () => store.canEdit,
  createGroup: vi.fn(),
  updateCase: vi.fn(),
  settleWrites: vi.fn(),
  logAudit: vi.fn(),
}));
vi.mock("../components/Toast", () => ({ useToast: () => ({ success: () => {}, error: () => {} }) }));

import { CaseRow } from "../components/mobile/CaseRow";
import { MobileCaseGroup } from "../components/mobile/MobileCaseGroup";
import { applyFilter, DEFAULT_FILTER } from "../lib/caseMetrics";
import { buildDemoSeedCases, buildDemoSeedGroups } from "../lib/demoSeed";
import type { CaseRecord } from "../lib/types";

const demo = buildDemoSeedCases();
const rows = applyFilter(demo, DEFAULT_FILTER);
const inGroup = demo.find((c) => c.groupRelation === "primary")! as CaseRecord;
const outside = demo.find((c) => !c.groupId)! as CaseRecord;

beforeEach(() => {
  store.available = true;
  store.canEdit = true;
  store.groups = buildDemoSeedGroups();
  store.cases = demo;
});

describe("iPhone 版の一覧の行", () => {
  it("グループの中の行は、関係を文字で示す。グループ外の行・関係が空の行には印を付けない", () => {
    const row = rows.find((r) => r.record.id === inGroup.id)!;
    expect(renderToStaticMarkup(<CaseRow row={row} inGroup />)).toContain("主たる申請人");
    expect(renderToStaticMarkup(<CaseRow row={row} />)).not.toContain("主たる申請人");
    const plain = rows.find((r) => r.record.id === outside.id)!;
    expect(renderToStaticMarkup(<CaseRow row={plain} inGroup />)).not.toContain("帯同者");
  });
});

describe("iPhone 版の案件詳細のグループ欄", () => {
  it("グループ名・関係の文字・同じグループの案件へのリンク（/m）を出し、編集できるときは行がボタンになる", () => {
    const m = renderToStaticMarkup(<MobileCaseGroup record={inGroup} />);
    expect(m).toContain("サンプルグループ");
    expect(m).toContain("主たる申請人との関係");
    expect(m).toContain("帯同者");
    expect(m).toContain('href="/m/cases/');
    expect(m).toContain('id="m-case-group-open"');
    expect(m).not.toContain("続柄");
  });

  it("閲覧のみの役割は表示だけ（編集の行を出さない）", () => {
    store.canEdit = false;
    const m = renderToStaticMarkup(<MobileCaseGroup record={inGroup} />);
    expect(m).toContain("サンプルグループ");
    expect(m).not.toContain('id="m-case-group-open"');
  });

  it("グループに入っていない案件は「グループに入っていません」。機能が使えない間は何も出さない", () => {
    expect(renderToStaticMarkup(<MobileCaseGroup record={outside} />)).toContain("グループに入っていません");
    store.available = false;
    store.groups = [];
    expect(renderToStaticMarkup(<MobileCaseGroup record={outside} />)).toBe("");
  });
});
