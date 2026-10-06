import { HSP_EVIDENCE_RULE_PREFIX, RULE_SETS } from "../requirements/rules";
import type { Lang } from "./lang";

// ご案内書類に載せる、規則（lib/requirements/rules.ts）の書類名の訳表。
// キーは、規則の書類名（日本語の原文）そのもの。保存済みの content_json の書類名から、表示・出力の時点で引く。
// 訳文は、行政書士が依頼者へお渡しする前に確認する（docs/client-guide-languages.md）。
// 表示の書式（訳文（原文）／原文（Not translated））は、clientGuide.ts の requirementNameCell が決める。

type Translated = readonly [en: string, ko: string];

export const REQUIREMENT_NAME_TRANSLATIONS: Record<string, Translated> = {
  "写真（縦4cm×横3cm）": ["Photo (4 cm tall x 3 cm wide)", "사진(세로 4cm×가로 3cm)"],
  "パスポート及び在留カード（提示）": ["Passport and Residence Card (to be presented)", "여권 및 재류카드(제시)"],
  "申請人の活動内容を明らかにする書類（雇用契約書・労働条件通知書の写し等）": [
    "Documents showing the applicant's activities (e.g., a copy of the employment contract or the notice of working conditions)",
    "신청인의 활동 내용을 밝히는 서류(고용계약서·근로조건통지서 사본 등)",
  ],
  "住民税の課税（又は非課税）証明書及び納税証明書": [
    "Resident tax assessment (or exemption) certificate and tax payment certificate",
    "주민세 과세(또는 비과세) 증명서 및 납세증명서",
  ],
  "前年分の職員の給与所得の源泉徴収票等の法定調書合計表（受付印のあるものの写し）": [
    "Summary table of statutory reports, such as the withholding tax slips for employees' salaries of the previous year (a copy bearing the receipt stamp)",
    "전년도 직원 급여소득 원천징수영수증 등의 법정조서합계표(접수인이 찍힌 것의 사본)",
  ],
  "給与支払事務所等の開設届出書の写し": [
    "Copy of the notification of establishment of a salary payment office, etc.",
    "급여지급사무소 등 개설신고서 사본",
  ],
  "直近3か月分の所得税徴収高計算書の写し": [
    "Copy of the income tax collection statements for the most recent 3 months",
    "최근 3개월분 소득세 징수액 계산서 사본",
  ],
  "源泉所得税の納期の特例の承認に関する申請書の写し": [
    "Copy of the application for approval of the special payment deadline for withholding income tax",
    "원천소득세 납기 특례 승인 신청서 사본",
  ],
  "勤務先の事業内容・経営状況を明らかにする資料（決算文書の写し等）": [
    "Materials showing the employer's business and financial condition (e.g., a copy of the financial statements)",
    "근무처의 사업 내용·경영 상황을 밝히는 자료(결산 서류 사본 등)",
  ],
  "所属機関の代表者に関する申告書（参考様式）": [
    "Declaration concerning the representative of the affiliated organization (reference form)",
    "소속 기관 대표자에 관한 신고서(참고 양식)",
  ],
  "言語能力（CEFR・B2相当）を示す資料": [
    "Materials showing language ability (equivalent to CEFR B2)",
    "언어 능력(CEFR B2 상당)을 나타내는 자료",
  ],
  "派遣契約に基づいて就労する場合の資料（誓約書、派遣個別契約書、管理台帳等）": [
    "Materials if working under a dispatch contract (written pledge, individual dispatch contract, management ledger, etc.)",
    "파견계약에 따라 근무하는 경우의 자료(서약서, 파견 개별계약서, 관리대장 등)",
  ],
  "カテゴリー1に該当することを証明する文書（四季報の写し、上場を証明する文書の写し等）": [
    "Document proving that the organization falls under Category 1 (e.g., a copy of the Japan Company Handbook, a copy of a document proving a stock exchange listing)",
    "카테고리 1에 해당함을 증명하는 문서(『회사사계보(会社四季報)』 사본, 상장을 증명하는 문서 사본 등)",
  ],
  "在留申請オンラインシステムの利用申出の承認を証明する文書（承認のお知らせメール等）": [
    "Document proving approval of the application to use the Online Residency Application System (e.g., the approval notification e-mail)",
    "재류 신청 온라인 시스템 이용 신청의 승인을 증명하는 문서(승인 안내 이메일 등)",
  ],
  "提出書類省略に関する説明書（「留学」から「技術・人文知識・国際業務」又は「研究」への変更）（参考様式）": [
    "Explanation of omitted documents (change from \"Student\" to \"Engineer/Specialist in Humanities/International Services\" or \"Researcher\") (reference form)",
    "제출 서류 생략에 관한 설명서(「유학」에서 「기술·인문지식·국제업무」 또는 「연구」로 변경)(참고 양식)",
  ],
  "専門士・高度専門士の称号を付与されたことを証明する文書（専攻科修了の場合は修了証明書）": [
    "Document proving that the title of Senmonshi or Advanced Senmonshi was awarded (a certificate of completion if the advanced course was completed)",
    "전문사·고도전문사 칭호를 부여받았음을 증명하는 문서(전공과를 수료한 경우 수료증명서)",
  ],
  "申請人の派遣労働に関する誓約書（所属機関（派遣元）用・派遣先用）（参考様式）": [
    "Written pledge regarding the applicant's dispatch work (one for the affiliated organization (dispatching company) and one for the client company) (reference form)",
    "신청인의 파견 근로에 관한 서약서(소속 기관(파견 회사)용·파견처용)(참고 양식)",
  ],
  "派遣先での活動内容及び派遣契約期間を明らかにする資料の写し（労働条件通知書（雇用契約書）、労働者派遣個別契約書）": [
    "Copies of materials showing the activities at the client company and the dispatch contract period (notice of working conditions (employment contract), individual worker dispatch contract)",
    "파견처에서의 활동 내용 및 파견 계약 기간을 밝히는 자료의 사본(근로조건통지서(고용계약서), 근로자 파견 개별계약서)",
  ],
  "申請人の活動の内容等を明らかにする書類（労働条件通知書・役員報酬を定める定款等）": [
    "Documents showing the applicant's activities, etc. (notice of working conditions, articles of incorporation setting officers' remuneration, etc.)",
    "신청인의 활동 내용 등을 밝히는 서류(근로조건통지서·임원 보수를 정한 정관 등)",
  ],
  "申請人の学歴及び職歴その他経歴等を証明する文書（履歴書、卒業証明書、在職証明書等）": [
    "Documents proving the applicant's education, work history, and other background (résumé, graduation certificate, employment certificate, etc.)",
    "신청인의 학력 및 경력 등을 증명하는 문서(이력서, 졸업증명서, 재직증명서 등)",
  ],
  "登記事項証明書": ["Certificate of registered matters (commercial registry certificate)", "등기사항증명서"],
  "事業内容を明らかにする資料（沿革・役員・組織・事業内容が記載された案内書等）": [
    "Materials showing the business (e.g., a brochure describing the company history, officers, organization, and business)",
    "사업 내용을 밝히는 자료(연혁·임원·조직·사업 내용이 기재된 안내서 등)",
  ],
  "直近年度の決算文書の写し（新規事業の場合は事業計画書）": [
    "Copy of the financial statements of the most recent fiscal year (a business plan for a new business)",
    "최근 사업연도 결산 서류 사본(신규 사업의 경우 사업계획서)",
  ],
  "給与支払事務所等の開設届出書の写し（法定調書合計表を提出できない理由の資料）": [
    "Copy of the notification of establishment of a salary payment office, etc. (material explaining why the summary table of statutory reports cannot be submitted)",
    "급여지급사무소 등 개설신고서 사본(법정조서합계표를 제출할 수 없는 이유의 자료)",
  ],
  "直近3か月分の所得税徴収高計算書の写し（領収日付印のあるもの）": [
    "Copy of the income tax collection statements for the most recent 3 months (bearing the receipt date stamp)",
    "최근 3개월분 소득세 징수액 계산서 사본(영수일부인이 찍힌 것)",
  ],
  "源泉所得税の納期の特例の承認を受けていることを明らかにする資料": [
    "Material showing that approval of the special payment deadline for withholding income tax has been received",
    "원천소득세 납기 특례 승인을 받았음을 밝히는 자료",
  ],
  "返信用封筒（定形封筒に宛先を明記し、簡易書留用の切手を貼付したもの）": [
    "Return envelope (a standard-size envelope with the address written on it and stamps for simple registered mail attached)",
    "반신용 봉투(정형 봉투에 수신처를 명기하고 간이 등기우편용 우표를 붙인 것)",
  ],
  "所属機関のカテゴリーを証明する文書": [
    "Document proving the category of the affiliated organization",
    "소속 기관의 카테고리를 증명하는 문서",
  ],
  "専門士・高度専門士の称号を付与されたことを証明する文書（専攻科修了の場合は修了証明）": [
    "Document proving that the title of Senmonshi or Advanced Senmonshi was awarded (a certificate of completion if the advanced course was completed)",
    "전문사·고도전문사 칭호를 부여받았음을 증명하는 문서(전공과를 수료한 경우 수료 증명)",
  ],
  "派遣契約に基づいて就労する場合の資料（誓約書（派遣元用・派遣先用）、労働条件通知書、労働者派遣個別契約書）": [
    "Materials if working under a dispatch contract (written pledges (one for the dispatching company and one for the client company), notice of working conditions, individual worker dispatch contract)",
    "파견계약에 따라 근무하는 경우의 자료(서약서(파견 회사용·파견처용), 근로조건통지서, 근로자 파견 개별계약서)",
  ],
  "活動内容等を明らかにする資料（労働条件を明示する文書、役員報酬を定める定款の写し等）": [
    "Materials showing the activities, etc. (a document stating the working conditions, a copy of the articles of incorporation setting officers' remuneration, etc.)",
    "활동 내용 등을 밝히는 자료(근로조건을 명시한 문서, 임원 보수를 정한 정관 사본 등)",
  ],
  "学歴及び職歴その他経歴等を証明する文書（履歴書、卒業証明書又は在職証明書等）": [
    "Documents proving education, work history, and other background (résumé, graduation certificate, or employment certificate, etc.)",
    "학력 및 경력 등을 증명하는 문서(이력서, 졸업증명서 또는 재직증명서 등)",
  ],
  "事業内容を明らかにする資料（会社案内等）": [
    "Materials showing the business (e.g., a company brochure)",
    "사업 내용을 밝히는 자료(회사 소개서 등)",
  ],
  "直近年度の決算文書の写し": [
    "Copy of the financial statements of the most recent fiscal year",
    "최근 사업연도 결산 서류 사본",
  ],
  "源泉徴収の免除を受ける機関であることを明らかにする資料（外国法人の免除証明書等）": [
    "Material showing that the organization is exempt from withholding (e.g., an exemption certificate for a foreign corporation)",
    "원천징수 면제를 받는 기관임을 밝히는 자료(외국 법인의 면제증명서 등)",
  ],
  "旅券（パスポート）の写し": ["Copy of the passport", "여권 사본"],
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
  "事業内容を明らかにする資料（登記事項証明書、事業内容の詳細資料等）": [
    "Materials showing the business (certificate of registered matters, detailed materials on the business, etc.)",
    "사업 내용을 밝히는 자료(등기사항증명서, 사업 내용의 상세 자료 등)",
  ],
  "直近の年度の決算文書の写し": [
    "Copy of the financial statements of the most recent fiscal year",
    "최근 사업연도 결산 서류 사본",
  ],
  "事業を営むために必要な許認可の取得等を証する資料": [
    "Materials proving that the permits and licenses required to operate the business have been obtained",
    "사업을 영위하기 위해 필요한 허가·인가 등의 취득을 증명하는 자료",
  ],
  "事業所用施設の存在を明らかにする資料（不動産登記簿謄本、賃貸借契約書等）": [
    "Materials showing the existence of the business premises (certified copy of the real estate registry, lease agreement, etc.)",
    "사업소용 시설의 존재를 밝히는 자료(부동산 등기부등본, 임대차계약서 등)",
  ],
  "事業規模を明らかにする資料（常勤職員の賃金支払・住民票、貸借対照表、登記事項証明書等）": [
    "Materials showing the scale of the business (wage payments to and resident records of full-time employees, balance sheet, certificate of registered matters, etc.)",
    "사업 규모를 밝히는 자료(상근 직원의 임금 지급·주민표, 대차대조표, 등기사항증명서 등)",
  ],
  "日本語能力を明らかにする資料": ["Materials showing Japanese language ability", "일본어 능력을 밝히는 자료"],
  "経歴を明らかにする資料（学歴または職歴）": [
    "Materials showing background (education or work history)",
    "경력을 밝히는 자료(학력 또는 직무 경력)",
  ],
  "前年分の職員の源泉徴収票等の法定調書合計表を提出できない理由を明らかにする資料": [
    "Material explaining why the summary table of statutory reports, such as the withholding tax slips for employees of the previous year, cannot be submitted",
    "전년도 직원 원천징수영수증 등의 법정조서합계표를 제출할 수 없는 이유를 밝히는 자료",
  ],
  "ポイント計算表（高度専門職 第1号イ・ロ・ハのうち、活動の区分に応じたもの）": [
    "Points calculation table (Highly Skilled Professional, No. 1 (a), (b), or (c), whichever matches the type of activity)",
    "포인트 계산표(고도전문직 제1호 이·로·하 중 활동 구분에 해당하는 것)",
  ],
  "ポイント計算表の疎明資料（ポイントの合計が70点以上あることを確認できる資料）": [
    "Supporting materials for the points calculation table (materials confirming that the total is 70 points or more)",
    "포인트 계산표의 소명 자료(포인트 합계가 70점 이상임을 확인할 수 있는 자료)",
  ],
  "住民税の課税（又は非課税）証明書及び納税証明書（各1通）": [
    "Resident tax assessment (or exemption) certificate and tax payment certificate (1 copy each)",
    "주민세 과세(또는 비과세) 증명서 및 납세증명서(각 1통)",
  ],
  "住民税の納付を証明する資料（通帳の写し、領収証書等）": [
    "Materials proving payment of resident tax (copy of a bankbook, receipt, etc.)",
    "주민세 납부를 증명하는 자료(통장 사본, 영수증 등)",
  ],
  "住民税の資料の提出が困難な理由書": [
    "Written explanation of why it is difficult to submit the resident tax materials",
    "주민세 자료를 제출하기 어려운 이유서",
  ],
  "国税の納税証明書（その3）：源泉所得税及び復興特別所得税、申告所得税及び復興特別所得税、消費税及び地方消費税、相続税、贈与税の5税目": [
    "National tax payment certificate (Type 3): the 5 taxes of withholding income tax and special reconstruction income tax, income tax and special reconstruction income tax on tax returns, consumption tax and local consumption tax, inheritance tax, and gift tax",
    "국세 납세증명서(그 3): 원천소득세 및 부흥특별소득세, 신고소득세 및 부흥특별소득세, 소비세 및 지방소비세, 상속세, 증여세의 5개 세목",
  ],
  "所得を証明するもの（預貯金通帳の写しなど）": [
    "Proof of income (e.g., a copy of a bank account passbook)",
    "소득을 증명하는 것(예·적금 통장 사본 등)",
  ],
  "公的年金の保険料の納付状況を証明する資料（被保険者記録照会回答票等、ねんきん定期便、ねんきんネット、国民年金保険料領収証書など）": [
    "Materials proving payment of public pension premiums (insured-record inquiry reply form, Nenkin Teikibin notice, Nenkin Net, National Pension premium receipts, etc.)",
    "공적연금 보험료 납부 상황을 증명하는 자료(피보험자 기록 조회 회답표 등, 연금 정기 통지서, 연금넷, 국민연금 보험료 영수증 등)",
  ],
  "公的医療保険の保険料の納付状況を証明する資料（健康保険被保険者証、国民健康保険の納付証明書・領収証書など）": [
    "Materials proving payment of public health insurance premiums (health insurance card, National Health Insurance payment certificate or receipts, etc.)",
    "공적 의료보험 보험료 납부 상황을 증명하는 자료(건강보험 피보험자증, 국민건강보험 납부증명서·영수증 등)",
  ],
  "事業所の保険料に関する資料（領収証書、社会保険料納入証明書等）": [
    "Materials on the premiums of the business office (receipts, social insurance premium payment certificate, etc.)",
    "사업소의 보험료에 관한 자료(영수증, 사회보험료 납입증명서 등)",
  ],
  "80点以上を確認できる資料": [
    "Materials confirming a total of 80 points or more",
    "80점 이상임을 확인할 수 있는 자료",
  ],
  "旅券（提示）": ["Passport (to be presented)", "여권(제시)"],
  "旅券を提示できない理由を記載した理由書": [
    "Written explanation stating why the passport cannot be presented",
    "여권을 제시할 수 없는 이유를 기재한 이유서",
  ],
  "申請取次者の身分を証する文書等（提示）": [
    "Document proving the identity of the application agent, etc. (to be presented)",
    "신청 대행자(申請取次者)의 신분을 증명하는 문서 등(제시)",
  ],
  "国籍を証する書類": ["Document proving nationality", "국적을 증명하는 서류"],
  "事由を証する書類": ["Document proving the reason", "사유를 증명하는 서류"],
  "出生したことを証する書類": ["Document proving the birth", "출생했음을 증명하는 서류"],
  "両親の情報を記載した質問書": ["Questionnaire stating information on the parents", "부모의 정보를 기재한 질문서"],
  "世帯全員の住民票": [
    "Certificate of residence (Juminhyo) listing all household members",
    "세대원 전원의 주민표",
  ],
  "日本での活動内容に応じた資料": [
    "Materials according to the activities in Japan",
    "일본에서의 활동 내용에 따른 자료",
  ],
};

/** 規則の書類（規則の id で示す）か。行政書士が追加した書類（自由記述）は、規則の id を持たない */
const RULE_IDS = new Set(RULE_SETS.flatMap((s) => s.rules.map((r) => r.id)));
export function isRuleItemId(id: string): boolean {
  return RULE_IDS.has(id) || id.startsWith(HSP_EVIDENCE_RULE_PREFIX);
}

/** 書類名の訳。訳がなければ undefined（日本語の指定、または未登録） */
export function translatedRequirementName(name: string, lang: Lang): string | undefined {
  if (lang === "ja") return undefined;
  const t = REQUIREMENT_NAME_TRANSLATIONS[name];
  return t ? t[lang === "en" ? 0 : 1] : undefined;
}
