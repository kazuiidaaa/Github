import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormDetailsForm } from "../components/FormDetailsForm";
import { EMPTY_FORM_DETAILS, SCHOOL_TYPES, type SchoolType } from "../lib/formDetails";
import { schoolTypeNotice } from "../lib/i18n/caseRequirements";
import { evaluate, ruleSetOfCase } from "../lib/requirements/evaluate";
import { RULE_SETS, ruleSetComparedAt } from "../lib/requirements/rules";
import { RYUGAKU_SHEET_TYPES, ryugakuSheetRules } from "../lib/requirements/ryugakuSheets";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord, type ProcedureType } from "../lib/types";

// Issue #420：留学の認定・変更・更新・取得。照合表 ryugaku-procedures-2026-10-24.md。提出書類一覧表（入学先の種類ごと）の項目数・条件を固定する。
type Proc = "coe" | "change" | "renewal" | "acquisition";
const STATUS = "留学";

function make(procedureType: ProcedureType, schoolType: SchoolType | "" = "", cause: "" | "other" = ""): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType, currentStatus: procedureType === "renewal" ? STATUS : "", targetStatus: procedureType === "renewal" ? "" : STATUS,
    memo: "", workflowStatus: "preparing", createdAt: "", updatedAt: "", applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS, schoolType, acquisitionCause: cause },
    requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "", checkMemo: "", checks: [], documents: [],
  };
}
const applicable = (proc: Proc, type: SchoolType | "") => evaluate(make(proc, type, proc === "acquisition" ? "other" : "")).items.filter((i) => i.effective !== "not_required");
const idsOf = (proc: Proc, type: SchoolType | "") => applicable(proc, type).map((i) => i.rule.id);
/** 入学先に当たる規則（同じ書類で表ごとに内容が違う場合は、ryugaku_{key}_2 などになる）。当たらないものは undefined */
const find = (proc: Proc, type: SchoolType, key: string) => applicable(proc, type).find((i) => i.rule.id === `ryugaku_${key}` || i.rule.id.startsWith(`ryugaku_${key}_`));
const sheetIds = (proc: Proc, type: SchoolType) => idsOf(proc, type).filter((id) => id.startsWith("ryugaku_"));

/** 一覧表の項目数（申請書を除く。シートの No. の最大値 − 1。2列の表は両列が「－」の行を除く）。9区分×3手続の27枚がそろっている */
const SHEET_COUNTS: Record<Exclude<Proc, "acquisition">, Record<SchoolType, number>> = {
  coe: {
    "univ-approved": 8, "univ-nonapproved": 15, "vocational-class1": 5, "vocational-class2": 8, "vocational-nonapproved": 13,
    "japanese-nonapproved": 13, "japanese-class1": 5, "japanese-class2": 10, "highschool-below": 20,
  },
  change: {
    "univ-approved": 8, "univ-nonapproved": 15, "vocational-class1": 5, "vocational-class2": 8, "vocational-nonapproved": 13,
    "japanese-nonapproved": 13, "japanese-class1": 5, "japanese-class2": 10, "highschool-below": 19,
  },
  renewal: {
    "univ-approved": 16, "univ-nonapproved": 16, "vocational-class1": 14, "vocational-class2": 14, "vocational-nonapproved": 14,
    "japanese-nonapproved": 13, "japanese-class1": 13, "japanese-class2": 13, "highschool-below": 13,
  },
};
const HAS_SHEET: Record<Proc, SchoolType[]> = {
  coe: [...SCHOOL_TYPES],
  change: [...SCHOOL_TYPES],
  renewal: [...SCHOOL_TYPES],
  acquisition: [...SCHOOL_TYPES],
};
const PROCS: Proc[] = ["coe", "change", "renewal", "acquisition"];

