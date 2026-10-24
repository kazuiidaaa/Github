import { describe, expect, it } from "vitest";
import { EMPTY_FORM_DETAILS, type FormDetails } from "../lib/formDetails";
import { evaluate } from "../lib/requirements/evaluate";
import { RULE_SETS, ruleSetComparedAt } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

// 照合表 acquisition-geijutsu・shukyo・houmu-kaikei・tanki-taizai・tokutei-katsudou-07/08/11（2026-10-19）の、人の判断「推奨のとおり」（2026-10-19）
// Issue #421・#422・#424・#431・#432。興行（#429）は変更なし（ACQUISITION_BY_CAUSE のまま）
type Cause = FormDetails["acquisitionCause"];
type Subtype = FormDetails["tokuteiKatsudoType"];

function make(targetStatus: string, cause: Cause, tokuteiKatsudoType: Subtype = ""): CaseRecord {
  return {
    id: "c1", caseName: "試験", procedureType: "acquisition", currentStatus: "", targetStatus, memo: "", workflowStatus: "preparing", createdAt: "", updatedAt: "",
    applicant: { ...EMPTY_APPLICANT }, employment: { ...EMPTY_EMPLOYMENT }, formDetails: { ...EMPTY_FORM_DETAILS, acquisitionCause: cause, tokuteiKatsudoType },
    requirementStates: {}, customRequirements: [], acceptedDate: "", plannedApplicationDate: "", checkMemo: "", checks: [], documents: [],
  };
}

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);
const ALL: Cause[] = ["", "nationalityLoss", "birth", "other"];
const base = RULE_SETS.find((r) => r.id === "acquisition_by_cause")!;
const gij = RULE_SETS.find((r) => r.id === "gijinkoku_acquisition")!;
const set = (id: string) => RULE_SETS.find((r) => r.id === id)!;
const AGENT_NOTE = "申請人本人以外の方が提出する場合。提出する方の身分を証する文書（申請取次者証明書、戸籍謄本等）の提示";

// 技人国の取得（#396）と同じ共通の扱いを受ける規則集合（短期滞在を除く）
const CASES: { id: string; status: string; subtype?: Subtype; specific: string[] }[] = [
  { id: "geijutsu_acquisition", status: "芸術", specific: ["geijutsu_activity_documents", "geijutsu_resume", "geijutsu_achievements"] },
  { id: "shukyo_acquisition", status: "宗教", specific: ["shukyo_dispatch_letter", "shukyo_organization_overview"] },
  { id: "houmu_kaikei_acquisition", status: "法律・会計業務", specific: ["legal_accounting_license"] },
  {
    id: "tokutei_kenkyu_acquisition",
    status: "特定活動",
    subtype: "tokuteiKenkyu",
    specific: ["organization_brochure", "registry_certificate", "foreign_staff_list", "consent_form", "activity_documents", "career_documents"],
  },
  {
    id: "daigaku_sotsugyo_acquisition",
    status: "特定活動",
    subtype: "daigakuSotsugyo",
    specific: ["labor_conditions_document", "education_documents", "japanese_ability", "business_description", "representative_declaration"],
  },
  {
    id: "tokutei_joho_acquisition",
    status: "特定活動",
    subtype: "tokuteiJoho",
    specific: ["organization_brochure", "registry_certificate", "foreign_staff_list", "consent_form", "activity_documents"],
  },
];

