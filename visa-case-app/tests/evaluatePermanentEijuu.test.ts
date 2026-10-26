import { describe, expect, it } from "vitest";
import { EIJUU_TYPES, EMPTY_FORM_DETAILS, normalizeFormDetails, type EijuuType } from "../lib/formDetails";
import { eijuuTypeNotice, reasonText, jaT } from "../lib/i18n/caseRequirements";
import { evaluate } from "../lib/requirements/evaluate";
import { RULE_SETS, eijuuTypesOf, ruleSetComparedAt } from "../lib/requirements/rules";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, PROCEDURE_TYPES, procedureNeedsTarget, type CaseRecord } from "../lib/types";

// Issue #420：照合表 eijuu-2026-10-24.md（永住許可申請。提出書類一覧表4点）。人の判断は未了で、推奨のとおりに実装した

function make(procedureType: CaseRecord["procedureType"], currentStatus: string, eijuuType: EijuuType | "" = ""): CaseRecord {
  return {
    id: "c1",
    caseName: "試験",
    procedureType,
    currentStatus,
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT },
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS, eijuuType },
    requirementStates: {},
    customRequirements: [],
    acceptedDate: "",
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
  };
}

const ids = (e: ReturnType<typeof evaluate>, r: string) => e.items.filter((i) => i.effective === r).map((i) => i.rule.id);
const set = (id: string) => RULE_SETS.find((r) => r.id === id)!;
const nh = set("eijuu_nihonjin_haigusha");
const eh = set("eijuu_eijusha_haigusha");
const COMMON = ["eijuu_application_form", "eijuu_photo", "eijuu_household_residence_certificate", "eijuu_identity_guarantee", "eijuu_identity_guarantee_documents", "eijuu_written_acknowledgment", "eijuu_passport_presentation", "eijuu_residence_card_presentation"];

describe("永住許可申請の手続（EJ-1）", () => {
  it("手続種別 permanent がある。変更後の在留資格は不要（現在の在留資格で規則を引く）", () => {
    expect(PROCEDURE_TYPES.find((p) => p.value === "permanent")?.label).toBe("永住許可申請");
    expect(procedureNeedsTarget("permanent")).toBe(false);
  });

  it("現在の在留資格で規則集合が決まる。対象外の在留資格・ほかの手続には影響しない", () => {
    expect(evaluate(make("permanent", "日本人の配偶者等")).ruleSet?.id).toBe("eijuu_nihonjin_haigusha");
    expect(evaluate(make("permanent", "永住者の配偶者等")).ruleSet?.id).toBe("eijuu_eijusha_haigusha");
    for (const status of ["定住者", "技術・人文知識・国際業務", "家族滞在", "高度専門職", ""]) {
      const e = evaluate(make("permanent", status));
      expect(e.ruleSet, status).toBeNull();
      expect(e.notApplicableReason).toContain("永住許可申請");
    }
    // 取得の規則集合は、これまでどおり取得の手続でだけ選ばれる
    const acq = make("acquisition", "");
    acq.targetStatus = "日本人の配偶者等";
    expect(evaluate(acq).ruleSet?.id).toBe("nihonjin_haigusha_acquisition");
    expect(evaluate(make("renewal", "日本人の配偶者等")).ruleSet?.id).toBe("nihonjin_haigusha_renewal"); // 日本人の配偶者等の更新の規則集合は、別の PR（#445）で追加されたため、統合後は選ばれる
  });

  it("2つの規則集合は、手続 permanent・軸 eijuuType（alsoBasis なし）・照合日 2026-10-24", () => {
    for (const rs of [nh, eh]) {
      expect(rs.procedureType).toBe("permanent");
      expect(rs.basis).toBe("eijuuType");
      expect(rs.alsoBasis).toBeUndefined();
      expect(rs.checkedAt).toBe("2026-10-24");
      expect(ruleSetComparedAt(rs)).toBe("2026-10-24");
      expect(rs.title).toContain("（一部のみ整備）");
    }
  });
});

