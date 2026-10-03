import { describe, expect, it } from "vitest";
import { buildContent } from "../lib/documents/snapshot";
import {
  EMPTY_FORM_DETAILS,
  DATE_FIELD_KEYS,
  FORM_LAYOUTS,
  getFormDetailsWarnings,
  getFormLayout,
  normalizeFormDetails,
  validateFormDetails,
  type FormFieldKey,
  type FormSectionKey,
} from "../lib/formDetails";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type CaseRecord } from "../lib/types";

function make(over: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "c1",
    caseName: "案件",
    procedureType: "renewal",
    currentStatus: "技術・人文知識・国際業務",
    targetStatus: "",
    memo: "",
    workflowStatus: "preparing",
    createdAt: "",
    updatedAt: "",
    applicant: { ...EMPTY_APPLICANT, legalName: "LI MING", confirmationStatus: "confirmed" },
    employment: { ...EMPTY_EMPLOYMENT },
    formDetails: { ...EMPTY_FORM_DETAILS },
    requirementStates: {},
    customRequirements: [],
    plannedApplicationDate: "",
    checkMemo: "",
    checks: [],
    documents: [],
    ...over,
  };
}

const items = (c: CaseRecord) => buildContent(c, "transcription_aid").transcription!.sheets.flatMap((s) => s.items);
const find = (c: CaseRecord, prefix: string) => items(c).filter((i) => i.label.startsWith(prefix));

describe("公式様式項目", () => {
  it("入力した値は転記補助シートに『要確認』で載り、未入力は『手入力』になる", () => {
    const c = make();
    expect(find(c, "旅券")[0].mode).toBe("missing");
    c.formDetails = { ...c.formDetails, passportNumber: "TK1234567", passportExpiry: "2030-01-31" };
    const passport = find(c, "旅券")[0];
    expect(passport.mode).toBe("confirm");
    expect(passport.value).toContain("TK1234567");
  });

  it("犯罪を理由とする処分は、入力の有無にかかわらず『要確認』になる", () => {
    const c = make();
    expect(find(c, "犯罪")[0].mode).toBe("confirm");
    c.formDetails.criminalRecord = "yes";
    c.formDetails.criminalDetail = "交通違反（罰金）";
    expect(find(c, "犯罪")[0].value).toContain("交通違反");
  });

  it("在日親族と職歴は、1行ずつの項目として出力される", () => {
    const c = make();
    c.formDetails.relativesPresent = "yes";
    c.formDetails.relatives = [
      { id: "r1", relationship: "配偶者", name: "A", dateOfBirth: "1991-01-02", nationality: "中国", workplace: "B社", livesTogether: "yes", cardNumber: "AB1" },
      { id: "r2", relationship: "子", name: "C", dateOfBirth: "", nationality: "", workplace: "", livesTogether: "no", cardNumber: "" },
    ];
    c.formDetails.workHistory = [{ id: "w1", joinedOn: "2020-04", leftOn: "", employer: "D社" }];
    expect(find(c, "在日親族")).toHaveLength(2);
    expect(find(c, "在日親族")[0].value).toContain("カード番号 AB1");
    expect(find(c, "職歴")[0].value).toContain("在職中");
  });

  it("生成後に公式様式項目を変更しても、作成済みの写しは変わらない", () => {
    const c = make();
    c.formDetails.occupation = "会社員";
    const content = buildContent(c, "transcription_aid");
    c.formDetails.occupation = "変更後";
    expect(content.transcription!.sheets[0].items.find((i) => i.label === "職業")?.value).toBe("会社員");
  });

  it("古い保存形式（項目なし）は現行の形式へ補われる", () => {
    const f = normalizeFormDetails(undefined);
    expect(f.relatives).toEqual([]);
    expect(normalizeFormDetails({ occupation: "x", relatives: "壊れた値" }).relatives).toEqual([]);
  });

  it("日付の形式を検証する", () => {
    expect(validateFormDetails({ ...EMPTY_FORM_DETAILS, passportExpiry: "2030-13-40" }).passportExpiry).toBeTruthy();
    expect(validateFormDetails({ ...EMPTY_FORM_DETAILS, passportExpiry: "2030-01-31" })).toEqual({});
  });
});