describe("evaluate: 芸術・宗教・法律・会計業務・特定活動の在留資格取得許可申請（共通の扱い）", () => {
  for (const c of CASES) {
    const rs = set(c.id);
    const run = (cause: Cause) => evaluate(make(c.status, cause, c.subtype ?? ""));

    it(`${c.id}：引かれ、題名に「一部のみ整備」と示す`, () => {
      expect(run("other").ruleSet?.id).toBe(c.id);
      expect(rs.title).toContain("（一部のみ整備）");
      expect(rs.basis).toBe("acquisitionCause");
      expect(rs.alsoBasis).toBeUndefined();
    });

    it(`${c.id}：出生の3書類・活動に応じた資料・旅券の理由書を外し、出生は「その事由を証する書類」。写真・申請取次者・事由の注記は技人国の取得と同じ`, () => {
      for (const id of ["birth_certificate", "parents_questionnaire", "household_residence_certificate", "activity_materials", "passport_reason_statement"]) {
        expect(rs.rules.some((r) => r.id === id), id).toBe(false);
      }
      for (const id of ["photo", "cause_proof", "agent_identity_document"]) {
        expect(rs.rules.find((r) => r.id === id), id).toEqual(gij.rules.find((r) => r.id === id));
      }
      expect(rs.rules.find((r) => r.id === "photo")!.name).toBe("写真（40mm×30mm）");
      expect(rs.rules.find((r) => r.id === "agent_identity_document")!.note).toBe(AGENT_NOTE);
      expect(rs.rules.find((r) => r.id === "cause_proof")!.note).not.toContain("日米地位協定");
      expect(ids(run("birth"), "required")).toContain("cause_proof");
      for (const cause of ALL) expect(ids(run(cause), "required"), cause).toContain("photo");
    });

    it(`${c.id}：資格に固有の書類は、全事由（未選択を含む）で必須`, () => {
      for (const cause of ALL) {
        const required = ids(run(cause), "required");
        for (const id of c.specific) expect(required, `${cause}:${id}`).toContain(id);
      }
      for (const id of c.specific) {
        const rule = rs.rules.find((r) => r.id === id)!;
        expect(rule.causes, id).toEqual(["nationalityLoss", "birth", "other"]);
        expect(rule.categories, id).toBeUndefined();
      }
    });

    it(`${c.id}：出典は案内ページ（2026-10-19）・手続案内・申請書様式（日付なし）。URLは重複しない`, () => {
      expect(rs.sources.filter((s) => s.kind === "page" && s.comparedAt === "2026-10-19")).toHaveLength(1);
      expect(rs.sources.find((s) => s.url.endsWith("procedures/16-10.html"))).toMatchObject({ kind: "page" });
      expect(rs.sources.find((s) => s.url.endsWith("930004121.xlsx"))?.comparedAt).toBeUndefined();
      expect(ruleSetComparedAt(rs)).toBe("2026-10-19");
      expect(new Set(rs.sources.map((s) => s.url)).size).toBe(rs.sources.length);
    });
  }

  it("上書き・削除しない書類は ACQUISITION_BY_CAUSE のまま（芸術・本邦大学等卒業者の旅券の提示は除く）", () => {
    for (const c of CASES) {
      const keep = ["application_form", "nationality_proof", ...(["geijutsu_acquisition", "daigaku_sotsugyo_acquisition"].includes(c.id) ? [] : ["passport_presentation"])];
      for (const id of keep) expect(set(c.id).rules.find((r) => r.id === id), `${c.id}:${id}`).toBe(base.rules.find((r) => r.id === id));
    }
  });
});

describe("芸術（#421）", () => {
  const rs = set("geijutsu_acquisition");
  it("R-1：活動の内容等の資料は必須の1行。(1)(2)の別と「適宜」を注記に書く", () => {
    const r = rs.rules.find((x) => x.id === "geijutsu_activity_documents")!;
    expect(r.level).toBe("required");
    for (const w of ["(1)公私の機関又は個人との契約に基づいて", "(2)公私の機関又は個人との契約に基づかないで", "適宜"]) expect(r.note, w).toContain(w);
  });
  it("R-2：履歴書と業績の資料（5種のいずれか）", () => {
    expect(rs.rules.find((x) => x.id === "geijutsu_resume")?.name).toBe("芸術上の活動歴を詳細に記載した履歴書");
    const a = rs.rules.find((x) => x.id === "geijutsu_achievements")!;
    for (const w of ["次のいずれか", "推薦状", "報道", "入賞、入選", "目録", "準ずるもの"]) expect(a.note, w).toContain(w);
  });
  it("R-6：旅券の提示は名称・区分を変えず、注記に原文の「パスポート及び在留カード 提示」", () => {
    const p = rs.rules.find((x) => x.id === "passport_presentation")!;
    expect(p.name).toBe(base.rules.find((x) => x.id === "passport_presentation")!.name);
    expect(p.level).toBe("required");
    expect(p.note).toContain("「パスポート及び在留カード 提示」");
  });
  it("R-10：出典は芸術のページ（人が確認した URL。2026-10-24）", () => {
    expect(rs.sources[0]).toMatchObject({ title: "在留資格「芸術」在留資格取得許可申請（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/artist.html", kind: "page" });
  });
});

