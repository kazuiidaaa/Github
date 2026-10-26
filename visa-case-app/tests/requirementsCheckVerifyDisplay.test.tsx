import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { resultLabelKey, Row } from "../components/RequirementsPanel";
import type { EvaluatedItem } from "../lib/requirements/evaluate";

const item = (result: "check" | "required", rule: { note?: string; verify?: boolean }): EvaluatedItem =>
  ({
    rule: { id: "x", name: "試験書類", party: "applicant", level: "check", ...rule },
    result,
    effective: result,
    state: { status: "not_received" },
    reasonCode: { kind: "applicantTypeCommon" },
  }) as unknown as EvaluatedItem;

const html = (i: EvaluatedItem) =>
  renderToStaticMarkup(
    <table>
      <tbody>
        <Row item={i} today="2026-01-01" onPatch={() => {}} onGoDocuments={() => {}} />
      </tbody>
    </table>,
  );

describe("check と verify の表示（担当者向け必要書類）", () => {
  it("check で note あり：「該当する場合のみ」", () => {
    expect(resultLabelKey("check", "条件")).toBe("caseRequirements.resultCheckConditional");
    expect(html(item("check", { note: "条件" }))).toContain("該当する場合のみ");
  });
  it("check で note なし：「状況により必要」", () => {
    expect(resultLabelKey("check")).toBe("caseRequirements.resultCheckSituational");
    expect(html(item("check", {}))).toContain("状況により必要");
  });
  it("check 以外の判定の文言は変えない", () => {
    expect(resultLabelKey("required", "条件")).toBe("caseRequirements.resultRequired");
    expect(html(item("required", {}))).not.toContain("該当する場合のみ");
  });
  it("verify は非表示にせず「内容要確認」を出し、check の黄色の見た目とは分ける", () => {
    const v = html(item("check", { note: "条件", verify: true }));
    expect(v).toContain("内容要確認");
    expect(v).toContain("試験書類");
    expect(html(item("check", { note: "条件" }))).not.toContain("内容要確認");
    const m = v.match(/<span class="[^"]*">(?:(?!<\/span>).)*内容要確認/);
    const c = v.match(/<span class="[^"]*">(?:(?!<\/span>).)*該当する場合のみ/);
    expect(m?.[0].match(/class="([^"]*)"/)?.[1]).not.toBe(c?.[0].match(/class="([^"]*)"/)?.[1]);
  });
});