describe("永住許可申請の区分（EJ-2）", () => {
  it("区分は4つ。保存値は正規化される", () => {
    expect(EIJUU_TYPES).toEqual(["nihonjinSpouse", "nihonjinChild", "eijushaSpouse", "eijushaChild"]);
    expect(normalizeFormDetails({ eijuuType: "eijushaChild" }).eijuuType).toBe("eijushaChild");
    expect(normalizeFormDetails({ eijuuType: "bogus" }).eijuuType).toBe("");
    expect(normalizeFormDetails(null).eijuuType).toBe("");
  });

  it("規則集合ごとに選べる区分は2つ", () => {
    expect(eijuuTypesOf(nh)).toEqual(["nihonjinSpouse", "nihonjinChild"]);
    expect(eijuuTypesOf(eh)).toEqual(["eijushaSpouse", "eijushaChild"]);
  });

  it("区分が未選択の間は、区分に共通の書類（必須8件）だけを出し、案内を出す", () => {
    for (const status of ["日本人の配偶者等", "永住者の配偶者等"]) {
      const e = evaluate(make("permanent", status));
      expect(e.needsEijuuType, status).toBe(true);
      expect(ids(e, "required"), status).toEqual(COMMON);
      expect(eijuuTypeNotice(e)).toBe("caseRequirements.needsEijuuTypeAxes");
    }
  });

  it("区分を選ぶと案内は消え、ほかの区分の行は出ない", () => {
    const e = evaluate(make("permanent", "日本人の配偶者等", "nihonjinChild"));
    expect(e.needsEijuuType).toBe(false);
    expect(eijuuTypeNotice(e)).toBeNull();
    const notRequired = e.items.filter((i) => i.effective === "not_required").map((i) => i.rule.id);
    expect(notRequired).toContain("eijuu_spouse_family_register");
    expect(notRequired).toContain("eijuu_relatives_list");
    const reason = e.items.find((i) => i.rule.id === "eijuu_spouse_family_register")!.reason;
    expect(reason).toBe("提出書類一覧表の区分「日本人の実子（特別養子縁組を含む）」では原則不要");
    expect(reason).toBe(reasonText(jaT, e.items.find((i) => i.rule.id === "eijuu_spouse_family_register")!.reasonCode));
  });
});