describe("検証対象の項目名", () => {
  it("検証でエラーになりうる全キーが、その様式で表示される項目なら、非空のラベルを持つ", () => {
    const all = Object.fromEntries(DATE_FIELD_KEYS.map((k) => [k, "x"])) as unknown as typeof EMPTY_FORM_DETAILS;
    expect(Object.keys(validateFormDetails(all)).sort()).toEqual([...DATE_FIELD_KEYS].sort());
    for (const layout of Object.values(FORM_LAYOUTS)) {
      // 旅券の有効期限・卒業年月日は、全様式に共通
      expect(layout.labels.passportExpiry).toBeTruthy();
      expect(layout.labels.graduationDate).toBeTruthy();
      for (const k of Object.keys(validateFormDetails(all, layout)) as FormFieldKey[]) {
        expect(layout.labels[k]).toBeTruthy();
      }
    }
    // 認定は、日付の全項目を表示する
    for (const k of DATE_FIELD_KEYS) expect(getFormLayout("coe").labels[k]).toBeTruthy();
    // 更新には認定の項目がないため、その値の誤りでは保存を妨げない
    expect(validateFormDetails({ ...EMPTY_FORM_DETAILS, plannedEntryDate: "x" }, getFormLayout("renewal"))).toEqual({});
  });

  it("認定の日付項目も、形式を検証する", () => {
    for (const k of ["plannedEntryDate", "entryHistoryLastFrom", "entryHistoryLastTo", "deportationLastDate"] as const) {
      expect(validateFormDetails({ ...EMPTY_FORM_DETAILS, [k]: "2030-13-40" })[k]).toBeTruthy();
      expect(validateFormDetails({ ...EMPTY_FORM_DETAILS, [k]: "2030-01-31" })).toEqual({});
    }
  });
});

describe("手続種別ごとの項目番号表", () => {
  it("更新様式の表記は従来どおり（変更前後で差がない）", () => {
    const l = getFormLayout("renewal").labels;
    expect(l.maritalStatus).toBe("5 配偶者の有無");
    expect(l.homeAddress).toBe("7 本国における居住地");
    expect(l.desiredPeriod).toBe("13 希望する在留期間");
    expect(l.renewalReason).toBe("14 更新の理由");
    expect(l.placeOfBirth).toBeUndefined();
    expect(l.changeReason).toBeUndefined();
    expect(getFormLayout("renewal").desiredStatusLabel).toBeUndefined();
    expect(getFormLayout("renewal").sectionTitles.applicant1).toBe("申請人等作成用1（項番5〜15）");
  });

  it("変更様式は、出生地が項目5で、以降が1つ繰り下がる", () => {
    const layout = getFormLayout("change");
    const l = layout.labels;
    expect(layout.formName).toBe("在留資格変更許可申請書");
    expect(l.placeOfBirth).toBe("5 出生地");
    expect(l.maritalStatus).toBe("6 配偶者の有無");
    expect(l.occupation).toBe("7 職業");
    expect(l.homeAddress).toBe("8 本国における居住地");
    expect(l.passportNumber).toBe("10 (1) 旅券番号");
    expect(l.changeReason).toBe("14 変更の理由");
    expect(l.renewalReason).toBeUndefined();
    expect(layout.desiredStatusLabel).toBe("13 希望する在留資格");
  });

  it("未対応の手続種別は、更新様式の表記で表示する", () => {
    expect(FORM_LAYOUTS.other).toBeUndefined();
    expect(getFormLayout("other")).toBe(FORM_LAYOUTS.renewal);
  });

  it("追加した項目は、保存値から復元でき、古い保存値には空で補われる", () => {
    const restored = normalizeFormDetails({ placeOfBirth: "ダミー市", changeReason: "転職のため" });
    expect(restored.placeOfBirth).toBe("ダミー市");
    expect(restored.changeReason).toBe("転職のため");
    expect(restored.renewalReason).toBe("");
    const old = normalizeFormDetails({ renewalReason: "継続勤務" });
    expect(old.placeOfBirth).toBe("");
    expect(old.changeReason).toBe("");
  });
});

// 更新・変更の画面が、様式ごとの表示切替の導入（Issue #85）の前後で変わらないことを固定する。
// 期待値は、導入前（#100 時点）の FORM_LAYOUTS から出力した値。
const ALL_SECTIONS: FormSectionKey[] = ["applicant1", "relatives", "applicant2", "workHistory", "organization"];

