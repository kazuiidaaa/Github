import { formatDate } from "../format";
import type { FormDetails } from "../formDetails";
import type { Applicant, EmploymentInfo } from "../types";
import type { TranscriptionContent, TranscriptionItem, TranscriptionMode } from "./types";

/**
 * 公式の在留期間更新許可申請書（技術・人文知識・国際業務）の項目と、案件DBの対応表。
 * 項目番号と項目名は、入管庁の公式様式の表記に合わせる。
 * 様式が改正された場合は、このファイルの FORM_META と SHEETS を点検・更新する。
 * 根拠：docs/phase9-official-forms-research.md
 */
export const FORM_META = {
  formName: "別記第三十号の二様式（第二十一条関係）在留期間更新許可申請書",
  fileId: "930004094",
  sourceUrl: "https://www.moj.go.jp/isa/content/930004094.pdf",
  confirmedOn: "2026-10-02",
  mappingVersion: 1,
} as const;

const TARGET_STATUS = "技術・人文知識・国際業務";

interface Ctx {
  a: Applicant;
  e: EmploymentInfo;
  f: FormDetails;
}

/**
 * auto：確定済みの申請人情報／confirm：保存値を原本と照合してから使う／
 * entered：「公式様式項目」に入力した値。入力があれば要確認、なければ手入力／
 * always_confirm：入力の有無にかかわらず要確認（人事上の影響が大きい項目）／missing：保存する項目がない
 */
type DefMode = TranscriptionMode | "entered" | "always_confirm";

interface Def {
  no: string;
  label: string;
  mode: DefMode;
  get?: (c: Ctx) => string;
  note?: string;
}

const YES_NO = (v: string, yes: string, no: string) => (v === "yes" || v === "married" ? yes : v === "no" || v === "none" || v === "single" ? no : "");
const entered = (no: string, label: string, get: (c: Ctx) => string, note?: string): Def => ({ no, label, mode: "entered", get, note });

const date = (v: string) => (v ? formatDate(v) : "");


/** 在日親族・同居者（1行ずつ）。入力がなければ、有無の選択のみを示す */
const relativeDefs = (c: Ctx): Def[] => {
  const label = "在日親族（父・母・配偶者・子・兄弟姉妹・祖父母・叔(伯)父・叔(伯)母など）及び同居者";
  if (c.f.relativesPresent !== "yes" || c.f.relatives.length === 0) {
    return [entered("16", label, () => YES_NO(c.f.relativesPresent, "有（下記に記入）", "無"))];
  }
  return c.f.relatives.map((r, i) =>
    entered(
      "16",
      `${label}（${i + 1}人目）`,
      () =>
        [
          r.relationship,
          r.name,
          r.dateOfBirth && date(r.dateOfBirth),
          r.nationality,
          r.workplace,
          r.livesTogether && `同居 ${YES_NO(r.livesTogether, "有", "無")}`,
          r.cardNumber && `カード番号 ${r.cardNumber}`,
        ]
          .filter(Boolean)
          .join(" ／ "),
      i === 0 ? "親族の在留カード番号を原本と照合する" : undefined,
    ),
  );
};

/** 職歴（1行ずつ） */
const workDefs = (c: Ctx): Def[] => {
  const label = "職歴（外国におけるものを含む）";
  if (c.f.workHistory.length === 0) return [entered("21", label, () => "")];
  return c.f.workHistory.map((w, i) =>
    entered("21", `${label}（${i + 1}行目）`, () => `${w.joinedOn || "未入力"} 〜 ${w.leftOn || "在職中"} ／ ${w.employer}`),
  );
};

