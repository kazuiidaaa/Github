import { describe, expect, it } from "vitest";
import { OFFICIAL_FORM_SPECS } from "../lib/documents/officialForms";
import { FILLERS } from "../lib/documents/excelFill";

// 様式の定義（SPECS）と差し込み関数（FILLERS）の追加漏れを検出する。
// SPECS だけ足すと、更新様式の差し込みが別手続の様式として黙って出力されるため。
describe("OFFICIAL_FORM_SPECS と FILLERS の整合", () => {
  const specs = Object.keys(OFFICIAL_FORM_SPECS).sort();
  const fillers = Object.keys(FILLERS).sort();

  it("SPECS にある手続種別は、すべて FILLERS にもある", () => {
    expect(specs.filter((k) => !fillers.includes(k))).toEqual([]);
  });
  it("FILLERS にある手続種別は、すべて SPECS にもある", () => {
    expect(fillers.filter((k) => !specs.includes(k))).toEqual([]);
  });
  it("SPECS の手続種別は、定義内の procedureType と一致する", () => {
    for (const [k, spec] of Object.entries(OFFICIAL_FORM_SPECS)) expect(spec?.procedureType).toBe(k);
  });
});