const RENEWAL_LABELS_BEFORE: Partial<Record<FormFieldKey, string>> = {
  agentAddress: "取次者 住所",
  agentAffiliation: "取次者 所属機関等",
  agentName: "取次者 氏名",
  agentPhone: "取次者 電話番号",
  annualSales: "3 (8) 年間売上高（直近年度）",
  branchName: "17 勤務先 支店・事業所名",
  corporateNumber: "3 (2) 法人番号（13桁）",
  criminalDetail: "15 具体的内容",
  criminalRecord: "15 犯罪を理由とする処分を受けたことの有無",
  desiredPeriod: "13 希望する在留期間",
  dispatchAddress: "11 (6) 所在地",
  dispatchAnnualSales: "11 (8) 年間売上高",
  dispatchBranchName: "11 (3) 支店・事業所名",
  dispatchCapital: "11 (7) 資本金",
  dispatchCorporateNumber: "11 (2) 法人番号",
  dispatchInsuranceNumber: "11 (4) 雇用保険適用事業所番号",
  dispatchName: "11 派遣先等 (1) 名称",
  dispatchPeriod: "11 (9) 派遣予定期間",
  dispatchPhone: "11 (6) 電話番号",
  educationLevel: "18 (2) 学歴の区分",
  educationPlace: "18 (1) 最終学歴の所在",
  employmentInsuranceNumber: "3 (4) 雇用保険適用事業所番号（11桁）",
  experienceYears: "7 実務経験年数",
  foreignStaffCount: "3 (9) 外国人職員数",
  graduationDate: "18 (4) 卒業年月日",
  homeAddress: "7 本国における居住地",
  itQualification: "20 情報処理技術者資格又は試験合格",
  legalRepAddress: "22 代理人 住所",
  legalRepName: "22 代理人 氏名（法定代理人による申請の場合）",
  legalRepPhone: "22 代理人 電話番号",
  legalRepRelationship: "22 本人との関係",
  majorField: "19 専攻・専門分野",
  maritalStatus: "5 配偶者の有無",
  mobilePhone: "9 携帯電話番号",
  occupation: "6 職業",
  occupationCode: "9 職種（別紙「職種一覧」の番号）",
  orgPhone: "3 (6) 電話番号",
  passportExpiry: "10 (2) 旅券の有効期限",
  passportNumber: "10 (1) 旅券番号",
  periodOfStay: "11 現に有する在留期間",
  phone: "9 電話番号",
  positionTitle: "8 職務上の地位（役職名）",
  renewalReason: "14 更新の理由",
  schoolName: "18 (3) 学校名",
  workPhone: "17 (3) 勤務先 電話番号",
};

const CHANGE_LABELS_BEFORE: Partial<Record<FormFieldKey, string>> = {
  agentAddress: "取次者 住所",
  agentAffiliation: "取次者 所属機関等",
  agentName: "取次者 氏名",
  agentPhone: "取次者 電話番号",
  annualSales: "3 (8) 年間売上高（直近年度）",
  branchName: "17 勤務先 支店・事業所名",
  changeReason: "14 変更の理由",
  corporateNumber: "3 (2) 法人番号（13桁）",
  criminalDetail: "15 具体的内容",
  criminalRecord: "15 犯罪を理由とする処分を受けたことの有無",
  desiredPeriod: "13 希望する在留期間",
  dispatchAddress: "11 (6) 所在地",
  dispatchAnnualSales: "11 (8) 年間売上高",
  dispatchBranchName: "11 (3) 支店・事業所名",
  dispatchCapital: "11 (7) 資本金",
  dispatchCorporateNumber: "11 (2) 法人番号",
  dispatchInsuranceNumber: "11 (4) 雇用保険適用事業所番号",
  dispatchName: "11 派遣先等 (1) 名称",
  dispatchPeriod: "11 (9) 派遣予定期間",
  dispatchPhone: "11 (6) 電話番号",
  educationLevel: "18 (2) 学歴の区分",
  educationPlace: "18 (1) 最終学歴の所在",
  employmentInsuranceNumber: "3 (4) 雇用保険適用事業所番号（11桁）",
  experienceYears: "7 実務経験年数",
  foreignStaffCount: "3 (9) 外国人職員数",
  graduationDate: "18 (4) 卒業年月日",
  homeAddress: "8 本国における居住地",
  itQualification: "20 情報処理技術者資格又は試験合格",
  legalRepAddress: "22 代理人 住所",
  legalRepName: "22 代理人 氏名（法定代理人による申請の場合）",
  legalRepPhone: "22 代理人 電話番号",
  legalRepRelationship: "22 本人との関係",
  majorField: "19 専攻・専門分野",
  maritalStatus: "6 配偶者の有無",
  mobilePhone: "9 携帯電話番号（住居地の欄）",
  occupation: "7 職業",
  occupationCode: "9 職種（別紙「職種一覧」の番号）",
  orgPhone: "3 (6) 電話番号",
  passportExpiry: "10 (2) 旅券の有効期限",
  passportNumber: "10 (1) 旅券番号",
  periodOfStay: "11 現に有する在留期間",
  phone: "9 電話番号（住居地の欄）",
  placeOfBirth: "5 出生地",
  positionTitle: "8 職務上の地位（役職名）",
  schoolName: "18 (3) 学校名",
  workPhone: "17 (3) 勤務先 電話番号",
};