const SHEETS: { title: string; defs: (Def | ((c: Ctx) => Def[]))[] }[] = [
  {
    title: "申請人等作成用1",
    defs: [
      { no: "1", label: "国籍・地域", mode: "auto", get: (c) => c.a.nationality },
      { no: "2", label: "生年月日", mode: "auto", get: (c) => date(c.a.dateOfBirth) },
      { no: "3", label: "氏名", mode: "confirm", get: (c) => c.a.legalName, note: "旅券の身分事項ページの表記と照合する" },
      { no: "4", label: "性別", mode: "auto", get: (c) => c.a.gender },
      entered("5", "配偶者の有無", (c) => YES_NO(c.f.maritalStatus, "有", "無")),
      entered("6", "職業", (c) => c.f.occupation),
      entered("7", "本国における居住地", (c) => c.f.homeAddress),
      { no: "8", label: "住居地", mode: "confirm", get: (c) => c.a.address, note: "在留カードの記載と照合する" },
      entered("9", "電話番号・携帯電話番号", (c) => [c.f.phone && `電話 ${c.f.phone}`, c.f.mobilePhone && `携帯 ${c.f.mobilePhone}`].filter(Boolean).join(" ／ ")),
      entered("10", "旅券（1）番号・（2）有効期限", (c) => [c.f.passportNumber && `番号 ${c.f.passportNumber}`, c.f.passportExpiry && `有効期限 ${date(c.f.passportExpiry)}`].filter(Boolean).join(" ／ "), "旅券の原本と照合する"),
      { no: "11", label: "現に有する在留資格", mode: "auto", get: (c) => c.a.residenceStatus },
      entered("11", "在留期間", (c) => c.f.periodOfStay),
      { no: "11", label: "在留期間の満了日", mode: "auto", get: (c) => date(c.a.residenceExpiryDate) },
      { no: "12", label: "在留カード番号", mode: "confirm", get: (c) => c.a.residenceCardNumber, note: "桁・英数字を原本と照合する" },
      entered("13", "希望する在留期間", (c) => c.f.desiredPeriod, "行政書士が判断する"),
      entered("14", "更新の理由", (c) => c.f.renewalReason, "行政書士が判断する"),
      { no: "15", label: "犯罪を理由とする処分を受けたことの有無", mode: "always_confirm", get: (c) => (c.f.criminalRecord === "yes" ? `有（${c.f.criminalDetail}）` : YES_NO(c.f.criminalRecord, "有", "無")), note: "申請人の申告に基づき、行政書士が確認する" },
      relativeDefs,
    ],
  },
  {
    title: "申請人等作成用2（N）",
    defs: [
      { no: "17", label: "勤務先（1）名称", mode: "confirm", get: (c) => c.e.companyName },
      entered("17", "勤務先 支店・事業所名", (c) => c.f.branchName),
      { no: "17", label: "勤務先（2）所在地", mode: "confirm", get: (c) => c.e.companyAddress, note: "主たる勤務場所の所在地" },
      entered("17", "勤務先（3）電話番号", (c) => c.f.workPhone),
      entered("18", "最終学歴", (c) => [c.f.educationPlace && (c.f.educationPlace === "japan" ? "本邦" : "外国"), c.f.educationLevel, c.f.schoolName, c.f.graduationDate && `卒業 ${date(c.f.graduationDate)}`].filter(Boolean).join(" ／ ")),
      entered("19", "専攻・専門分野", (c) => c.f.majorField),
      entered("20", "情報処理技術者資格又は試験合格の有無", (c) => c.f.itQualification),
      workDefs,
      entered("22", "代理人（法定代理人による申請の場合）", (c) => [c.f.legalRepName, c.f.legalRepRelationship, c.f.legalRepAddress, c.f.legalRepPhone].filter(Boolean).join(" ／ ")),
      entered("取次者", "（1）氏名（2）住所（3）所属機関等・電話番号", (c) => [c.f.agentName, c.f.agentAddress, c.f.agentAffiliation, c.f.agentPhone].filter(Boolean).join(" ／ ")),
    ],
  },
  {
    title: "所属機関等作成用1（N）",
    defs: [
      { no: "1", label: "契約又は招へいしている外国人の氏名", mode: "auto", get: (c) => c.a.legalName },
      { no: "2", label: "契約の形態", mode: "confirm", get: (c) => c.e.employmentType, note: "選択肢（雇用・委任・請負・その他）に対応付ける" },
      { no: "3", label: "（1）名称", mode: "confirm", get: (c) => c.e.companyName },
      entered("3", "（2）法人番号（13桁）", (c) => c.f.corporateNumber),
      entered("3", "（3）支店・事業所名", (c) => c.f.branchName),
      entered("3", "（4）雇用保険適用事業所番号（11桁）", (c) => c.f.employmentInsuranceNumber),
      { no: "3", label: "（5）業種", mode: "confirm", get: (c) => c.e.industry, note: "別紙「業種一覧」の番号へ変換する" },
      { no: "3", label: "（6）所在地", mode: "confirm", get: (c) => c.e.companyAddress, note: "電話番号は次行" },
      entered("3", "（6）電話番号", (c) => c.f.orgPhone),
      { no: "3", label: "（7）資本金", mode: "confirm", get: (c) => c.e.capital, note: "単位は円" },
      entered("3", "（8）年間売上高（直近年度）", (c) => c.f.annualSales),
      { no: "3", label: "（9）従業員数", mode: "confirm", get: (c) => c.e.employeeCount, note: "外国人職員数は次行" },
      entered("3", "（9）外国人職員数", (c) => c.f.foreignStaffCount),
      { no: "4", label: "就労予定期間", mode: "confirm", get: (c) => c.e.contractPeriod, note: "「定めなし／定めあり」と年月に分けて記入する" },
      { no: "5", label: "雇用開始（入社）年月日", mode: "confirm", get: (c) => date(c.e.employmentStartDate) },
      {
        no: "6",
        label: "給与・報酬（税引き前）",
        mode: "confirm",
        get: (c) => c.e.monthlySalary,
        note: "各種手当・実費弁償を除いた額か確認する。年額・月額の別を合わせる",
      },
      entered("7", "実務経験年数", (c) => c.f.experienceYears),
      entered("8", "職務上の地位（役職名）", (c) => c.f.positionTitle),
      entered("9", "職種", (c) => c.f.occupationCode, "別紙「職種一覧」の2〜18、24〜31、51〜54、999から選択"),
      { no: "10", label: "活動内容詳細", mode: "confirm", get: (c) => c.e.jobDescription, note: "専門性の説明は行政書士が記述する" },
    ],
  },
  {
    title: "所属機関等作成用2（N）",
    defs: [
      entered(
        "11",
        "派遣先等（人材派遣の場合、または勤務地が3と異なる場合）",
        (c) =>
          [
            c.f.dispatchName && `(1)名称 ${c.f.dispatchName}`,
            c.f.dispatchCorporateNumber && `(2)法人番号 ${c.f.dispatchCorporateNumber}`,
            c.f.dispatchBranchName && `(3)支店・事業所名 ${c.f.dispatchBranchName}`,
            c.f.dispatchInsuranceNumber && `(4)雇用保険適用事業所番号 ${c.f.dispatchInsuranceNumber}`,
            c.f.dispatchAddress && `(6)所在地 ${c.f.dispatchAddress}`,
            c.f.dispatchPhone && `電話 ${c.f.dispatchPhone}`,
            c.f.dispatchCapital && `(7)資本金 ${c.f.dispatchCapital}`,
            c.f.dispatchAnnualSales && `(8)年間売上高 ${c.f.dispatchAnnualSales}`,
            c.f.dispatchPeriod && `(9)派遣予定期間 ${c.f.dispatchPeriod}`,
          ]
            .filter(Boolean)
            .join("\n"),
        "該当しない場合でも、この用紙は提出する",
      ),
    ],
  },
];

