import { formatDate } from "../format";
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
}

interface Def {
  no: string;
  label: string;
  mode: TranscriptionMode;
  get?: (c: Ctx) => string;
  note?: string;
}

const date = (v: string) => (v ? formatDate(v) : "");

/** 案件DBに項目がなく、行政書士が手入力する項目 */
const missing = (no: string, label: string, note?: string): Def => ({ no, label, mode: "missing", note });

const SHEETS: { title: string; defs: Def[] }[] = [
  {
    title: "申請人等作成用1",
    defs: [
      { no: "1", label: "国籍・地域", mode: "auto", get: (c) => c.a.nationality },
      { no: "2", label: "生年月日", mode: "auto", get: (c) => date(c.a.dateOfBirth) },
      { no: "3", label: "氏名", mode: "confirm", get: (c) => c.a.legalName, note: "旅券の身分事項ページの表記と照合する" },
      { no: "4", label: "性別", mode: "auto", get: (c) => c.a.gender },
      missing("5", "配偶者の有無"),
      missing("6", "職業"),
      missing("7", "本国における居住地"),
      { no: "8", label: "住居地", mode: "confirm", get: (c) => c.a.address, note: "在留カードの記載と照合する" },
      missing("9", "電話番号・携帯電話番号"),
      missing("10", "旅券（1）番号・（2）有効期限", "保存の可否は個人情報の方針で決定"),
      { no: "11", label: "現に有する在留資格", mode: "auto", get: (c) => c.a.residenceStatus },
      missing("11", "在留期間"),
      { no: "11", label: "在留期間の満了日", mode: "auto", get: (c) => date(c.a.residenceExpiryDate) },
      { no: "12", label: "在留カード番号", mode: "confirm", get: (c) => c.a.residenceCardNumber, note: "桁・英数字を原本と照合する" },
      missing("13", "希望する在留期間", "行政書士が判断する"),
      missing("14", "更新の理由", "行政書士が判断する"),
      missing("15", "犯罪を理由とする処分を受けたことの有無", "申請人の申告に基づき確認する"),
      missing("16", "在日親族（父・母・配偶者・子・兄弟姉妹・祖父母・叔(伯)父・叔(伯)母など）及び同居者", "複数行の表"),
    ],
  },
  {
    title: "申請人等作成用2（N）",
    defs: [
      { no: "17", label: "勤務先（1）名称", mode: "confirm", get: (c) => c.e.companyName },
      missing("17", "勤務先 支店・事業所名"),
      { no: "17", label: "勤務先（2）所在地", mode: "confirm", get: (c) => c.e.companyAddress, note: "主たる勤務場所の所在地" },
      missing("17", "勤務先（3）電話番号"),
      missing("18", "最終学歴"),
      missing("19", "専攻・専門分野"),
      missing("20", "情報処理技術者資格又は試験合格の有無"),
      missing("21", "職歴（外国におけるものを含む）", "複数行の表"),
      missing("22", "代理人（法定代理人による申請の場合）"),
      missing("取次者", "（1）氏名（2）住所（3）所属機関等・電話番号"),
    ],
  },
  {
    title: "所属機関等作成用1（N）",
    defs: [
      { no: "1", label: "契約又は招へいしている外国人の氏名", mode: "auto", get: (c) => c.a.legalName },
      { no: "2", label: "契約の形態", mode: "confirm", get: (c) => c.e.employmentType, note: "選択肢（雇用・委任・請負・その他）に対応付ける" },
      { no: "3", label: "（1）名称", mode: "confirm", get: (c) => c.e.companyName },
      missing("3", "（2）法人番号（13桁）"),
      missing("3", "（3）支店・事業所名"),
      missing("3", "（4）雇用保険適用事業所番号（11桁）"),
      { no: "3", label: "（5）業種", mode: "confirm", get: (c) => c.e.industry, note: "別紙「業種一覧」の番号へ変換する" },
      { no: "3", label: "（6）所在地", mode: "confirm", get: (c) => c.e.companyAddress, note: "電話番号は未保有" },
      { no: "3", label: "（7）資本金", mode: "confirm", get: (c) => c.e.capital, note: "単位は円" },
      missing("3", "（8）年間売上高（直近年度）"),
      { no: "3", label: "（9）従業員数", mode: "confirm", get: (c) => c.e.employeeCount, note: "外国人職員数は未保有" },
      { no: "4", label: "就労予定期間", mode: "confirm", get: (c) => c.e.contractPeriod, note: "「定めなし／定めあり」と年月に分けて記入する" },
      { no: "5", label: "雇用開始（入社）年月日", mode: "confirm", get: (c) => date(c.e.employmentStartDate) },
      {
        no: "6",
        label: "給与・報酬（税引き前）",
        mode: "confirm",
        get: (c) => c.e.monthlySalary,
        note: "各種手当・実費弁償を除いた額か確認する。年額・月額の別を合わせる",
      },
      missing("7", "実務経験年数"),
      missing("8", "職務上の地位（役職名）"),
      missing("9", "職種", "別紙「職種一覧」の2〜18、24〜31、51〜54、999から選択"),
      { no: "10", label: "活動内容詳細", mode: "confirm", get: (c) => c.e.jobDescription, note: "専門性の説明は行政書士が記述する" },
    ],
  },
  {
    title: "所属機関等作成用2（N）",
    defs: [missing("11", "派遣先等（人材派遣の場合、または勤務地が3と異なる場合）", "該当しない場合でも、この用紙は提出する")],
  },
];

function modeOf(def: Def, applicantConfirmed: boolean): TranscriptionMode {
  // 申請人情報が確定していない場合は、自動で載せる項目も確認が必要な項目として扱う
  if (def.mode === "auto" && !applicantConfirmed) return "confirm";
  return def.mode;
}

/** 現在の案件情報から、公式様式の項目順に並べた転記補助の内容を作る */
export function buildTranscription(
  a: Applicant,
  e: EmploymentInfo,
  scope: { procedureType: string; currentStatus: string },
): TranscriptionContent {
  const ctx: Ctx = { a, e };
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
      items: s.defs.map(
        (d): TranscriptionItem => ({
          no: d.no,
          label: d.label,
          value: d.get ? d.get(ctx) : "",
          mode: modeOf(d, confirmed),
          note: d.note ?? "",
        }),
      ),
    })),
  };
}