describe("更新・変更の表示は、従来と同じ", () => {
  it("更新・変更は、全セクションの見出しと学歴の区分を持ち、項目名は従来と一致する", () => {
    for (const [type, before] of [["renewal", RENEWAL_LABELS_BEFORE], ["change", CHANGE_LABELS_BEFORE]] as const) {
      const layout = getFormLayout(type);
      expect(Object.keys(layout.sectionTitles).sort()).toEqual([...ALL_SECTIONS].sort());
      for (const k of ALL_SECTIONS) expect(layout.sectionTitles[k]).toBeTruthy();
      expect(layout.labels.educationLevel).toBe("18 (2) 学歴の区分");
      expect(layout.livesTogetherLabel).toBeUndefined();
      expect(layout.labels).toEqual(before);
    }
  });

  it("更新・変更の見出しは従来のとおり", () => {
    expect(getFormLayout("renewal").sectionTitles).toEqual({
      applicant1: "申請人等作成用1（項番5〜15）",
      relatives: "16 在日親族及び同居者",
      applicant2: "申請人等作成用2（N）（項番17〜22）",
      workHistory: "21 職歴（外国におけるものを含む）",
      organization: "所属機関等作成用1・2（N）",
    });
    expect(getFormLayout("change").sectionTitles).toEqual(getFormLayout("renewal").sectionTitles);
  });
});