function modeOf(def: Def, value: string, applicantConfirmed: boolean): TranscriptionMode {
  // 申請人情報が確定していない場合は、自動で載せる項目も確認が必要な項目として扱う
  if (def.mode === "auto") return applicantConfirmed ? "auto" : "confirm";
  if (def.mode === "entered") return value ? "confirm" : "missing";
  if (def.mode === "always_confirm") return "confirm";
  return def.mode;
}

/** 現在の案件情報から、公式様式の項目順に並べた転記補助の内容を作る */
export function buildTranscription(
  a: Applicant,
  e: EmploymentInfo,
  f: FormDetails,
  scope: { procedureType: string; currentStatus: string },
): TranscriptionContent {
  const ctx: Ctx = { a, e, f };
  const confirmed = a.confirmationStatus === "confirmed";
  const inScope =
    scope.procedureType === "renewal" &&
    (scope.currentStatus.includes(TARGET_STATUS) || a.residenceStatus.includes(TARGET_STATUS));
  return {
    form: { ...FORM_META },
    applicantConfirmed: confirmed,
    warnings: [
      ...(inScope ? [] : [`この対応表は、在留期間更新許可申請（${TARGET_STATUS}）を対象としています。この案件は対象外の可能性があります。`]),
      ...(confirmed ? [] : ["申請人情報が確定していません。すべての項目を、原本と照合してから使用してください。"]),
    ],
    sheets: SHEETS.map((s) => ({
      title: s.title,
      items: s.defs
        .flatMap((d) => (typeof d === "function" ? d(ctx) : [d]))
        .map((d): TranscriptionItem => {
          const value = d.get ? d.get(ctx) : "";
          return { no: d.no, label: d.label, value, mode: modeOf(d, value, confirmed), note: d.note ?? "" };
        }),
    })),
  };
}
