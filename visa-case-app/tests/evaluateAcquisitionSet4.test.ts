import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { RULE_SETS, ruleSetComparedAt } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

// 照合表 acquisition-koyo・ginoujisshu・ryugaku（2026-10-24）の、人の判断「推奨のとおり」（2026-10-24）。Issue #420
type Cause = FormDetails["acquisitionCause"];

function make(targetStatus: string, cause: Cause): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType: "acquisition", currentStatus: "", targetStatus, memo: "", workflowStatus: "preparing", createdAt: "", updatedAt: "",
    applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT }, formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: cause },
    requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "", checkMemo: "", checks: [], documents: [],
  };
}

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);
const ALL: Cause[] = ["", "nationalityLoss", "birth", "other"];
const base = RULE_SETS.find((r) => r.id === "acquisition_by_cause")!;
const gij = RULE_SETS.find((r) => r.id === "gijinkoku_acquisition")!;
const set = (id: string) => RULE_SETS.find((r) => r.id === id)!;
const AGENT_NOTE = "申請人本人以外の方が提出する場合。提出する方の身分を証する文書（申請取次者証明書、戸籍謄本等）の提示";

const CASES = [
  { id: "koyo_acquisition", status: "公用", page: "official.html", hasPhoto: false, specific: ["koyo_diplomatic_note"], order: ["application_form", "passport_presentation", "koyo_diplomatic_note", "agent_identity_document", "nationality_proof", "cause_proof"] },
  {
    id: "ginou_jisshu_acquisition",
    status: "技能実習",
    page: "technicalinterntraining.html",
    hasPhoto: true,
    specific: ["ginou_jisshu_plan_certificate", "resident_tax_certificates"],
    order: ["application_form", "photo", "passport_presentation", "ginou_jisshu_plan_certificate", "resident_tax_certificates", "agent_identity_document", "nationality_proof", "cause_proof"],
  },
  {
    id: "ryugaku_acquisition",
    status: "留学",
    page: "student.html",
    hasPhoto: true,
    specific: ["ryugaku_document_list", "ryugaku_confirmation_form"],
    order: ["application_form", "photo", "passport_presentation", "ryugaku_document_list", "ryugaku_confirmation_form", "agent_identity_document", "nationality_proof", "cause_proof"],
  },
];

