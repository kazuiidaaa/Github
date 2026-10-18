import type { Lang } from "./lang";

// 古い名称の書類名の訳（Issue #369）。
// 規則（lib/requirements/rules.ts）の書類名を入管庁の原文に合わせて変えた（#333）とき、現在の訳表（clientGuideNames.ts）から外した、古い名称の訳。
// 保存済みの案内書類は、保存した時点の書類名（日本語）を持つ。訳は保存しないため、古い名称のまま残る書類を英語・韓国語で表示するには、古い名称の訳が要る。
// 表示のときだけ引く：現在の訳表で見つからなかった場合に、この表を引く（translatedRequirementName）。
// 訳表の取り残し防止の試験（現在の規則に実在するか）の対象外。代わりに、現在の書類名と重複しないことを試験する（tests/clientGuideLegacyNames.test.ts）。
//
// 今後、規則の書類名を変えるときは、現在の訳表から訳を消さず、古い名称の訳をこの表へ移す。
// 新しい名称の訳は、現在の訳表（clientGuideNames.ts）に足す。

type Translated = readonly [en: string, ko: string];

export const LEGACY_REQUIREMENT_NAME_TRANSLATIONS: Record<string, Translated> = {
  "申請人の活動内容を明らかにする書類（雇用契約書・労働条件通知書の写し等）": [
    "Documents showing the applicant's activities (e.g., a copy of the employment contract or the notice of working conditions)",
    "신청인의 활동 내용을 밝히는 서류(고용계약서·근로조건통지서 사본 등)",
  ],
  "前年分の職員の給与所得の源泉徴収票等の法定調書合計表（受付印のあるものの写し）": [
    "Summary table of statutory reports, such as the withholding tax slips for employees' salaries of the previous year (a copy bearing the receipt stamp)",
    "전년도 직원 급여소득 원천징수영수증 등의 법정조서합계표(접수인이 찍힌 것의 사본)",
  ],
  "勤務先の事業内容・経営状況を明らかにする資料（決算文書の写し等）": [
    "Materials showing the employer's business and financial condition (e.g., a copy of the financial statements)",
    "근무처의 사업 내용·경영 상황을 밝히는 자료(결산 서류 사본 등)",
  ],
  "言語能力（CEFR・B2相当）を示す資料": [
    "Materials showing language ability (equivalent to CEFR B2)",
    "언어 능력(CEFR B2 상당)을 나타내는 자료",
  ],
  "派遣契約に基づいて就労する場合の資料（誓約書、派遣個別契約書、管理台帳等）": [
    "Materials if working under a dispatch contract (written pledge, individual dispatch contract, management ledger, etc.)",
    "파견계약에 따라 근무하는 경우의 자료(서약서, 파견 개별계약서, 관리대장 등)",
  ],
  "申請人の活動の内容等を明らかにする書類（労働条件通知書・役員報酬を定める定款等）": [
    "Documents showing the applicant's activities, etc. (notice of working conditions, articles of incorporation setting officers' remuneration, etc.)",
    "신청인의 활동 내용 등을 밝히는 서류(근로조건통지서·임원 보수를 정한 정관 등)",
  ],
  "直近年度の決算文書の写し（新規事業の場合は事業計画書）": [
    "Copy of the financial statements of the most recent fiscal year (a business plan for a new business)",
    "최근 사업연도 결산 서류 사본(신규 사업의 경우 사업계획서)",
  ],
  "給与支払事務所等の開設届出書の写し（法定調書合計表を提出できない理由の資料）": [
    "Copy of the notification of establishment of a salary payment office, etc. (material explaining why the summary table of statutory reports cannot be submitted)",
    "급여지급사무소 등 개설신고서 사본(법정조서합계표를 제출할 수 없는 이유의 자료)",
  ],
  "専門士・高度専門士の称号を付与されたことを証明する文書（専攻科修了の場合は修了証明）": [
    "Document proving that the title of Senmonshi or Advanced Senmonshi was awarded (a certificate of completion if the advanced course was completed)",
    "전문사·고도전문사 칭호를 부여받았음을 증명하는 문서(전공과를 수료한 경우 수료 증명)",
  ],
  "事業所用施設の存在を明らかにする資料（賃貸借契約書の写し等）": [
    "Materials showing the existence of the business premises (e.g., a copy of the lease agreement)",
    "사업소용 시설의 존재를 밝히는 자료(임대차계약서 사본 등)",
  ],
  "所属機関の代表者による申告書（参考様式）": [
    "Declaration by the representative of the affiliated organization (reference form)",
    "소속 기관 대표자에 의한 신고서(참고 양식)",
  ],
  "申請人の活動内容を明らかにする資料（役員就任、日本法人への転勤・他団体の役員就任、管理者としての雇用のいずれか）": [
    "Materials showing the applicant's activities (one of: appointment as an officer, transfer to a Japanese corporation or appointment as an officer of another organization, or employment as a manager)",
    "신청인의 활동 내용을 밝히는 자료(임원 취임, 일본 법인으로의 전근·다른 단체의 임원 취임, 관리자로서의 고용 중 하나)",
  ],
  "専門的知識を有する者による事業計画書の写し": [
    "Copy of the business plan prepared by a person with expert knowledge",
    "전문 지식을 가진 자가 작성한 사업계획서 사본",
  ],
  "事業所用施設の存在を明らかにする資料（不動産登記簿謄本、賃貸借契約書等）": [
    "Materials showing the existence of the business premises (certified copy of the real estate registry, lease agreement, etc.)",
    "사업소용 시설의 존재를 밝히는 자료(부동산 등기부등본, 임대차계약서 등)",
  ],
  "前年分の職員の源泉徴収票等の法定調書合計表を提出できない理由を明らかにする資料": [
    "Material explaining why the summary table of statutory reports, such as the withholding tax slips for employees of the previous year, cannot be submitted",
    "전년도 직원 원천징수영수증 등의 법정조서합계표를 제출할 수 없는 이유를 밝히는 자료",
  ],
};

/** 古い名称の訳。なければ undefined */
export function legacyRequirementNameTranslation(name: string, lang: Lang): string | undefined {
  if (lang === "ja") return undefined;
  const t = LEGACY_REQUIREMENT_NAME_TRANSLATIONS[name];
  return t ? t[lang === "en" ? 0 : 1] : undefined;
}