describe("宗教（#422）", () => {
  const rs = set("shukyo_acquisition");
  it("R-10：出典は宗教のページ（人が確認した URL。2026-10-24）", () => {
    expect(rs.sources[0]).toMatchObject({ title: "在留資格「宗教」在留資格取得許可申請（出入国在留管理庁）", url: "https://www.moj.go.jp/isa/applications/status/religiousactivities.html", kind: "page" });
  });
  it("R-1・R-2：派遣状等と機関の概要は必須。注記に「適宜」", () => {
    for (const id of ["shukyo_dispatch_letter", "shukyo_organization_overview"]) {
      const r = rs.rules.find((x) => x.id === id)!;
      expect(r.level, id).toBe("required");
      expect(r.note, id).toBe("適宜");
    }
    expect(rs.rules.find((x) => x.id === "shukyo_organization_overview")!.name).toContain("（宗派、沿革、代表者名、組織、施設、信者数等）");
  });
  it("R-3：地位及び職歴の文書は要確認。派遣状等に記載があれば不要。名称に「（提示）」を付けない", () => {
    const r = rs.rules.find((x) => x.id === "shukyo_status_career")!;
    expect(r.level).toBe("check");
    expect(r.name).not.toContain("提示");
    expect(r.note).toContain("派遣状等に地位・職歴が記載されていれば不要");
    for (const cause of ALL) expect(ids(evaluate(make("宗教", cause)), "check"), cause).toContain("shukyo_status_career");
  });
});

describe("法律・会計業務（#424）", () => {
  it("R-1：認定・変更と同じ名称・注記の資格の証明文書を、全事由の必須にする", () => {
    const r = set("houmu_kaikei_acquisition").rules.find((x) => x.id === "legal_accounting_license")!;
    const coe = set("houmu_kaikei_coe").rules.find((x) => x.id === "legal_accounting_license")!;
    expect(r.name).toBe(coe.name);
    expect(r.note).toBe(coe.note);
    expect(r.level).toBe("required");
  });
  it("R-8：出典は法律・会計業務のページ", () => {
    expect(set("houmu_kaikei_acquisition").sources[0].url).toBe("https://www.moj.go.jp/isa/applications/status/legalaccountingservices.html");
  });
});

describe("短期滞在（#431）", () => {
  const rs = set("tanki_taizai_acquisition");
  const run = (cause: Cause) => evaluate(make("短期滞在", cause));
  it("原文の5項目と一対一（申請書・旅券の提示・理由書・交通手段の資料・申請取次者の書類）", () => {
    expect(rs.rules.map((r) => r.id)).toEqual(["application_form", "passport_presentation", "tanki_reason_statement", "tanki_departure_transport", "agent_identity_document"]);
    expect(run("other").ruleSet?.id).toBe("tanki_taizai_acquisition");
  });
  it("R-1：理由書は必須、交通手段の資料は要確認（注記「適宜。提示」）", () => {
    for (const cause of ALL) {
      expect(ids(run(cause), "required"), cause).toEqual(["application_form", "passport_presentation", "tanki_reason_statement"]);
      expect(ids(run(cause), "check"), cause).toEqual(["tanki_departure_transport", "agent_identity_document"]);
    }
    expect(rs.rules.find((r) => r.id === "tanki_departure_transport")?.note).toBe("適宜。提示");
  });
  it("R-2・R-3：事由別の書類と写真は外す（写真は例外。中長期在留者とならない）", () => {
    for (const id of ["photo", "nationality_proof", "cause_proof", "birth_certificate"]) expect(rs.rules.some((r) => r.id === id), id).toBe(false);
  });
  it("R-5：申請取次者の書類の注記は原文のとおり", () => {
    expect(rs.rules.find((r) => r.id === "agent_identity_document")?.note).toBe(AGENT_NOTE);
  });
  it("R-7：ページの URL は未確認のため出典に入れない（手続案内と申請書様式のみ）", () => {
    expect(rs.sources.map((s) => s.url)).toEqual(["https://www.moj.go.jp/isa/applications/procedures/16-10.html", "https://www.moj.go.jp/isa/content/930004121.xlsx"]);
  });
});