describe("留学の認定・変更・更新・取得（ryugaku-procedures-2026-10-24.md）", () => {
  it("規則集合：入学先の種類で判定する（basis: schoolType。取得は取得の事由も持つ）。手続ごとに引かれる", () => {
    for (const proc of PROCS) {
      const rs = RULE_SETS.find((r) => r.id === `ryugaku_${proc}`)!;
      expect(rs.procedureType).toBe(proc);
      expect(rs.basis).toBe("schoolType");
      expect(rs.alsoBasis).toEqual(proc === "acquisition" ? ["acquisitionCause"] : undefined);
      expect(ruleSetOfCase(make(proc as ProcedureType))?.id).toBe(rs.id);
      expect(ruleSetComparedAt(rs)).toBe("2026-10-24");
    }
  });

  it("書類の内訳：入学先の種類 × 手続の項目数が、一覧表の行数と一致する", () => {
    for (const [proc, byType] of Object.entries(SHEET_COUNTS) as [Proc, Record<SchoolType, number>][]) {
      expect(Object.keys(byType).sort(), proc).toEqual([...SCHOOL_TYPES].sort());
      for (const [type, count] of Object.entries(byType) as [SchoolType, number][]) {
        expect(sheetIds(proc, type).length, `${proc}:${type}`).toBe(count);
      }
    }
  });

  it("取得は、変更・取得用の一覧表のうち「申請時の在留資格に該当する活動に関する資料」だけを除いて準用する", () => {
    for (const type of HAS_SHEET.change) {
      const change = sheetIds("change", type).filter((id) => id !== "ryugaku_activity");
      expect(sheetIds("acquisition", type), type).toEqual(change);
    }
    expect(sheetIds("change", "univ-approved")).toContain("ryugaku_activity");
    expect(sheetIds("acquisition", "univ-approved")).not.toContain("ryugaku_activity");
  });

  it("取得の既存の規則（申請書・写真・旅券の提示・申請取次者・国籍／事由の書類）は残し、案内ページ由来の要確認2行は一覧表に置き換わる", () => {
    const ids = idsOf("acquisition", "japanese-class1");
    for (const id of ["application_form", "photo", "passport_presentation", "agent_identity_document", "cause_proof"]) expect(ids, id).toContain(id);
    const all = RULE_SETS.find((r) => r.id === "ryugaku_acquisition")!.rules.map((r) => r.id);
    expect(all).not.toContain("ryugaku_document_list");
    expect(all).not.toContain("ryugaku_confirmation_form");
  });

  it("認定：大学等（クラスⅠ・Ⅱ）は旅券の身分事項ページ（写し）が必須で、共通の任意の旅券の写しは持たない", () => {
    expect(find("coe", "univ-approved", "passport")?.effective).toBe("required");
    expect(idsOf("coe", "univ-approved")).not.toContain("passport_copy");
    expect(idsOf("coe", "univ-approved").slice(0, 4)).toEqual(["application_form", "photo", "ryugaku_checklist", "ryugaku_passport"]);
  });

  it("条件・要否：○は必須、△は要確認（備考がnote）、－の列は書類を作らない", () => {
    const rule = (proc: Proc, type: SchoolType, id: string) => find(proc, type, id.replace("ryugaku_", ""));
    // 大学等（認定）：日本語能力に係る資料は△。研究内容を証する文書も△
    expect(rule("coe", "univ-approved", "ryugaku_jaAbility")?.effective).toBe("check");
    expect(rule("coe", "univ-approved", "ryugaku_research")?.rule.note).toBe("大学等において、専ら聴講によらない研究生として受け入れられる場合");
    // 専修学校クラスⅠ（認定）：日本語能力に係る資料は○
    expect(rule("coe", "vocational-class1", "ryugaku_jaAbility")?.effective).toBe("required");
    // 通知を受けていない大学等（認定）：経費支弁書など6書類は○
    for (const id of ["ryugaku_expense", "ryugaku_relation", "ryugaku_deposit", "ryugaku_funds", "ryugaku_payerJob", "ryugaku_payerIncome"]) expect(rule("coe", "univ-nonapproved", id)?.effective, id).toBe("required");
    // 専修学校クラスⅡ（認定）：経費支弁書は別表掲載国・地域「－」、同左以外「○」→要確認で列ごとの要否を注記
    const expense = rule("coe", "vocational-class2", "ryugaku_expense")!;
    expect(expense.effective).toBe("check");
    expect(expense.rule.verify).toBe(true);
    expect(expense.rule.note).toContain("別表掲載国・地域＝－、同左以外＝○");
    // 日本語教育機関クラスⅡ（変更）の「提出書類一覧表」は別表掲載国・地域△、同左以外○
    expect(rule("change", "japanese-class2", "ryugaku_checklist")?.rule.note).toContain("別表掲載国・地域＝△（備考欄参照）、同左以外＝○");
    // 高校等（変更）：戸籍は○、経費支弁書・経費支弁者との関係は○、預金残高証明書は△（高校で交換計画なし）、監護の書類は△（中学・小学）
    expect(rule("change", "highschool-below", "ryugaku_koseki")?.effective).toBe("required");
    expect(rule("change", "highschool-below", "ryugaku_expense")?.effective).toBe("required");
    expect(rule("change", "highschool-below", "ryugaku_deposit")?.rule.note).toBe("高校に入学する場合であって、学生交換計画又はこれに準ずる国際交流計画を策定していない場合");
    expect(rule("change", "highschool-below", "ryugaku_guardianReason")?.rule.note).toBe("中学校又は小学校に入学する場合");
    // 高校等（更新）：経費支弁書などは、直近の在留諸申請時から変更が生じている場合の△
    expect(rule("renewal", "highschool-below", "ryugaku_expense")?.rule.note).toBe("直近の在留諸申請時から変更が生じている場合");
    // 更新：在学証明書は○。書類名は表ごとの言い回し
    expect(rule("renewal", "univ-approved", "ryugaku_enrollment")?.rule.name).toBe("在学証明書（入学前に申請する場合は入学許可書）");
    expect(rule("renewal", "highschool-below", "ryugaku_enrollment")?.rule.name).toBe("在学証明書（在学前に申請する場合は入学許可書）");
    // 更新（日本語教育機関クラスⅠ）：滞在費支弁に関する申告書は△（指導を受けている場合）。通知なし・クラスⅡは別表掲載国・地域のみ△で、同左以外は○
    expect(rule("renewal", "japanese-class1", "ryugaku_living")?.effective).toBe("check");
    expect(rule("renewal", "japanese-nonapproved", "ryugaku_living")?.rule.note).toContain("別表掲載国・地域＝△（備考欄参照）、同左以外＝○");
  });

  it("入学先に応じた書類だけが必要になる（他の入学先の書類は不要）", () => {
    expect(find("change", "japanese-class1", "expense")).toBeUndefined();
    expect(find("change", "japanese-nonapproved", "expense")?.effective).toBe("required");
    expect(find("change", "japanese-nonapproved", "lastEdu")?.effective).toBe("required");
    expect(find("change", "japanese-class1", "lastEdu")).toBeUndefined();
    expect(find("change", "japanese-class1", "koseki")).toBeUndefined();
  });

  it("9区分×3手続（変更・取得は同じ一覧）の一覧表がそろっているので、「一覧表は未取得」の行は出ない", () => {
    for (const proc of PROCS) {
      for (const type of SCHOOL_TYPES) {
        expect(idsOf(proc, type), `${proc}:${type}`).not.toContain("ryugaku_sheet_not_obtained");
        expect(sheetIds(proc, type).length, `${proc}:${type}`).toBeGreaterThan(0);
      }
      expect(RYUGAKU_SHEET_TYPES[proc].slice().sort(), proc).toEqual([...SCHOOL_TYPES].sort());
    }
  });

  it("資料が無い組み合わせができたときの仕組み：「掲載なし」とせず、一覧表は未取得の要確認の1行を出す", () => {
    const saved = RYUGAKU_SHEET_TYPES.coe;
    try {
      RYUGAKU_SHEET_TYPES.coe = saved.filter((t) => t !== "vocational-nonapproved");
      const rules = ryugakuSheetRules("coe");
      const row = rules.find((r) => r.id === "ryugaku_sheet_not_obtained");
      expect(row?.schoolTypes).toEqual(["vocational-nonapproved"]);
      expect(row?.level).toBe("check");
      expect(row?.verify).toBe(true);
      expect(row?.name).toContain("未取得");
      expect(row?.note).not.toContain("掲載なし");
      // 一覧表がある入学先の書類には、未取得の行の入学先が混ざらない
      expect(rules.filter((r) => r.id !== "ryugaku_sheet_not_obtained").every((r) => !r.schoolTypes?.includes("vocational-nonapproved"))).toBe(true);
    } finally {
      RYUGAKU_SHEET_TYPES.coe = saved;
    }
  });

  it("入学先が未選択の間は、入学先に共通の書類（申請書・写真・旅券）だけを出し、選択の案内を出す", () => {
    for (const proc of PROCS) {
      const e = evaluate(make(proc, "", proc === "acquisition" ? "other" : ""));
      expect(e.needsSchoolType, proc).toBe(true);
      expect(schoolTypeNotice(e), proc).toBe("caseRequirements.needsSchoolTypeAxes");
      // 9区分すべての表に同じ内容である書類（認定の旅券など）は、入学先に共通の書類なので、未選択でも出る。区分で内容が違う書類は出ない
      for (const i of e.items.filter((i) => i.rule.id.startsWith("ryugaku_"))) expect(i.rule.schoolTypes?.length, `${proc}:${i.rule.id}`).toBe(SCHOOL_TYPES.length);
      expect(e.items.some((i) => i.rule.id === "application_form"), proc).toBe(true);
    }
    expect(evaluate(make("coe", "univ-approved")).needsSchoolType).toBe(false);
  });

  it("他の在留資格・他の手続には影響しない", () => {
    const other = evaluate({ ...make("renewal"), currentStatus: "技術・人文知識・国際業務" });
    expect(other.ruleSet?.id).toBe("gijinkoku_renewal");
    expect(other.needsSchoolType).toBe(false);
    expect(other.items.some((i) => i.rule.id.startsWith("ryugaku_"))).toBe(false);
    // 取得：留学以外の取得は従来どおり
    const acq = evaluate({ ...make("acquisition", "", "other"), targetStatus: "技術・人文知識・国際業務" });
    expect(acq.ruleSet?.id).toBe("gijinkoku_acquisition");
    // 留学の規則集合は、手続の違う他の留学の規則を使わない
    expect(RULE_SETS.filter((r) => r.residenceStatus === "留学").map((r) => r.procedureType).sort()).toEqual(["acquisition", "change", "coe", "renewal"]);
  });

  it("出典：案内ページ（student.html）と一覧表（PDFのURLは番号がなく未確認と明記）", () => {
    for (const proc of PROCS) {
      const rs = RULE_SETS.find((r) => r.id === `ryugaku_${proc}`)!;
      expect(rs.sources.some((s) => s.url === "https://www.moj.go.jp/isa/applications/status/student.html" && s.kind === "page")).toBe(true);
      expect(rs.sources.some((s) => s.title.includes("未確認") && s.title.includes("PDFのURLは番号がなく"))).toBe(true);
    }
  });
});

describe("公式様式項目タブ：入学先の種類の選択", () => {
  const html = (procedureType: ProcedureType) => {
    const c = make(procedureType);
    return renderToStaticMarkup(<FormDetailsForm record={c} />);
  };
  it("留学の認定・変更・更新・取得では、9区分の選択を出す。留学以外では出さない", () => {
    for (const proc of ["coe", "change", "acquisition"] as const) {
      const m = html(proc);
      expect(m, proc).toContain("留学の入学先の種類");
      for (const label of ["大学等（適正校クラスⅠ又はクラスⅡ）", "専修学校・各種学校等（適正校の通知を受けていない）", "日本語教育機関（適正校クラスⅡ）", "高等学校・中学校・小学校"]) expect(m, `${proc}:${label}`).toContain(label);
    }
    const other = renderToStaticMarkup(<FormDetailsForm record={{ ...make("coe"), targetStatus: "技術・人文知識・国際業務" }} />);
    expect(other).not.toContain("留学の入学先の種類");
  });
});
