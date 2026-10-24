import { describe, expect, it } from "vitest";
import { CHANGE_TEMPLATE_PATHS } from "../lib/documents/excelFill/change";
import { COE_TEMPLATE_PATHS } from "../lib/documents/excelFill/coe";
import { RENEWAL_TEMPLATE_PATHS } from "../lib/documents/excelFill/renewal";
import { OFFICIAL_FORM_SPECS, officialFormCodeFor, officialFormFor, type OfficialFormSelectInput } from "../lib/documents/officialForms";
import { EMPTY_FORM_DETAILS } from "../lib/formDetails";
import type { CoeFormCode } from "../lib/hspForm";
import { EMPTY_APPLICANT, type ProcedureType } from "../lib/types";

// 生成書類の「対象の公式様式」欄が、差し込みに実際に使う様式（I・L・M・N・U）を指すことを確かめる（Issue #419）。値はすべてダミー。

function input(o: { currentStatus?: string; residenceStatus?: string; targetStatus?: string; hspActivity?: string } = {}): OfficialFormSelectInput {
  return {
    applicant: { ...EMPTY_APPLICANT, residenceStatus: o.residenceStatus ?? "" },
    formDetails: { ...EMPTY_FORM_DETAILS, hspActivity: o.hspActivity ?? "" },
    currentStatus: o.currentStatus ?? "",
    targetStatus: o.targetStatus ?? "",
  };
}

const cases: { name: string; p: ProcedureType; i: OfficialFormSelectInput; code: CoeFormCode | undefined; fileId: string }[] = [
  { name: "更新・技人国は様式 N", p: "renewal", i: input({ currentStatus: "技術・人文知識・国際業務" }), code: "N", fileId: "930004095" },
  { name: "更新・経営・管理は新しい様式 M", p: "renewal", i: input({ currentStatus: "経営・管理" }), code: "M", fileId: "001448694" },
  { name: "更新・申請人情報だけ経営・管理でも様式 M", p: "renewal", i: input({ currentStatus: "留学", residenceStatus: "経営・管理" }), code: "M", fileId: "001448694" },
  { name: "更新・教授は様式 I（ファイル番号は未照合）", p: "renewal", i: input({ currentStatus: "教授" }), code: "I", fileId: "未照合" },
  { name: "更新・1号ハ×経営・管理は様式 M", p: "renewal", i: input({ currentStatus: "高度専門職（1号ハ）", hspActivity: "経営・管理" }), code: "M", fileId: "001448694" },
  { name: "更新・号が未選択の高度専門職は様式 N", p: "renewal", i: input({ currentStatus: "高度専門職" }), code: "N", fileId: "930004095" },
  { name: "変更・経営・管理は新しい様式 M", p: "change", i: input({ targetStatus: "経営・管理" }), code: "M", fileId: "001448692" },
  { name: "変更・報道は様式 L", p: "change", i: input({ targetStatus: "報道" }), code: "L", fileId: "未照合" },
  { name: "変更・医療は様式 U", p: "change", i: input({ targetStatus: "医療" }), code: "U", fileId: "未照合" },
  { name: "変更・技人国は様式 N", p: "change", i: input({ targetStatus: "技術・人文知識・国際業務" }), code: "N", fileId: "930004065" },
  { name: "認定・経営・管理は新しい様式 M", p: "coe", i: input({ targetStatus: "経営・管理" }), code: "M", fileId: "001448690" },
  { name: "認定・1号イ×教授は様式 I", p: "coe", i: input({ targetStatus: "高度専門職（1号イ）", hspActivity: "教授" }), code: "I", fileId: "930004028" },
  { name: "認定・企業内転勤は様式 L", p: "coe", i: input({ targetStatus: "企業内転勤" }), code: "L", fileId: "930004032" },
  { name: "認定・法律・会計業務は様式 U", p: "coe", i: input({ targetStatus: "法律・会計業務" }), code: "U", fileId: "930004059" },
  { name: "認定・活動が未選択の高度専門職は様式 N", p: "coe", i: input({ targetStatus: "高度専門職（1号ロ）" }), code: "N", fileId: "930004030" },
  { name: "取得は様式が1つ", p: "acquisition", i: input({ targetStatus: "経営・管理" }), code: undefined, fileId: "930004121" },
  { name: "その他は更新の様式（経営・管理なら様式 M）", p: "other", i: input({ currentStatus: "経営・管理" }), code: "M", fileId: "001448694" },
];

describe("対象の公式様式（officialFormFor）", () => {
  for (const c of cases) {
    it(c.name, () => {
      expect(officialFormCodeFor(c.p, c.i)).toBe(c.code);
      expect(officialFormFor(c.p, c.i).fileId).toBe(c.fileId);
    });
  }

  it("様式 N 以外は、名称に様式の別が入り、様式 N と名称が異なる", () => {
    const m = officialFormFor("change", input({ targetStatus: "経営・管理" }));
    expect(m.formName).toContain("様式 M");
    expect(m.sourceUrl).toBe("https://www.moj.go.jp/isa/content/001448692.xlsx");
    expect(officialFormFor("change", input({ targetStatus: "技術・人文知識・国際業務" }))).toEqual(OFFICIAL_FORM_SPECS.change?.form);
  });

  it("返り値は複製（定義を書き換えない）", () => {
    const f = officialFormFor("coe", input({ targetStatus: "経営・管理" }));
    f.fileId = "x";
    expect(OFFICIAL_FORM_SPECS.coe?.variants?.M.fileId).toBe("001448690");
  });

  it("ファイル番号が分かっている様式は、差し込み元テンプレートのファイル名と一致する", () => {
    const paths: Record<"renewal" | "change" | "coe", Record<CoeFormCode, string>> = {
      renewal: RENEWAL_TEMPLATE_PATHS,
      change: CHANGE_TEMPLATE_PATHS,
      coe: COE_TEMPLATE_PATHS,
    };
    for (const p of ["renewal", "change", "coe"] as const) {
      const spec = OFFICIAL_FORM_SPECS[p]!;
      const forms: [CoeFormCode, { fileId: string }][] = [["N", spec.form], ...(Object.entries(spec.variants ?? {}) as [CoeFormCode, { fileId: string }][])];
      for (const [code, f] of forms) {
        if (f.fileId === "未照合") continue;
        expect(paths[p][code], `${p} ${code}`).toContain(`_${f.fileId}.xlsx`);
      }
    }
  });
});
