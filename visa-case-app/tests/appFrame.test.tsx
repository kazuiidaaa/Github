import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
// 枠の出し分けだけを見るため、中身は目印に差し替える（AuthGate は children を包む目印を出す）
vi.mock("../components/AuthGate", () => ({ AuthGate: ({ children }: { children: React.ReactNode }) => <div data-gate>{children}</div> }));
vi.mock("../components/Header", () => ({ Header: () => <header data-pc-header /> }));
vi.mock("../components/Footer", () => ({ Footer: () => <footer data-pc-footer /> }));
vi.mock("../components/PageTransition", () => ({ PageTransition: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("../components/StoreErrorBanner", () => ({ StoreErrorBanner: () => null }));

import { AppFrame } from "../components/AppFrame";

function html(pathname: string): string {
  nav.pathname = pathname;
  return renderToStaticMarkup(
    <AppFrame>
      <p id="page">本文</p>
    </AppFrame>,
  );
}

describe("AppFrame（パスによる枠の出し分け）", () => {
  it("PC 版（/cases）は、従来どおりヘッダー・max-w-6xl の本文・フッターを出し、本文は AuthGate の内側", () => {
    const m = html("/cases");
    expect(m).toContain("data-pc-header");
    expect(m).toContain("data-pc-footer");
    expect(m).toContain("max-w-6xl");
    expect(m).toMatch(/<main id="main"[^>]*><div data-gate="true">.*<p id="page">/);
  });
  it("iPhone 版（/m 配下）は、PC 版の枠を出さず、本文は AuthGate の内側に入る", () => {
    for (const p of ["/m", "/m/cases", "/m/cases/new"]) {
      const m = html(p);
      expect(m).not.toContain("data-pc-header");
      expect(m).not.toContain("data-pc-footer");
      expect(m).not.toContain("max-w-6xl");
      expect(m).toMatch(/<div data-gate="true">.*<p id="page">/);
    }
  });
  it("/mail など /m で始まる別パスは、PC 版の枠", () => {
    expect(html("/mail")).toContain("data-pc-header");
  });
});
