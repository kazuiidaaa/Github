import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/m/cases" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ replace: () => {}, push: () => {} }) }));

import { FilterChips, nextSelection } from "../components/mobile/FilterChips";
import { GroupedList, GroupedRow } from "../components/mobile/GroupedList";
import { LargeTitleHeader } from "../components/mobile/LargeTitleHeader";
import { MenuButton, nextMenuIndex, type MenuOption } from "../components/mobile/MenuButton";
import { activeTab, isMobilePath, MOBILE_TABS } from "../components/mobile/paths";
import { PULL_MAX, PULL_THRESHOLD, PullToRefresh, pullDistance, shouldRefresh } from "../components/mobile/PullToRefresh";
import { SearchField } from "../components/mobile/SearchField";
import { TabBar } from "../components/mobile/TabBar";
import { CATALOG } from "../lib/i18n/messages";
import { REVIEW_STATUS } from "../lib/i18n/reviewStatus";
import { translate } from "../lib/i18n/translate";

describe("パス判定", () => {
  it("/m と /m/… だけが iPhone 版", () => {
    expect(isMobilePath("/m")).toBe(true);
    expect(isMobilePath("/m/cases")).toBe(true);
    expect(isMobilePath("/")).toBe(false);
    expect(isMobilePath("/cases")).toBe(false);
    expect(isMobilePath("/mail")).toBe(false);
    expect(isMobilePath(null)).toBe(false);
  });
  it("タブの現在地", () => {
    expect(activeTab("/m/cases")).toBe("cases");
    expect(activeTab("/m/cases/abc")).toBe("cases");
    expect(activeTab("/m/cases/new")).toBe("new");
    expect(activeTab("/m/cases/new/")).toBe("new");
    expect(activeTab("/m/account")).toBeNull();
    expect(MOBILE_TABS.find((t) => t.id === "account")?.href).toBe("/account");
    expect(activeTab("/m")).toBeNull();
    expect(activeTab("/cases")).toBeNull();
  });
});

describe("TabBar", () => {
  it("3 つのタブを出し、現在地だけに aria-current と青文字を付ける", () => {
    nav.pathname = "/m/cases/new";
    const m = renderToStaticMarkup(<TabBar />);
    expect(m.match(/<a /g)).toHaveLength(3);
    expect(m.match(/aria-current="page"/g)).toHaveLength(1);
    expect(m).toMatch(/aria-current="page"[^>]*text-accent|text-accent[^>]*aria-current="page"/);
    expect(m).toContain("案件");
    expect(m).toContain("新規");
    expect(m).toContain("アカウント");
    expect(m).toContain("min-h-[49px]");
    // 選択中のアイコンは塗りつぶし（fill=currentColor）、他は線画
    expect(m.match(/fill="currentColor" stroke="none"/g)).toHaveLength(1);
  });
});

describe("LargeTitleHeader", () => {
  it("h1 を 1 つだけ出し、小さな見出しは読み上げない。右上の操作を置ける", () => {
    const m = renderToStaticMarkup(<LargeTitleHeader title="案件" trailing={<button>操作</button>} />);
    expect(m.match(/<h1/g)).toHaveLength(1);
    expect(m).toContain('aria-hidden="true"');
    expect(m).toContain("操作");
    expect(m).toContain("sticky");
  });
});

describe("SearchField", () => {
  it("検索の領域として読み上げ名を持ち、空のときは消去ボタンを出さない", () => {
    const empty = renderToStaticMarkup(<SearchField value="" onChange={() => {}} label="案件を検索" />);
    expect(empty).toContain('role="search"');
    expect(empty).toContain('aria-label="案件を検索"');
    expect(empty).not.toContain("入力を消す");
    const filled = renderToStaticMarkup(<SearchField value="あ" onChange={() => {}} label="案件を検索" />);
    expect(filled).toContain('aria-label="入力を消す"');
  });
});