describe("提出書類一覧表4点の書類（EJ-3）", () => {
  // 一覧表の書類数：日本人の配偶者21・日本人の実子19・永住者等の配偶者20・永住者等の実子19に、人の判断で足した3行（EJ-4の必須2行・EJ-5の要確認1行）を加えた数（区分を選んだときに required または check で出る数）
  const cases: [string, string, EijuuType, number, number][] = [
    ["日本人の配偶者", "日本人の配偶者等", "nihonjinSpouse", 24, 8],
    ["日本人の実子・特別養子", "日本人の配偶者等", "nihonjinChild", 22, 8],
    ["永住者等の配偶者", "永住者の配偶者等", "eijushaSpouse", 23, 8],
    ["永住者等の実子", "永住者の配偶者等", "eijushaChild", 22, 8],
  ];
  for (const [label, status, type, total, checks] of cases) {
    it(`${label}：書類は${total}件（うち該当者のみの要確認が${checks}件）。任意の書類はセルフチェックシートのみ（EJ-8）`, () => {
      const e = evaluate(make("permanent", status, type));
      expect(ids(e, "required").length + ids(e, "check").length).toBe(total);
      expect(ids(e, "check").length).toBe(checks);
      expect(ids(e, "optional")).toEqual(["eijuu_selfcheck_sheet"]);
      expect(e.items.every((i) => !i.rule.verify)).toBe(true);
    });
  }

  it("日本人の配偶者：一覧表の並び（申請書→写真→戸籍→婚姻証明書→住民票→職業…→親族一覧表→身元保証書→了解書）", () => {
    const e = evaluate(make("permanent", "日本人の配偶者等", "nihonjinSpouse"));
    const list = e.items.filter((i) => i.effective !== "not_required").map((i) => i.rule.id);
    expect(list).toEqual([
      "eijuu_application_form",
      "eijuu_photo",
      "eijuu_spouse_family_register",
      "eijuu_spouse_marriage_certificate",
      "eijuu_household_residence_certificate",
      "eijuu_occupation_spouse",
      "eijuu_resident_tax_certificate_spouse",
      "eijuu_resident_tax_payment_spouse",
      "eijuu_resident_tax_timely_spouse",
      "eijuu_national_tax_certificate_spouse",
      "eijuu_pension_record_spouse",
      "eijuu_health_insurance_card_spouse",
      "eijuu_national_health_insurance_card_spouse",
      "eijuu_nhi_payment_certificate_spouse",
      "eijuu_nhi_receipt_spouse",
      "eijuu_social_insurance_receipt_spouse",
      "eijuu_social_insurance_certificate_spouse",
      "eijuu_relatives_list",
      "eijuu_identity_guarantee",
      "eijuu_identity_guarantee_documents",
      "eijuu_written_acknowledgment",
      "eijuu_passport_presentation",
      "eijuu_residence_card_presentation",
      "eijuu_agent_identity_document",
      "eijuu_selfcheck_sheet",
    ]);
    expect(ids(e, "check")).toEqual([
      "eijuu_resident_tax_timely_spouse",
      "eijuu_health_insurance_card_spouse",
      "eijuu_national_health_insurance_card_spouse",
      "eijuu_nhi_payment_certificate_spouse",
      "eijuu_nhi_receipt_spouse",
      "eijuu_social_insurance_receipt_spouse",
      "eijuu_social_insurance_certificate_spouse",
      "eijuu_agent_identity_document",
    ]);
  });

  it("配偶者は住民税3年・年金等2年、実子は1年・1年。実子の一覧表に親族一覧表はない", () => {
    const names = (type: EijuuType, status: string) => evaluate(make("permanent", status, type)).items.filter((i) => i.effective !== "not_required").map((i) => i.rule.name);
    const spouse = names("nihonjinSpouse", "日本人の配偶者等");
    expect(spouse).toContain("直近3年分の住民税の課税（又は非課税）証明書（1年間の総所得及び納税状況が記載されたもの）");
    expect(spouse).toContain("直近2年間の国民健康保険料（税）納付証明書");
    expect(spouse).toContain("親族一覧表");
    const child = names("eijushaChild", "永住者の配偶者等");
    expect(child).toContain("直近1年分の住民税の課税（又は非課税）証明書（1年間の総所得及び納税状況が記載されたもの）");
    expect(child).toContain("直近1年間の国民健康保険料（税）納付証明書");
    expect(child).not.toContain("親族一覧表");
  });

  it("身分関係の書類は区分ごとに違う（一覧表の3番）", () => {
    const only = (status: string, type: EijuuType) => evaluate(make("permanent", status, type)).items.filter((i) => i.effective === "required" && /family_register|marriage|parentage/.test(i.rule.id)).map((i) => i.rule.id);
    expect(only("日本人の配偶者等", "nihonjinSpouse")).toEqual(["eijuu_spouse_family_register", "eijuu_spouse_marriage_certificate"]);
    expect(only("日本人の配偶者等", "nihonjinChild")).toEqual(["eijuu_child_family_register"]);
    expect(only("永住者の配偶者等", "eijushaSpouse")).toEqual(["eijuu_marriage_proof"]);
    expect(only("永住者の配偶者等", "eijushaChild")).toEqual(["eijuu_parentage_proof"]);
  });

  it("一覧表にない書類のうち、人の判断で足した4行（EJ-4・EJ-5・EJ-8）は、区分に共通で、全4区分に出る", () => {
    const added: [string, string][] = [
      ["eijuu_passport_presentation", "required"],
      ["eijuu_residence_card_presentation", "required"],
      ["eijuu_agent_identity_document", "check"],
      ["eijuu_selfcheck_sheet", "optional"],
    ];
    for (const rs of [nh, eh]) {
      for (const [id, level] of added) {
        const r = rs.rules.find((x) => x.id === id)!;
        expect(r.level, id).toBe(level);
        expect(r.eijuuTypes, id).toBeUndefined();
      }
      for (const r of rs.rules) {
        expect(r.name, r.id).not.toMatch(/預貯金通帳の写し$/);
      }
    }
    // 区分が未選択の間も、区分に共通の書類として出る
    expect(evaluate(make("permanent", "日本人の配偶者等")).items.map((i) => i.rule.id)).toEqual(expect.arrayContaining(added.map(([id]) => id)));
  });

  it("人の判断の注記（EJ-7・EJ-9・EJ-10）：マイナ保険証の書類、保証人の目安、実子の職業の読み替え", () => {
    for (const [rs, children] of [[nh, ["nihonjinChild"]], [eh, ["eijushaChild"]]] as const) {
      const note = (id: string) => rs.rules.find((r) => r.id === id)?.note ?? "";
      for (const sfx of ["spouse", "child"]) {
        expect(note(`eijuu_health_insurance_card_${sfx}`), sfx).toContain("マイナ保険証を所持している方：マイナポータルの健康保険証情報");
        expect(note(`eijuu_health_insurance_card_${sfx}`), sfx).toContain("「資格確認証」（写し）");
      }
      expect(note("eijuu_identity_guarantee")).toContain("配偶者の区分は配偶者、実子の区分は申請人を扶養する方（親など）");
      expect(note("eijuu_occupation_child")).toContain("申請人及び申請人を扶養する方お二方とも無職");
      expect(note("eijuu_occupation_child")).not.toContain("お二方とも無職".replace("お二方", "配偶者の方お二方"));
      expect(note("eijuu_occupation_spouse")).toContain("申請人及び配偶者の方お二方とも無職");
      expect(children.length).toBe(1);
    }
  });

  it("規則の id は規則集合の中で重ならない", () => {
    for (const rs of [nh, eh]) {
      const all = rs.rules.map((r) => r.id);
      expect(new Set(all).size).toBe(all.length);
    }
  });
});
