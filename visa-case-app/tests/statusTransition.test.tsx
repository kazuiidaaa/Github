import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { currentStatusOf, StatusTransition, statusTransitionParts } from "../components/StatusTransition";
import { CATALOG } from "../lib/i18n/messages";

const html = (procedureType: string, current?: string, target?: string) =>
  renderToStaticMarkup(<StatusTransition procedureType={procedureType} current={current} target={target} />);
const text = (m: string) => m.replace(/<[^>]+>/g, "");

describe("StatusTransition（手続と在留資格の「今 → 申請後」の表示）", () => {
  it("更新は、在留資格を1つだけ示し「（更新）」を添える（矢印なし）", () => {
    const m = html("renewal", "技術・人文知識・国際業務", "留学");
    expect(text(m)).toBe("技術・人文知識・国際業務（更新）");
    expect(m).not.toContain("<svg");
  });

  it("変更は、現在 → 変更後 を示し、矢印に読み上げ名を付ける", () => {
    const m = html("change", "留学", "技術・人文知識・国際業務");
    expect(text(m)).toBe("留学技術・人文知識・国際業務");
    expect(m.indexOf("留学")).toBeLessThan(m.indexOf("<svg"));
    expect(m).toContain('role="img"');
    expect(m).toContain('aria-label="から"');
  });

  it("認定は（入国前）、取得は（出生など）から示す", () => {
    expect(text(html("coe", "留学", "経営・管理"))).toBe("（入国前）経営・管理");
    expect(text(html("acquisition", "", "家族滞在"))).toBe("（出生など）家族滞在");
  });

  it("値のない側は「未入力」と薄く示す", () => {
    const m = html("change", "", "  ");
    expect(m.match(/text-muted">未入力/g)).toHaveLength(2);
    expect(text(html("renewal"))).toBe("未入力（更新）");
  });

  it("その他・未選択は、現在の在留資格だけを示す", () => {
    expect(statusTransitionParts("other", "永住者", "x")).toEqual({ from: { kind: "status", value: "永住者" }, renewal: false });
    expect(text(html("", "永住者"))).toBe("永住者");
  });

  it("狭い画面でも折り返す（flex-wrap・break-words）", () => {
    const m = html("change", "留学", "技術・人文知識・国際業務");
    expect(m).toContain("flex-wrap");
    expect(m).toContain("break-words");
  });

  it("現在の在留資格は、申請人情報の値を優先する", () => {
    expect(currentStatusOf({ applicant: { residenceStatus: "留学" }, currentStatus: "家族滞在" })).toBe("留学");
    expect(currentStatusOf({ applicant: { residenceStatus: "" }, currentStatus: "家族滞在" })).toBe("家族滞在");
  });

  it("文言は3言語すべてにある", () => {
    for (const lang of ["ja", "en", "ko"] as const) {
      const d = CATALOG.display[lang];
      for (const k of ["statusRenewalSuffix", "statusBeforeEntry", "statusByBirth", "statusNotEntered", "statusArrow"] as const) {
        expect(d[k].trim()).not.toBe("");
      }
    }
  });
});