describe("認定証明書交付申請の項目番号表（Issue #85）", () => {
  const layout = getFormLayout("coe");
  const l = layout.labels;

  it("認定は専用の表を持ち、様式名・識別番号・見出しが認定様式のものになる", () => {
    expect(FORM_LAYOUTS.coe).toBe(layout);
    expect(layout.formName).toBe("在留資格認定証明書交付申請書");
    expect(layout.formId).toBe("930004030");
    expect(layout.desiredStatusLabel).toBe("11 入国目的");
    expect(layout.livesTogetherLabel).toBe("同居予定の有無");
    expect(layout.sectionTitles.applicant1).toBe("申請人等作成用1（項番5〜20）");
    expect(layout.sectionTitles.relatives).toContain("21 在日親族");
    expect(layout.sectionTitles.applicant2).toBe("申請人等作成用2（N）（項番22〜27）");
    expect(layout.sectionTitles.workHistory).toBe("26 職歴（外国におけるものを含む）");
    expect(layout.sectionTitles.organization).toBe("所属機関等作成用1・2（N）");
  });

  it("申請人等作成用1の項番は5〜20", () => {
    expect(l.placeOfBirth).toBe("5 出生地");
    expect(l.maritalStatus).toBe("6 配偶者の有無");
    expect(l.occupation).toBe("7 職業");
    expect(l.homeAddress).toBe("8 本国における居住地");
    expect(l.contactInJapan).toBe("9 日本における連絡先");
    expect(l.phone).toBe("9 電話番号（連絡先の欄）");
    expect(l.mobilePhone).toBe("9 携帯電話番号（連絡先の欄）");
    expect(l.passportNumber).toBe("10 (1) 旅券番号");
    expect(l.passportExpiry).toBe("10 (2) 旅券の有効期限");
    expect(l.plannedEntryDate).toMatch(/^12 /);
    expect(l.portOfEntry).toMatch(/^13 /);
    expect(l.plannedStay).toMatch(/^14 /);
    expect(l.accompanied).toMatch(/^15 /);
    expect(l.visaApplicationPlace).toMatch(/^16 /);
    for (const k of ["entryHistory", "entryHistoryCount", "entryHistoryLastFrom", "entryHistoryLastTo"] as const) {
      expect(l[k]).toMatch(/^17 /);
    }
    for (const k of ["coeHistory", "coeHistoryCount", "coeHistoryNonIssuedCount"] as const) {
      expect(l[k]).toMatch(/^18 /);
    }
    expect(l.criminalRecord).toMatch(/^19 /);
    expect(l.criminalDetail).toMatch(/^19 /);
    for (const k of ["deportationHistory", "deportationCount", "deportationLastDate"] as const) {
      expect(l[k]).toMatch(/^20 /);
    }
  });

  it("申請人等作成用2は22〜27（更新・変更の17〜22と異なる）", () => {
    expect(l.branchName).toBe("22 勤務先 支店・事業所名");
    expect(l.workPhone).toBe("22 (3) 勤務先 電話番号");
    expect(l.educationPlace).toMatch(/^23 \(1\)/);
    expect(l.educationLevel).toMatch(/^23 \(2\)/);
    expect(l.schoolName).toMatch(/^23 \(3\)/);
    expect(l.graduationDate).toMatch(/^23 \(4\)/);
    expect(l.majorField).toMatch(/^24 /);
    expect(l.itQualification).toMatch(/^25 /);
    for (const k of ["legalRepName", "legalRepRelationship", "legalRepAddress", "legalRepPhone"] as const) {
      expect(l[k]).toMatch(/^27 /);
    }
  });

  it("所属機関等作成用は、実務経験年数・役職・職種・派遣先等が8・9・10・12", () => {
    expect(l.experienceYears).toBe("8 実務経験年数");
    expect(l.positionTitle).toBe("9 職務上の地位（役職名）");
    expect(l.occupationCode).toMatch(/^10 /);
    for (const k of Object.keys(l).filter((x) => x.startsWith("dispatch")) as FormFieldKey[]) {
      expect(l[k]).toMatch(/^12 /);
    }
    expect(Object.keys(l).filter((x) => x.startsWith("dispatch"))).toHaveLength(9);
    expect(l.corporateNumber).toBe("3 (2) 法人番号（13桁）");
  });

  it("認定にない項目（更新の理由・変更の理由・現に有する在留期間・希望する在留期間）は持たない", () => {
    expect(l.renewalReason).toBeUndefined();
    expect(l.changeReason).toBeUndefined();
    expect(l.periodOfStay).toBeUndefined();
    expect(l.desiredPeriod).toBeUndefined();
  });

  it("認定の項目名の数字は、重複する別の項目と衝突しない（項目名が一意）", () => {
    const values = Object.values(l);
    expect(new Set(values).size).toBe(values.length);
  });

  it("認定に固有の項目は、保存した値がそのまま正規化後も残り、古い保存形式には空で補われる", () => {
    const f = normalizeFormDetails({ occupation: "会社員" });
    expect(f.occupation).toBe("会社員");
    expect(f.entryHistory).toBe("");
    expect(f.coeHistoryNonIssuedCount).toBe("");
    const saved = {
      ...EMPTY_FORM_DETAILS,
      placeOfBirth: "ダミー市",
      contactInJapan: "東京都（ダミー）",
      plannedEntryDate: "2030-04-01",
      portOfEntry: "成田",
      plannedStay: "1年",
      accompanied: "no" as const,
      visaApplicationPlace: "在ダミー国日本国大使館",
      entryHistory: "yes" as const,
      entryHistoryCount: "2",
      entryHistoryLastFrom: "2025-01-10",
      entryHistoryLastTo: "2025-02-10",
      coeHistory: "yes" as const,
      coeHistoryCount: "1",
      coeHistoryNonIssuedCount: "1",
      deportationHistory: "no" as const,
    };
    expect(normalizeFormDetails(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });
});

describe("出入国歴の日付の前後（警告）", () => {
  it("入国年月日が出国年月日より後の場合は、警告を出すが、エラーにはしない（保存は妨げない）", () => {
    const f = { ...EMPTY_FORM_DETAILS, entryHistoryLastFrom: "2025-03-01", entryHistoryLastTo: "2025-02-01" };
    expect(getFormDetailsWarnings(f)).toHaveLength(1);
    expect(validateFormDetails(f)).toEqual({});
  });

  it("前後が正しい・片方のみ・形式が不正な場合は、警告しない", () => {
    expect(getFormDetailsWarnings({ ...EMPTY_FORM_DETAILS, entryHistoryLastFrom: "2025-01-01", entryHistoryLastTo: "2025-02-01" })).toEqual([]);
    expect(getFormDetailsWarnings({ ...EMPTY_FORM_DETAILS, entryHistoryLastFrom: "2025-01-01" })).toEqual([]);
    expect(getFormDetailsWarnings({ ...EMPTY_FORM_DETAILS, entryHistoryLastFrom: "2025-13-40", entryHistoryLastTo: "2025-02-01" })).toEqual([]);
  });
});