describe("FilterChips", () => {
  const options = [
    { value: "all", label: "すべて", count: 3 },
    { value: "a", label: "確認待ち" },
  ];
  it("選択中は aria-pressed と、チェックの印を併記する", () => {
    const m = renderToStaticMarkup(<FilterChips ariaLabel="状態" options={options} selected={["a"]} onChange={() => {}} />);
    expect(m).toContain('role="group"');
    expect(m.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(m.match(/aria-pressed="false"/g)).toHaveLength(1);
    expect(m.match(/<svg/g)).toHaveLength(1);
    expect(m).toContain("min-h-[44px]");
  });
  it("選択の更新：単一は置き換え、複数は入り切り", () => {
    expect(nextSelection(["a"], "b", false)).toEqual(["b"]);
    expect(nextSelection(["a"], "b", true)).toEqual(["a", "b"]);
    expect(nextSelection(["a", "b"], "a", true)).toEqual(["b"]);
  });
});

describe("GroupedList", () => {
  it("行の種類ごとにリンク・ボタン・表示のみを出し、押せる行にだけシェブロンを出す", () => {
    const m = renderToStaticMarkup(
      <GroupedList header="進行中" footer="補足">
        <GroupedRow title="リンク" href="/m/cases/x" current />
        <GroupedRow title="ボタン" onClick={() => {}} subtitle="2行目" trailing="値" />
        <GroupedRow title="表示のみ" />
      </GroupedList>,
    );
    expect(m).toContain('role="list"');
    expect(m).toContain('href="/m/cases/x"');
    expect(m).toContain('aria-current="page"');
    expect(m).toContain("<button");
    expect(m.match(/viewBox="0 0 8 14"/g)).toHaveLength(2);
    expect(m).toContain("rounded-[10px]");
    expect(m).toContain("進行中");
    expect(m).toContain("補足");
  });
});

describe("GroupedRow の項目名と値", () => {
  it("DOM の順は項目名、値。値は右寄せ", () => {
    const m = renderToStaticMarkup(
      <GroupedList>
        <GroupedRow label="国籍" value="ベトナム" />
      </GroupedList>,
    );
    expect(m.indexOf("国籍")).toBeGreaterThan(-1);
    expect(m.indexOf("国籍")).toBeLessThan(m.indexOf("ベトナム"));
    expect(m).toContain("text-right");
  });
});

describe("MenuButton", () => {
  const options: MenuOption[] = [
    { value: "a", label: "A" },
    { value: "b", label: "B", disabled: true },
    { value: "c", label: "C" },
  ];
  it("閉じているときは、メニュー用の属性を持つ 44pt のボタンだけを出す", () => {
    const m = renderToStaticMarkup(<MenuButton options={options} onSelect={() => {}} label="並び替え" />);
    expect(m).toContain('aria-haspopup="menu"');
    expect(m).toContain('aria-expanded="false"');
    expect(m).toContain('aria-label="並び替え"');
    expect(m).toContain("h-11 w-11");
    expect(m).not.toContain('role="menu"');
  });
  it("矢印・Home・End の移動は、無効な項目を飛ばして端で回り込む", () => {
    expect(nextMenuIndex("ArrowDown", 0, options)).toBe(2);
    expect(nextMenuIndex("ArrowDown", 2, options)).toBe(0);
    expect(nextMenuIndex("ArrowUp", 0, options)).toBe(2);
    expect(nextMenuIndex("Home", 2, options)).toBe(0);
    expect(nextMenuIndex("End", 0, options)).toBe(2);
    expect(nextMenuIndex("x", 0, options)).toBeNull();
    expect(nextMenuIndex("ArrowDown", 0, [])).toBeNull();
  });
});

describe("PullToRefresh", () => {
  it("引き量は 0.5 倍で上限があり、しきい値以上で更新する", () => {
    expect(pullDistance(-10)).toBe(0);
    expect(pullDistance(100)).toBe(50);
    expect(pullDistance(1000)).toBe(PULL_MAX);
    expect(shouldRefresh(PULL_THRESHOLD - 1)).toBe(false);
    expect(shouldRefresh(PULL_THRESHOLD)).toBe(true);
  });
  it("子要素と、キーボード用の再読み込みボタンを出す", () => {
    const m = renderToStaticMarkup(
      <PullToRefresh onRefresh={() => {}}>
        <p>中身</p>
      </PullToRefresh>,
    );
    expect(m).toContain("中身");
    expect(m).toContain("再読み込み");
    expect(m).toContain('role="status"');
  });
});

describe("文言", () => {
  it("mobile 区分が登録され、英語・韓国語も引ける", () => {
    expect(CATALOG.mobile).toBeDefined();
    expect(REVIEW_STATUS.mobile).toEqual({ en: "draft", ko: "draft" });
    expect(translate("en", "mobile.tabCases")).toBe("Cases");
    expect(translate("ko", "mobile.openDesktop")).toBe("PC 버전 열기");
  });
});