describe("特定活動（#432）", () => {
  it("種別ごとに取得の規則集合に当たり、種別が未選択・その他は ACQUISITION_BY_CAUSE のまま", () => {
    expect(evaluate(make("特定活動", "other", "tokuteiKenkyu")).ruleSet?.id).toBe("tokutei_kenkyu_acquisition");
    expect(evaluate(make("特定活動", "other", "daigakuSotsugyo")).ruleSet?.id).toBe("daigaku_sotsugyo_acquisition");
    expect(evaluate(make("特定活動", "other", "tokuteiJoho")).ruleSet?.id).toBe("tokutei_joho_acquisition");
    for (const t of ["", "other"] as Subtype[]) expect(evaluate(make("特定活動", "other", t)).ruleSet?.id, t || "未選択").toBe("acquisition_by_cause");
    expect(evaluate(make("特定活動", "other", "")).needsSubtype).toBe(true);
  });

  it("07 R-8：転職した場合の2行は要確認（注記「転職した場合のみ」）。準ずる文書も要確認", () => {
    const rs = set("tokutei_kenkyu_acquisition");
    for (const id of ["resignation_certificate", "resident_tax_certificates", "organization_equivalent_documents"]) {
      expect(rs.rules.find((r) => r.id === id)?.level, id).toBe("check");
    }
    expect(rs.rules.find((r) => r.id === "resignation_certificate")?.note).toBe("転職した場合のみ");
    expect(rs.rules.find((r) => r.id === "resident_tax_certificates")?.note).toMatch(/^転職した場合のみ。/);
  });

  it("08 R-8・R-9：派遣の資料と契約機関の変更の2行は要確認。退職証明書は原文の「前契約機関」（変更の名称は変えない）", () => {
    const rs = set("tokutei_joho_acquisition");
    for (const id of ["dispatch_documents", "resignation_certificate", "resident_tax_certificates"]) expect(rs.rules.find((r) => r.id === id)?.level, id).toBe("check");
    expect(rs.rules.find((r) => r.id === "resignation_certificate")).toMatchObject({ name: "前契約機関が作成した退職証明書（退職日を明記したもの）", note: "契約機関が変更された場合のみ" });
    expect(set("tokutei_joho_change").rules.find((r) => r.id === "resignation_certificate")?.name).toBe("前雇用先機関が作成した退職証明書（退職日を明記したもの）");
    // 活動の内容等は認定・変更の選択肢（採用通知書を含む）
    expect(rs.rules.find((r) => r.id === "activity_documents")?.note).toContain("採用通知書");
  });

  it("11 R-8：旅券の提示の名称は「パスポート及び在留カード（提示）」。在留カードを持たない場合は行政書士が確認。R-9：家族の列の書類は入れない", () => {
    const rs = set("daigaku_sotsugyo_acquisition");
    const p = rs.rules.find((r) => r.id === "passport_presentation")!;
    expect(p.name).toBe("パスポート及び在留カード（提示）");
    expect(p.level).toBe("required");
    expect(p.note).toContain("行政書士が確認");
    expect(rs.rules.find((r) => r.id === "employment_reason")?.level).toBe("check");
    expect(rs.rules.some((r) => r.name.includes("扶養者"))).toBe(false);
  });
});

describe("変えないもの", () => {
  it("ACQUISITION_BY_CAUSE は変えない。興行（#429）・未整備の資格の取得は ACQUISITION_BY_CAUSE のまま", () => {
    expect(base.checkedAt).toBe("2026-10-04");
    expect(base.sources.every((s) => s.comparedAt === undefined)).toBe(true);
    for (const status of ["興行", ""]) expect(evaluate(make(status, "other")).ruleSet?.id, status).toBe("acquisition_by_cause");
  });

  it("規則集合：ACQUISITION_BY_CAUSE から引き継ぐ書類は verify: true のまま。規則の id は重複しない", () => {
    const fromBase = new Set(base.rules.map((r) => r.id));
    for (const id of [...CASES.map((c) => c.id), "tanki_taizai_acquisition"]) {
      const rs = set(id);
      expect(rs.rules.filter((r) => fromBase.has(r.id)).every((r) => r.verify === true), id).toBe(true);
      const rids = rs.rules.map((r) => r.id);
      expect(new Set(rids).size, id).toBe(rids.length);
    }
  });
});
