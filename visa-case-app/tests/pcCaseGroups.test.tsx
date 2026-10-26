import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 値はすべてダミー。PC 版のグループ表示（一覧の見出し・関係の印、案件詳細のグループ欄）を検証する。
const store = vi.hoisted(() => ({
  available: true,
  canDelete: true,
  groups: [] as { id: string; name: string; createdAt: string }[],
  cases: [] as unknown[],
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("../lib/store", () => ({
  useGroupsAvailable: () => store.available,
  useGroups: () => store.groups,
  useCases: () => store.cases,
  useCan: () => store.canDelete,
  createGroup: vi.fn(),
  renameGroup: vi.fn(),
  deleteGroup: vi.fn(),
  updateCase: vi.fn(),
  logAudit: vi.fn(),
}));
vi.mock("../components/Toast", () => ({ useToast: () => ({ success: () => {}, error: () => {} }) }));

import { CaseGroupSection } from "../components/CaseGroupSection";
import { CaseListTable } from "../components/CaseListTable";
import { groupHeads, orderRowsByGroup } from "../lib/caseGroups";
import { applyFilter, DEFAULT_FILTER } from "../lib/caseMetrics";
import { buildDemoSeedCases, buildDemoSeedGroups } from "../lib/demoSeed";
import type { CaseRecord } from "../lib/types";

const demo = buildDemoSeedCases();
const groups = buildDemoSeedGroups();

beforeEach(() => {
  store.available = true;
  store.canDelete = true;
  store.groups = groups;
  store.cases = demo;
});

describe("一覧の表のグループ表示", () => {
  const rows = orderRowsByGroup(applyFilter(demo, DEFAULT_FILTER), groups);
  const heads = groupHeads(rows, groups);
  const html = renderToStaticMarkup(<CaseListTable rows={rows} groupHeads={heads} filter={DEFAULT_FILTER} onSort={() => {}} stagger="" empty={null} />);

  it("グループの見出し行（名前と件数）を 1 回だけ出し、グループ内の案件の前に置く", () => {
    expect(html.match(/scope="colgroup"/g)).toHaveLength(1);
    expect(html).toContain("サンプルグループ");
    expect(html).toContain("2件");
  });

  it("関係は文字で示す（色だけにしない）。グループ外の案件には印を付けない", () => {
    expect(html).toContain("主たる申請人");
    expect(html).toContain("帯同者");
    const outside = html.split("</tr>").find((r) => r.includes("サンプル案件B"))!;
    expect(outside).not.toContain("主たる申請人");
    expect(outside).not.toContain("帯同者");
  });

  it("グループがないとき（機能が使えない間）は、従来どおり見出しも印も出ない", () => {
    const plain = renderToStaticMarkup(<CaseListTable rows={applyFilter(demo, DEFAULT_FILTER)} filter={DEFAULT_FILTER} onSort={() => {}} stagger="" empty={null} />);
    expect(plain).not.toContain('scope="colgroup"');
  });
});

describe("案件詳細のグループ欄", () => {
  const inGroup = demo.find((c) => c.groupId)! as CaseRecord;
  const outside = demo.find((c) => !c.groupId)! as CaseRecord;

  it("グループに入っている案件は、グループ名・関係・同じグループの案件を出し、編集できるときだけ「変更」を出す", () => {
    const editable = renderToStaticMarkup(<CaseGroupSection record={inGroup} canEdit />);
    expect(editable).toContain("サンプルグループ");
    expect(editable).toContain("主たる申請人との関係");
    expect(editable).toContain("同じグループの案件");
    expect(editable).toContain('id="case-group-edit"');
    expect(editable).not.toContain("続柄");
    const readOnly = renderToStaticMarkup(<CaseGroupSection record={inGroup} canEdit={false} />);
    expect(readOnly).toContain("サンプルグループ");
    expect(readOnly).not.toContain('id="case-group-edit"');
  });

  it("グループに入っていない案件でも、機能が使えるなら「グループに入っていません」と変更ボタンを出す", () => {
    const m = renderToStaticMarkup(<CaseGroupSection record={outside} canEdit />);
    expect(m).toContain("グループに入っていません");
    expect(m).toContain('id="case-group-edit"');
  });

  it("機能が使えない間（移行の未適用）は、グループに入っていない案件では何も出さない", () => {
    store.available = false;
    store.groups = [];
    expect(renderToStaticMarkup(<CaseGroupSection record={outside} canEdit />)).toBe("");
  });
});

describe("PC 版のグループの名前の変更・削除の入口", () => {
  const inGroup = demo.find((c) => c.groupId)! as CaseRecord;
  it("編集できる役割には名前の変更を、owner / admin には削除も出す（担当者には削除を出さない）", () => {
    const admin = renderToStaticMarkup(<CaseGroupSection record={inGroup} canEdit />);
    expect(admin).toContain("グループの名前を変更");
    expect(admin).toContain("グループを削除");
    store.canDelete = false;
    const staff = renderToStaticMarkup(<CaseGroupSection record={inGroup} canEdit />);
    expect(staff).toContain("グループの名前を変更");
    expect(staff).not.toContain("グループを削除");
  });
  it("閲覧のみには、どちらも出さない", () => {
    const html = renderToStaticMarkup(<CaseGroupSection record={inGroup} canEdit={false} />);
    expect(html).not.toContain("グループの名前を変更");
    expect(html).not.toContain("グループを削除");
  });
});