describe("evaluate: 公用・技能実習・留学の在留資格取得許可申請（#420）", () => {
  for (const c of CASES) {
    const rs = set(c.id);
    const run = (cause: Cause) => evaluate(make(c.status, cause));

    it(`${c.id}：引かれ、題名に「一部のみ整備」と示す。原文の並びに合わせる`, () => {
      for (const cause of ALL) expect(run(cause).ruleSet?.id, cause).toBe(c.id);
      expect(rs.title).toContain("（一部のみ整備）");
      expect(rs.basis).toBe("acquisitionCause");
      expect(rs.alsoBasis).toBeUndefined();
      expect(rs.rules.map((r) => r.id)).toEqual(c.order);
    });

    it(`${c.id}：出生の3書類・活動に応じた資料・旅券の理由書を外し、事由・申請取次者の注記は技人国の取得と同じ`, () => {
      for (const id of ["birth_certificate", "parents_questionnaire", "household_residence_certificate", "activity_materials", "passport_reason_statement"]) {
        expect(rs.rules.some((r) => r.id === id), id).toBe(false);
      }
      for (const id of ["cause_proof", "agent_identity_document"]) expect(rs.rules.find((r) => r.id === id), id).toEqual(gij.rules.find((r) => r.id === id));
      expect(rs.rules.find((r) => r.id === "agent_identity_document")!.note).toBe(AGENT_NOTE);
      expect(rs.rules.find((r) => r.id === "cause_proof")!.note).not.toContain("日米地位協定");
      expect(ids(run("birth"), "required")).toContain("cause_proof");
      for (const id of ["application_form", "nationality_proof", "passport_presentation"]) expect(rs.rules.find((r) => r.id === id), id).toBe(base.rules.find((r) => r.id === id));
    });

    it(`${c.id}：写真は${c.hasPhoto ? "「写真（40mm×30mm）」を全事由の必須（技人国と同じ）" : "外す（中長期在留者とならない在留資格。原文に項目が無い）"}`, () => {
      if (c.hasPhoto) {
        expect(rs.rules.find((r) => r.id === "photo")).toEqual(gij.rules.find((r) => r.id === "photo"));
        for (const cause of ALL) expect(ids(run(cause), "required"), cause).toContain("photo");
      } else {
        expect(rs.rules.some((r) => r.id === "photo")).toBe(false);
      }
    });

    it(`${c.id}：固有の書類は全事由（未選択を含む）で表示され、事由だけで判定する`, () => {
      for (const cause of ALL) {
        const shown = run(cause).items.map((i) => i.rule.id);
        for (const id of c.specific) expect(shown, `${cause}:${id}`).toContain(id);
      }
      for (const id of c.specific) {
        const rule = rs.rules.find((r) => r.id === id)!;
        expect(rule.causes, id).toEqual(["nationalityLoss", "birth", "other"]);
        expect(rule.categories, id).toBeUndefined();
        expect(rule.verify, id).toBe(true);
      }
    });

    it(`${c.id}：出典はページの URL（人が確認。2026-10-24）・手続案内・申請書様式（日付なし）。URLは重複しない`, () => {
      expect(rs.sources[0]).toMatchObject({ title: `在留資格「${c.status}」在留資格取得許可申請（出入国在留管理庁）`, url: `https://www.moj.go.jp/isa/applications/status/${c.page}`, kind: "page", comparedAt: "2026-10-24" });
      expect(rs.sources.find((s) => s.url.endsWith("procedures/16-10.html"))).toMatchObject({ kind: "page" });
      expect(rs.sources.find((s) => s.url.endsWith("930004121.xlsx"))?.comparedAt).toBeUndefined();
      expect(ruleSetComparedAt(rs)).toBe("2026-10-24");
      expect(rs.checkedAt).toBe("2026-10-24");
      expect(new Set(rs.sources.map((s) => s.url)).size).toBe(rs.sources.length);
    });
  }

  it("公用 KO-1：口上書等は全事由の必須。注記「1通」", () => {
    const r = set("koyo_acquisition").rules.find((x) => x.id === "koyo_diplomatic_note")!;
    expect(r.name).toBe("口上書その他外国政府又は国際機関が発行した身分及び用務を証する文書");
    expect(r.level).toBe("required");
    expect(r.note).toBe("1通");
    for (const cause of ALL) expect(ids(evaluate(make("公用", cause)), "required"), cause).toContain("koyo_diplomatic_note");
  });

  it("技能実習 GJ-1・GJ-2・GJ-9：計画の書類と住民税の証明書は必須。号・イロの入力欄は無く、区分は注記で案内し、例の「２号イ」は書かない", () => {
    const rs = set("ginou_jisshu_acquisition");
    const plan = rs.rules.find((x) => x.id === "ginou_jisshu_plan_certificate")!;
    expect(plan.level).toBe("required");
    for (const w of ["技能実習法第8条第1項", "変更の認定があったときは変更後のもの", "1号〜3号", "企業単独型・団体監理型"]) expect(plan.note, w).toContain(w);
    expect(plan.note).not.toContain("２号イ");
    expect(plan.note).not.toContain("2号イ");
    const tax = rs.rules.find((x) => x.id === "resident_tax_certificates")!;
    expect(tax.level).toBe("required");
    expect(tax.name).toBe(set("education_renewal").rules.find((x) => x.id === "resident_tax_certificates")!.name);
    for (const w of ["各1通", "1月1日現在", "いずれか一方", "最寄りの地方出入国在留管理官署"]) expect(tax.note, w).toContain(w);
    for (const cause of ALL) expect(ids(evaluate(make("技能実習", cause)), "required"), cause).toEqual(expect.arrayContaining(["ginou_jisshu_plan_certificate", "resident_tax_certificates"]));
  });

  it("技能の取得の規則集合は技能実習に当たらない", () => {
    expect(evaluate(make("技能", "other")).ruleSet?.id).toBe("gino_acquisition");
  });

  it("留学 RY-1・RY-3・RY-11：一覧表は要確認の1行。書類の名前は出さず、原文の言葉で案内する。入力欄は無い", () => {
    const rs = set("ryugaku_acquisition");
    const r = rs.rules.find((x) => x.id === "ryugaku_document_list")!;
    expect(r.level).toBe("check");
    expect(r.name).toBe("教育機関の種類と適正校の区分に応じた提出書類一覧表に掲げる資料");
    for (const w of ["クラスⅠ・クラスⅡ・通知を受けていない機関", "１在留資格取得許可申請書及び３申請時の在留資格に該当する活動に関する資料を除いて準用", "留意事項・別表・経費支弁書・奨学金の給付に関する証明書一覧", "入管庁の留学のページで確認する"]) {
      expect(r.note, w).toContain(w);
    }
    expect(rs.categoryDefinition).toBeUndefined();
    for (const cause of ALL) expect(ids(evaluate(make("留学", cause)), "check"), cause).toContain("ryugaku_document_list");
  });

  it("留学 RY-2：各種確認書（別紙）は要確認。教育機関が作成する", () => {
    const r = set("ryugaku_acquisition").rules.find((x) => x.id === "ryugaku_confirmation_form")!;
    expect(r.level).toBe("check");
    expect(r.party).toBe("organization");
    for (const w of ["在籍予定又は在籍中の教育機関が作成する", "最新様式", "前回の在留諸申請から在籍する教育機関に変更がない方", "令和8年6月以前に申請する場合は従前の各種確認書"]) expect(r.note, w).toContain(w);
  });

  it("ACQUISITION_BY_CAUSE は変えない", () => {
    expect(base.checkedAt).toBe("2026-10-04");
    expect(base.sources.every((s) => s.comparedAt === undefined)).toBe(true);
  });
});
