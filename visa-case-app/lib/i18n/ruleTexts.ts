import { translatedRequirementName } from "@/lib/documents/clientGuideNames";
import type { Lang } from "@/lib/documents/lang";

/**
 * 必要書類の規則（lib/requirements/rules.ts）の、画面に出る文言の訳表。
 * キーは、規則の日本語の原文そのもの（書類名の訳表 lib/documents/clientGuideNames.ts と同じ方式）。
 * 規則の元の日本語は、書類の出力・案内書類の訳表が使うため、変更しない。画面の表示のときだけ、ここを引く。
 * - 書類名：clientGuideNames.ts の訳（案内書類と共通）を使い、ここには、そちらにない名称のみを置く。
 * - 注記（note）、規則集合の題名（title）、出典の名称：ここに置く。
 * 訳がなければ日本語の原文を表示する。訳文は、行政書士の確認前の下書き（確認の状態は reviewStatus.ts の caseRequirements）。
 * 全規則の文言が訳表にあることは、試験（tests/ruleTexts.test.ts）で確認する。
 */
type Translated = readonly [en: string, ko: string];

export const RULE_TEXT_TRANSLATIONS: Record<string, Translated> = {
  // 書類名（clientGuideNames.ts にないもの）
  "在留期間更新許可申請書": ["Application for permission for extension of the period of stay", "체류기간 연장 허가 신청서"],
  "在留資格変更許可申請書": ["Application for permission for change of status of residence", "체류자격 변경 허가 신청서"],
  "在留資格認定証明書交付申請書": ["Application for certificate of eligibility", "사증발급인정서 교부 신청서"],
  "在留資格取得許可申請書": ["Application for permission for acquisition of status of residence", "체류자격 취득 허가 신청서"],

  // 注記
  "規格を満たした、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの。令和8年6月14日以降に交付される在留カードからは、1歳以上の方について写真の提出が必要。中長期在留者とならない在留資格への変更を希望される場合は不要": [
    "A clear photo meeting the specifications, taken from the front within 6 months before the application, without a hat and with a plain background. For residence cards issued on or after June 14, 2026 (Reiwa 8), a photo is required for persons aged 1 or older. Not required if changing to a status that does not make the applicant a mid- to long-term resident",
    "규격을 충족하며 신청 전 6개월 이내에 정면에서 촬영한, 모자와 배경이 없는 선명한 것. 2026년(레이와 8년) 6월 14일 이후에 교부되는 재류카드부터는 만 1세 이상인 사람에 대해 사진 제출이 필요하다. 중장기 재류자가 되지 않는 체류자격으로 변경하려는 경우에는 불필요하다",
  ],
  "規格を満たした、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの。令和8年6月14日以降に交付される在留カードからは、1歳以上の方について写真の提出が必要。中長期在留者でない方の更新、3月以下の在留期間の更新も不要": [
    "A clear photo meeting the specifications, taken from the front within 6 months before the application, without a hat and with a plain background. For residence cards issued on or after June 14, 2026 (Reiwa 8), a photo is required for persons aged 1 or older. Also not required for the extension of a person who is not a mid- to long-term resident, or for an extension of a period of stay of 3 months or less",
    "규격을 충족하며 신청 전 6개월 이내에 정면에서 촬영한, 모자와 배경이 없는 선명한 것. 2026년(레이와 8년) 6월 14일 이후에 교부되는 재류카드부터는 만 1세 이상인 사람에 대해 사진 제출이 필요하다. 중장기 재류자가 아닌 사람의 연장 및 3개월 이하의 체류기간 연장에도 불필요하다",
  ],
  "直近1年分の総所得及び納税状況が記載されたもの": [
    "One showing the total income and tax payment status for the most recent year",
    "최근 1년분의 총소득 및 납세 상황이 기재된 것",
  ],
  "カテゴリーを証明する文書として提出する": ["Submitted as the document proving the category", "카테고리를 증명하는 문서로 제출한다"],
  "納期の特例の承認を受けている場合": ["If the special payment deadline has been approved", "납기 특례의 승인을 받은 경우"],
  "2026年4月15日以降の申請で提出する": ["Submit for applications made on or after April 15, 2026", "2026년 4월 15일 이후의 신청에서 제출한다"],
  "公式案内に列挙された文書のうち、提出可能なものを提出する。提出可能な文書がなければカテゴリー4となる": [
    "Submit whichever of the documents listed in the official guidance can be submitted. If none can be submitted, the organization falls under Category 4",
    "공식 안내에 열거된 문서 중 제출 가능한 것을 제출한다. 제출 가능한 문서가 없으면 카테고리 4가 된다",
  ],
  "カテゴリー2と同様の添付資料での申請を希望し、利用申出が承認された機関の場合のみ": [
    "Only for an organization that wishes to apply with the same attachments as Category 2 and whose application for use has been approved",
    "카테고리 2와 같은 첨부 자료로 신청하기를 희망하며 이용 신청이 승인된 기관의 경우에만",
  ],
  "派遣契約に基づいて就労する場合（申請人が被派遣者の場合）のみ": [
    "Only if working under a dispatch contract (where the applicant is the dispatched worker)",
    "파견계약에 따라 근무하는 경우(신청인이 피파견자인 경우)에만",
  ],
  "派遣形態で就労する場合のみ。更新と異なり、管理台帳・就業状況報告書は変更の案内に記載がない": [
    "Only if working as a dispatched worker. Unlike renewals, the management ledger and the work status report are not listed in the guidance for changes",
    "파견 형태로 근무하는 경우에만. 연장과 달리 관리대장·취업 상황 보고서는 변경 안내에 기재되어 있지 않다",
  ],
  "労働契約を締結する場合は労働条件を明示する文書。役員就任・外国法人の日本支店への転勤等の場合は公式案内の文書": [
    "If an employment contract is concluded, a document stating the working conditions. For appointment as an officer or transfer to the Japan branch of a foreign company, the documents given in the official guidance",
    "근로계약을 체결하는 경우에는 근로조건을 명시한 문서. 임원 취임·외국 법인의 일본 지점으로의 전근 등의 경우에는 공식 안내의 문서",
  ],
  "履歴書と、卒業証明書・在職証明書等のいずれか。IT技術者は情報処理技術の資格証書、外国の文化に基づく業務は3年以上の実務経験の証明": [
    "A résumé and either a graduation certificate, an employment certificate, etc. For IT engineers, a certificate of an information processing qualification; for work based on foreign culture, proof of 3 or more years of practical experience",
    "이력서와 졸업증명서·재직증명서 등 중 하나. IT 기술자는 정보처리기술 자격증서, 외국 문화에 기반한 업무는 3년 이상의 실무 경험 증명",
  ],
  "申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの。裏面に申請人の氏名を記載し、申請書の写真欄に貼付する": [
    "A clear photo taken from the front within 6 months before the application, without a hat and with a plain background. Write the applicant's name on the back and attach it to the photo field of the application form",
    "신청 전 6개월 이내에 정면에서 촬영한, 모자와 배경이 없는 선명한 것. 뒷면에 신청인의 성명을 기재하고 신청서의 사진란에 붙인다",
  ],
  "申請結果（認定証明書等）の返送に使用する": [
    "Used to return the result of the application (certificate of eligibility, etc.)",
    "신청 결과(인정증명서 등)의 반송에 사용한다",
  ],
  "カテゴリー1：四季報の写し等／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。カテゴリー2は、オンライン利用申出の承認を受けている場合はその承認を示す文書。提出可能な書類がなければカテゴリー4となる": [
    "Category 1: a copy of the Japan Company Handbook, etc. / Categories 2 and 3: a copy of the summary table of statutory reports, such as the withholding tax slips for employees' salaries of the previous year. For Category 2, if approval to use the online system has been obtained, a document showing that approval. If no document can be submitted, the organization falls under Category 4",
    "카테고리 1: 『회사사계보』 사본 등／카테고리 2·3: 전년도 직원 급여소득 원천징수영수증 등의 법정조서합계표(사본). 카테고리 2는 온라인 이용 신청의 승인을 받은 경우 그 승인을 나타내는 문서. 제출 가능한 서류가 없으면 카테고리 4가 된다",
  ],
"カテゴリー1：四季報の写し又は日本の証券取引所に上場していることを証明する文書（写し）／主務官庁から設立の許可を受けたことを証明する文書（写し）／イノベーション創出企業であることを証明する文書（例：補助金交付決定通知書の写し）／「一定の条件を満たす企業等」であることを証明する文書（例：認定証等の写し）のうち、提出可能なもの／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。カテゴリー2は、オンライン利用申出の承認を受けている場合はその承認を示す文書。提出可能な書類がなければカテゴリー4となる": [
    "Category 1: whichever can be submitted of a copy of the Japan Company Handbook or a document proving listing on a Japanese stock exchange (copy) / a document proving that permission of establishment was received from the competent ministry or agency (copy) / a document proving that the organization is an innovation-creating company (e.g., a copy of the subsidy grant decision notice) / a document proving that the organization is one of the 'companies, etc. satisfying certain conditions' (e.g., a copy of a certificate) / Categories 2 and 3: a copy of the summary table of statutory reports, such as the withholding tax slips for employees' salaries of the previous year. For Category 2, if approval to use the online system has been obtained, a document showing that approval. If no document can be submitted, the organization falls under Category 4",
    "카테고리 1: 『회사사계보』 사본 또는 일본 증권거래소 상장을 증명하는 문서(사본)／주무 관청으로부터 설립 허가를 받았음을 증명하는 문서(사본)／혁신 창출 기업임을 증명하는 문서(예: 보조금 교부 결정 통지서 사본)／'일정 조건을 충족하는 기업 등'임을 증명하는 문서(예: 인정증 등의 사본) 중 제출 가능한 것／카테고리 2·3: 전년도 직원 급여소득 원천징수영수증 등의 법정조서합계표(사본). 카테고리 2는 온라인 이용 신청의 승인을 받은 경우 그 승인을 나타내는 문서. 제출 가능한 서류가 없으면 카테고리 4가 된다",
  ],
  "労働契約の場合は労働条件通知書等。役員就任・外国法人の日本支店への転勤の場合は、公式案内の資料を提出する": [
    "For an employment contract, the notice of working conditions, etc. For appointment as an officer or transfer to the Japan branch of a foreign company, submit the materials given in the official guidance",
    "근로계약의 경우에는 근로조건통지서 등. 임원 취임·외국 법인의 일본 지점으로의 전근의 경우에는 공식 안내의 자료를 제출한다",
  ],
  "履歴書と、学歴又は職歴を証明する文書。外国の文化に基盤を有する業務では、3年以上の実務経験を証明する文書など、業務内容により異なる": [
    "A résumé and a document proving educational background or work history. For work based on foreign culture, this varies with the work, such as a document proving 3 or more years of practical experience",
    "이력서와 학력 또는 경력을 증명하는 문서. 외국 문화에 기반을 둔 업무에서는 3년 이상의 실무 경험을 증명하는 문서 등 업무 내용에 따라 다르다",
  ],
  "沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が記載されたもの、又はこれに準ずる文書": [
    "A document stating the history, officers, organization, business content (including main business partners and transaction record), etc., or an equivalent document",
    "연혁, 임원, 조직, 사업 내용(주요 거래처와 거래 실적 포함) 등이 기재된 것 또는 이에 준하는 문서",
  ],
  "新規事業の場合は事業計画書": ["For a new business, a business plan", "신규 사업의 경우에는 사업계획서"],
  "法定調書合計表を提出できない理由を明らかにする資料。源泉徴収の免除を受ける機関の場合のみ。この場合、下記の開設届出書等は別途確認すること": [
    "Material explaining why the summary table of statutory reports cannot be submitted. Only for an organization exempt from withholding. In this case, check separately the notification of establishment and other documents below",
    "법정조서합계표를 제출할 수 없는 이유를 밝히는 자료. 원천징수를 면제받는 기관의 경우에만. 이 경우 아래의 개설신고서 등은 별도로 확인할 것",
  ],
  "法定調書合計表を提出できない理由を明らかにする資料（源泉徴収の免除を受ける機関を除く）": [
    "Material explaining why the summary table of statutory reports cannot be submitted (excluding organizations exempt from withholding)",
    "법정조서합계표를 제출할 수 없는 이유를 밝히는 자료(원천징수를 면제받는 기관 제외)",
  ],
  "公式案内では、これ又は納期の特例の承認を示す資料のいずれか": [
    "In the official guidance, either this or material showing approval of the special payment deadline",
    "공식 안내에서는 이것 또는 납기 특례의 승인을 나타내는 자료 중 하나",
  ],
  "入管庁の案内では提示不要。実務では取得するのが通例。認定証明書上の氏名と旅券上の氏名の表記が異なる場合は、提出が可能であれば併せて提出する": [
    "Presenting it is not required in the Immigration Services Agency guidance, but in practice it is usually obtained. If the name on the certificate of eligibility differs from the name on the passport, submit it together if possible",
    "출입국재류관리청 안내에서는 제시가 불필요하지만, 실무에서는 취득하는 것이 통례이다. 사증발급인정서상의 성명과 여권상의 성명 표기가 다른 경우, 제출이 가능하면 함께 제출한다",
  ],
  "申請人が事業の管理に従事する場合のみ": ["Only if the applicant is engaged in business management", "신청인이 사업 관리에 종사하는 경우에만"],
  "カテゴリー4のみ": ["Category 4 only", "카테고리 4만"],
  "カテゴリー1：四季報の写し等／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。提出可能な書類がなければカテゴリー4となる": [
    "Category 1: a copy of the Japan Company Handbook, etc. / Categories 2 and 3: a copy of the summary table of statutory reports, such as the withholding tax slips for employees' salaries of the previous year. If no document can be submitted, the organization falls under Category 4",
    "카테고리 1: 『회사사계보』 사본 등／카테고리 2·3: 전년도 직원 급여소득 원천징수영수증 등의 법정조서합계표(사본). 제출 가능한 서류가 없으면 카테고리 4가 된다",
  ],
  "カテゴリー1：四季報の写し等のうち、提出可能な書類。日本貿易振興機構（JETRO）により対日投資支援企業として認定された企業であることを証明する文書は、更新のチェックシートのみに記載（案内ページには記載なし）。提出可能な書類がなければカテゴリー4となる": [
    "Category 1: whichever of the Japan Company Handbook copy, etc. can be submitted. The document proving that the company has been certified as a company supported for investment in Japan by the Japan External Trade Organization (JETRO) appears only in the renewal checklist (not on the guidance page). If no document can be submitted, the organization falls under Category 4",
    "카테고리 1: 『회사사계보』 사본 등 중 제출 가능한 서류. 일본무역진흥기구(JETRO)로부터 대일투자지원기업으로 인정받은 기업임을 증명하는 문서는 연장 체크시트에만 기재되어 있다(안내 페이지에는 기재 없음). 제출 가능한 서류가 없으면 카테고리 4가 된다",
  ],
  "事業を法人において行う場合のみ": ["Only if the business is conducted through a corporation", "사업을 법인에서 하는 경우에만"],
  "申請人が事業の管理に従事する場合のみ（チェックシートで△）": [
    "Only if the applicant is engaged in business management (marked △ in the checklist)",
    "신청인이 사업 관리에 종사하는 경우에만(체크시트에서 △)",
  ],
  "常勤職員の対象は、日本人、特別永住者、法別表第二の在留資格（永住者・日本人の配偶者等・永住者の配偶者等・定住者）で在留する外国人。法別表第一の在留資格の外国人は対象外（日本語能力を立証する者としては含まれる）。複数名いる場合は、少なくとも1名が基準を満たすことを確認できる資料でよい": [
    "The eligible full-time employees are Japanese nationals, special permanent residents, and foreign nationals residing under a status in Appended Table 2 of the Immigration Control Act (Permanent Resident, Spouse or Child of Japanese National, Spouse or Child of Permanent Resident, Long-Term Resident). Foreign nationals under a status in Appended Table 1 are not eligible (they are, however, included as persons who can demonstrate Japanese ability). If there are several, documents confirming that at least one of them meets the standard are sufficient",
    "상근 직원의 대상은 일본인, 특별영주자, 입관법 별표 제2의 체류자격(영주자·일본인의 배우자 등·영주자의 배우자 등·정주자)으로 체류하는 외국인이다. 별표 제1의 체류자격으로 체류하는 외국인은 대상이 아니다(일본어 능력을 입증하는 사람으로서는 포함된다). 여러 명이 있는 경우, 적어도 1명이 기준을 충족함을 확인할 수 있는 자료이면 된다",
  ],
  "個人事業主は、直近年度の決算文書に加え、必要に応じて事業経費などに関する領収書等を提出する": [
    "Sole proprietors submit the financial statements for the most recent fiscal year and, where necessary, receipts and the like relating to business expenses",
    "개인사업주는 최근 연도의 결산 서류에 더하여, 필요에 따라 사업 경비 등에 관한 영수증 등을 제출한다",
  ],
  "申請人又は常勤職員のいずれかが、B2相当以上の日本語能力を有することが必要。日本人・特別永住者以外は、日本語能力試験（JLPT）N2以上、BJTビジネス日本語能力テスト400点以上、中長期在留者として20年以上の在留、本邦の大学等高等教育機関の卒業（高等専門学校・専門学校を含む。恒常的に外国語による授業を行う課程・通信課程を除く）、本邦の義務教育修了と高等学校卒業（中学校から編入した場合は該当しない）のいずれかに該当することを確認する。試験は合格証・成績証明書、その他は日本語能力を有する者の身分及び経歴を証する資料（住民票、卒業証明書等）。申請書（所属機関作成用1）3（11）の「内容」欄に具体的に記入する": [
    "Either the applicant or a full-time employee must have Japanese ability equivalent to B2 or higher. Other than Japanese nationals and special permanent residents, it is confirmed that the person meets one of the following: JLPT N2 or higher; a BJT Business Japanese Proficiency Test score of 400 or more; residence in Japan as a mid- to long-term resident for 20 years or more; graduation from a university or other higher education institution in Japan (including colleges of technology and specialized training colleges, but excluding courses regularly taught in a foreign language and correspondence courses); or completion of compulsory education in Japan and graduation from senior high school (not applicable if the person transferred in from junior high school). Submit the pass certificate or score report for a test, or otherwise materials proving the identity and career of the person with Japanese ability (certificate of residence, graduation certificate, etc.). Fill in the \"content\" column of item 3 (11) of the application (Form 1 for the affiliated organization) specifically",
    "신청인 또는 상근 직원 중 어느 한 사람이 B2 상당 이상의 일본어 능력을 갖추어야 한다. 일본인·특별영주자 이외에는 일본어능력시험(JLPT) N2 이상, BJT 비즈니스 일본어능력테스트 400점 이상, 중장기 체류자로서 20년 이상 체류, 일본 내 대학 등 고등교육기관 졸업(고등전문학교·전문학교 포함. 상시적으로 외국어로 수업하는 과정·통신 과정 제외), 일본의 의무교육 수료 및 고등학교 졸업(중학교에서 편입한 경우는 해당하지 않음) 중 하나에 해당함을 확인한다. 시험은 합격증·성적증명서, 그 밖의 방법은 일본어 능력을 갖춘 사람의 신분 및 경력을 증명하는 자료(주민표, 졸업증명서 등)를 제출한다. 신청서(소속기관 작성용 1) 3(11)의 '내용' 란에 구체적으로 기입한다",
  ],
  "経営管理又は申請に係る事業の業務に必要な技術・知識に係る分野の博士・修士・専門職の学位（外国で授与された相当する学位を含む）、又は事業の経営・管理の3年以上の経験が必要。特定活動の起業準備活動の期間も経験に含む": [
    "A doctorate, master's or professional degree in a field relating to business management or the technology or knowledge required for the business in question (including an equivalent degree conferred abroad), or at least 3 years of experience in business management or administration, is required. The period of the Designated Activities start-up preparation activities is included in the experience",
    "경영관리 또는 신청에 관한 사업의 업무에 필요한 기술·지식 분야의 박사·석사·전문직 학위(외국에서 수여된 상당 학위 포함) 또는 사업의 경영·관리에 대한 3년 이상의 경험이 필요하다. 특정활동의 창업 준비 활동 기간도 경험에 포함된다",
  ],
  "事業計画書を評価する専門家は、日本の中小企業診断士・公認会計士・税理士の資格を持つ者（施行後に対象者が変わる場合は入管庁のホームページで告知される）。申請人の会社の役員・従業員は評価者として認められない（外部顧問は差し支えない）": [
    "The experts who evaluate the business plan are persons qualified in Japan as a Small and Medium Enterprise Management Consultant, Certified Public Accountant or Certified Tax Accountant (if the eligible persons change after enforcement, this will be announced on the Immigration Services Agency website). Officers and employees of the applicant's company are not accepted as evaluators (external advisors are acceptable)",
    "사업계획서를 평가하는 전문가는 일본의 중소기업진단사·공인회계사·세무사 자격을 가진 사람이다(시행 후 대상자가 변경되는 경우 출입국재류관리청 홈페이지에서 공지된다). 신청인 회사의 임원·직원은 평가자로 인정되지 않는다(외부 고문은 무방하다)",
  ],
  "在留許可を受けてからでないと取得できないなど、取得できないことに正当な理由が認められる場合は、取得できない具体的理由を説明した文書（様式自由）を提出する。取得状況は次回の在留期間更新許可申請時に確認される": [
    "If there is a justifiable reason why a license cannot be obtained, such as that it can be obtained only after the residence permission is granted, submit a document (free format) explaining the specific reason why it cannot be obtained. The status of acquisition will be checked at the next application for extension of the period of stay",
    "재류허가를 받은 후가 아니면 취득할 수 없는 등, 취득할 수 없는 데에 정당한 이유가 인정되는 경우에는, 취득할 수 없는 구체적 이유를 설명한 문서(양식 자유)를 제출한다. 취득 상황은 다음 체류기간 갱신 허가 신청 시에 확인된다",
  ],
  "自宅を事業所と兼ねることは、原則として認められない": [
    "Using one's home also as the business office is not permitted in principle",
    "자택을 사업소와 겸하는 것은 원칙적으로 인정되지 않는다",
  ],
  "常勤職員の対象は、日本人、特別永住者、法別表第二の在留資格（永住者・日本人の配偶者等・永住者の配偶者等・定住者）で在留する外国人。法別表第一の在留資格の外国人は対象外（日本語能力を立証する者としては含まれる）。複数名いる場合は、少なくとも1名が基準を満たすことを確認できる資料でよい。最初の決算期が到来していない場合も、設立時又は設立後の任意の時点の貸借対照表を作成して提出する。事業内容を明らかにする資料（1）として登記事項証明書を提出済みの場合は不要": [
    "The eligible full-time employees are Japanese nationals, special permanent residents, and foreign nationals residing under a status in Appended Table 2 of the Immigration Control Act (Permanent Resident, Spouse or Child of Japanese National, Spouse or Child of Permanent Resident, Long-Term Resident). Foreign nationals under a status in Appended Table 1 are not eligible (they are, however, included as persons who can demonstrate Japanese ability). If there are several, documents confirming that at least one of them meets the standard are sufficient. Even if the first fiscal year-end has not yet arrived, prepare and submit a balance sheet as of the time of establishment or any point after establishment. Not required if a certificate of registered matters has already been submitted as material (1) showing the business content",
    "상근 직원의 대상은 일본인, 특별영주자, 입관법 별표 제2의 체류자격(영주자·일본인의 배우자 등·영주자의 배우자 등·정주자)으로 체류하는 외국인이다. 별표 제1의 체류자격으로 체류하는 외국인은 대상이 아니다(일본어 능력을 입증하는 사람으로서는 포함된다). 여러 명이 있는 경우, 적어도 1명이 기준을 충족함을 확인할 수 있는 자료이면 된다. 첫 결산기가 도래하지 않은 경우에도, 설립 시 또는 설립 후 임의의 시점의 대차대조표를 작성하여 제출한다. 사업 내용을 밝히는 자료(1)로 등기사항증명서를 이미 제출한 경우에는 불필요",
  ],
  "常勤職員の対象は、日本人、特別永住者、法別表第二の在留資格（永住者・日本人の配偶者等・永住者の配偶者等・定住者）で在留する外国人。法別表第一の在留資格の外国人は対象外（日本語能力を立証する者としては含まれる）。複数名いる場合は、少なくとも1名が基準を満たすことを確認できる資料でよい。事業内容を明らかにする資料（1）として登記事項証明書を提出済みの場合は不要": [
    "The eligible full-time employees are Japanese nationals, special permanent residents, and foreign nationals residing under a status in Appended Table 2 of the Immigration Control Act (Permanent Resident, Spouse or Child of Japanese National, Spouse or Child of Permanent Resident, Long-Term Resident). Foreign nationals under a status in Appended Table 1 are not eligible (they are, however, included as persons who can demonstrate Japanese ability). If there are several, documents confirming that at least one of them meets the standard are sufficient. Not required if a certificate of registered matters has already been submitted as material (1) showing the business content",
    "상근 직원의 대상은 일본인, 특별영주자, 입관법 별표 제2의 체류자격(영주자·일본인의 배우자 등·영주자의 배우자 등·정주자)으로 체류하는 외국인이다. 별표 제1의 체류자격으로 체류하는 외국인은 대상이 아니다(일본어 능력을 입증하는 사람으로서는 포함된다). 여러 명이 있는 경우, 적어도 1명이 기준을 충족함을 확인할 수 있는 자료이면 된다. 사업 내용을 밝히는 자료(1)로 등기사항증명서를 이미 제출한 경우에는 불필요",
  ],
  "更新の案内ページ・チェックシートには記載なし": [
    "Not listed on the guidance page or in the checklist for renewals",
    "연장 안내 페이지·체크시트에는 기재 없음",
  ],
  "案内ページに記載あり（提示）、チェックシートには記載なし。本邦に新たに事業所を設置する場合で、事業所の経営者又は管理者が不在の間の事業所設置業務全般を任されている方が申請書類を提出するときのみ": [
    "Listed on the guidance page (to be presented) but not in the checklist. Only when the person submitting the application documents is entrusted with all the work of setting up a new business office in Japan while the manager or administrator of the office is absent",
    "안내 페이지에는 기재(제시)되어 있으나 체크시트에는 기재 없음. 본방에 새로 사업소를 설치하는 경우로서, 사업소의 경영자 또는 관리자가 부재한 동안 사업소 설치 업무 전반을 맡은 사람이 신청서류를 제출할 때에만",
  ],
  "申請に当たっての説明書（参考様式）と、公租公課の履行を証する資料のうち該当する全て。所属機関が法人の場合は、労働保険・社会保険の加入状況及び料金の納付状況を証する文書、源泉所得税及び復興特別所得税・法人税・消費税及び地方消費税の納税証明書、法人住民税・法人事業税の納税証明書。所属機関が個人の場合は、労働保険・社会保険・国民健康保険の加入状況及び料金の納付状況を証する文書、源泉所得税及び復興特別所得税・申告所得税及び復興特別所得税・消費税及び地方消費税・相続税・贈与税の納税証明書、個人住民税・個人事業税の納税証明書。社会保険への加入義務のない個人事業主は、社会保険の強制適用事業所に該当しないことを説明する資料。社会保険への加入義務のない個人事業主でも、各職員の国民健康保険の加入状況は不要": [
    "The explanatory statement for the application (reference form), and all applicable materials proving payment of public taxes and charges. If the organization is a corporation: documents proving enrollment in and payment for labor insurance and social insurance; tax payment certificates for withholding income tax and special reconstruction income tax, corporate tax, and consumption tax and local consumption tax; tax payment certificates for corporate inhabitant tax and corporate business tax. If the organization is an individual: documents proving enrollment in and payment for labor insurance, social insurance and national health insurance; tax payment certificates for withholding income tax and special reconstruction income tax, income tax on final return and special reconstruction income tax, consumption tax and local consumption tax, inheritance tax and gift tax; tax payment certificates for individual inhabitant tax and individual business tax. A sole proprietor not obliged to enroll in social insurance submits material explaining that the business is not a mandatory-coverage business establishment for social insurance. Even a sole proprietor not obliged to join social insurance need not submit the national health insurance enrollment status of each employee",
    "신청에 관한 설명서(참고 양식)와, 공조공과 이행을 증명하는 자료 중 해당하는 모든 것. 소속 기관이 법인인 경우: 노동보험·사회보험의 가입 상황 및 요금 납부 상황을 증명하는 문서, 원천소득세 및 부흥특별소득세·법인세·소비세 및 지방소비세의 납세증명서, 법인주민세·법인사업세의 납세증명서. 소속 기관이 개인인 경우: 노동보험·사회보험·국민건강보험의 가입 상황 및 요금 납부 상황을 증명하는 문서, 원천소득세 및 부흥특별소득세·신고소득세 및 부흥특별소득세·소비세 및 지방소비세·상속세·증여세의 납세증명서, 개인주민세·개인사업세의 납세증명서. 사회보험 가입 의무가 없는 개인사업자는 사회보험의 강제적용사업소에 해당하지 않음을 설명하는 자료. 사회보험 가입 의무가 없는 개인사업주라도, 각 직원의 국민건강보험 가입 상황은 제출할 필요가 없다",
  ],
  "1号イ・ロ・ハのいずれかのシート。要件：1号又は高度外国人材としての特定活動で3年以上在留し、70点以上であること。合計70点以上が必要。年収が300万円に満たないときは、他の項目の合計が70点以上でも、高度専門職外国人としては認められない": [
    "Any one of the sheets for Type 1 (a), (b) or (c). Requirement: having resided for 3 or more years under Type 1 or Designated Activities as a highly skilled foreign professional, with 70 points or more. A total of 70 points or more is required. If the annual income is under 3 million yen, the person is not recognized as a highly skilled foreign professional even if the other items total 70 points or more",
    "1호 이·로·하 중 어느 하나의 시트. 요건: 1호 또는 고도 외국인재로서의 특정활동으로 3년 이상 체류하고 70점 이상일 것. 합계 70점 이상이 필요. 연수입이 300만 엔에 미치지 못하는 경우에는 다른 항목의 합계가 70점 이상이어도 고도전문직 외국인으로 인정되지 않는다",
  ],
  "該当する全項目の資料は不要。審査の過程で、追加の資料を求められる場合がある。ポイント計算表の項目を選ぶと、その疎明資料の番号（①〜㉑）ごとの項目が、この下に出る（docs/hsp-point-evidence.md）": [
    "Materials for all applicable items are not required. Additional materials may be requested during examination. When you select items in the points calculation table, entries for each supporting material number (① to ㉑) appear below (docs/hsp-point-evidence.md)",
    "해당하는 모든 항목의 자료는 불필요. 심사 과정에서 추가 자료를 요구받을 수 있다. 포인트 계산표의 항목을 선택하면 그 소명 자료 번호(①~㉑)별 항목이 이 아래에 표시된다(docs/hsp-point-evidence.md)",
  ],
  "直近5年分の所得及び納税状況を証明する資料。70点以上を維持して3年以上継続在留している場合は、直近3年分でよい。80点以上を維持して1年以上継続在留している場合は、直近1年分でよい。発行日から3か月以内のもの": [
    "Material proving the income and tax payment status for the most recent 5 years. If the person has maintained 70 points or more and resided continuously for 3 or more years, the most recent 3 years suffice. If the person has maintained 80 points or more and resided continuously for 1 or more years, the most recent year suffices. Issued within 3 months",
    "최근 5년분의 소득 및 납세 상황을 증명하는 자료. 70점 이상을 유지하며 3년 이상 계속 체류한 경우에는 최근 3년분이면 된다. 80점 이상을 유지하며 1년 이상 계속 체류한 경우에는 최근 1년분이면 된다. 발급일로부터 3개월 이내의 것",
  ],
  "直近3年間すべて特別徴収の場合は不要。提出が困難な場合は、その理由書を提出する": [
    "Not required if resident tax was collected by special collection (withholding) for all of the most recent 3 years. If submission is difficult, submit a written explanation",
    "최근 3년간 모두 특별징수인 경우에는 불필요. 제출이 어려운 경우에는 그 이유서를 제출한다",
  ],
  "住民税の納付を証明する資料を提出できない場合のみ": [
    "Only if the materials proving payment of resident tax cannot be submitted",
    "주민세 납부를 증명하는 자료를 제출할 수 없는 경우에만",
  ],
  "直近5年分の所得及び納税状況を証明する資料。発行日から3か月以内のもの": [
    "Material proving the income and tax payment status for the most recent 5 years. Issued within 3 months",
    "최근 5년분의 소득 및 납세 상황을 증명하는 자료. 발급일로부터 3개월 이내의 것",
  ],
  "直近5年分の所得及び納税状況を証明する資料": [
    "Material proving the income and tax payment status for the most recent 5 years",
    "최근 5년분의 소득 및 납세 상황을 증명하는 자료",
  ],
  "直近2年間。80点以上を維持して1年以上継続在留している場合は、直近1年分でよい。発行日から3か月以内のもの": [
    "The most recent 2 years. If the person has maintained 80 points or more and resided continuously for 1 or more years, the most recent year suffices. Issued within 3 months",
    "최근 2년간. 80점 이상을 유지하며 1년 이상 계속 체류한 경우에는 최근 1년분이면 된다. 발급일로부터 3개월 이내의 것",
  ],
  "申請時に、社会保険適用事業所の事業主である場合のみ。80点以上を維持して1年以上継続在留している場合は、直近1年分でよい": [
    "Only if, at the time of application, the person is the owner of a business office covered by social insurance. If the person has maintained 80 points or more and resided continuously for 1 or more years, the most recent year suffices",
    "신청 시 사회보험 적용 사업소의 사업주인 경우에만. 80점 이상을 유지하며 1년 이상 계속 체류한 경우에는 최근 1년분이면 된다",
  ],
  "80点以上として、提出資料の一部の省略を希望する場合のみ": [
    "Only if omission of some of the submitted materials is requested on the basis of 80 points or more",
    "80점 이상으로서 제출 자료의 일부 생략을 희망하는 경우에만",
  ],
  "1号イ・ロ・ハのうち、活動の区分に応じた1通。合計70点以上が必要。年収が300万円に満たないときは、他の項目の合計が70点以上でも、高度専門職外国人としては認められない": [
    "One sheet from Type 1 (a), (b) or (c), according to the category of activity. A total of 70 points or more is required. If the annual income is under 3 million yen, the person is not recognized as a highly skilled foreign professional even if the other items total 70 points or more",
    "1호 이·로·하 중 활동 구분에 따른 1통. 합계 70점 이상이 필요. 연수입이 300만 엔에 미치지 못하는 경우에는 다른 항목의 합계가 70점 이상이어도 고도전문직 외국인으로 인정되지 않는다",
  ],
  "事由が生じた日から30日以内に申請する（手数料は無料）": [
    "Apply within 30 days from the date on which the cause arose (no fee)",
    "사유가 발생한 날로부터 30일 이내에 신청한다(수수료 무료)",
  ],
  "行政書士提供の一覧で、出生には写真の記載がない（出生では必要書類に含めていない。実務での扱いは要確認）": [
    "In the list provided by the administrative scrivener, no photo is listed for birth (it is not included in the required documents for birth; confirm the practice)",
    "행정서사가 제공한 목록에서 출생에는 사진의 기재가 없다(출생에서는 필요 서류에 포함하지 않았다. 실무상의 취급은 확인 필요)",
  ],
  "提示のみで、提出書類としてコピーを付ける書類ではない": [
    "To be presented only; not a document for which a copy is attached as a submitted document",
    "제시만 하며, 제출 서류로서 사본을 첨부하는 서류가 아니다",
  ],
  "旅券を提示できない場合のみ": ["Only if the passport cannot be presented", "여권을 제시할 수 없는 경우에만"],
  "申請取次者が書類を提出する場合のみ": [
    "Only if an application agent submits the documents",
    "신청 대행자(申請取次者)가 서류를 제출하는 경우에만",
  ],
  "主に日米地位協定による在留者が、協定上の地位を失った場合など": [
    "For example, when a person residing mainly under the Japan-U.S. Status of Forces Agreement loses their status under the agreement",
    "주로 미일 지위협정에 의한 체류자가 협정상의 지위를 상실한 경우 등",
  ],
  "希望する在留資格に応じた資料（別途 規則が整備されている在留資格ではその規則を参照）": [
    "Materials according to the desired status of residence (for a status with its own rules, refer to those rules)",
    "희망하는 체류자격에 따른 자료(별도로 규칙이 정비된 체류자격에서는 그 규칙을 참조)",
  ],
  "ポイント計算表で選んだ項目から導いた疎明資料。70点以上を確認できる資料があれば足りるため、提出するものを「判断」で必要に切り替える": [
    "Supporting material derived from the items selected in the points calculation table. Material confirming 70 points or more is sufficient, so switch the ones to be submitted to \"required\" in the decision column",
    "포인트 계산표에서 선택한 항목에서 도출한 소명 자료. 70점 이상을 확인할 수 있는 자료가 있으면 충분하므로, 제출할 것을 '판단'에서 필요로 전환한다",
  ],
  "ポイント計算表で選んだ項目（資格・投資運用業等）から導いた疎明資料。選んだ以上、証する資料の提出が必要": [
    "Supporting material derived from the items selected in the points calculation table (qualifications, investment management, etc.). Since the item was selected, submission of the material proving it is required",
    "포인트 계산표에서 선택한 항목(자격·투자운용업 등)에서 도출한 소명 자료. 선택한 이상 이를 증명하는 자료의 제출이 필요하다",
  ],

  // 規則集合の題名
  "技術・人文知識・国際業務 在留期間更新許可申請": [
    "Engineer / Specialist in Humanities / International Services: application for extension of the period of stay",
    "기술·인문지식·국제업무 체류기간 연장 허가 신청",
  ],
  "技術・人文知識・国際業務 在留資格変更許可申請": [
    "Engineer / Specialist in Humanities / International Services: application for change of status of residence",
    "기술·인문지식·국제업무 체류자격 변경 허가 신청",
  ],
  "技術・人文知識・国際業務 在留資格認定証明書交付申請": [
    "Engineer / Specialist in Humanities / International Services: application for certificate of eligibility",
    "기술·인문지식·국제업무 사증발급인정서 교부 신청",
  ],
  "経営・管理 在留期間更新許可申請": [
    "Business Manager: application for extension of the period of stay",
    "경영·관리 체류기간 연장 허가 신청",
  ],
  "経営・管理 在留資格変更許可申請": [
    "Business Manager: application for change of status of residence",
    "경영·관리 체류자격 변경 허가 신청",
  ],
  "経営・管理 在留資格認定証明書交付申請": [
    "Business Manager: application for certificate of eligibility",
    "경영·관리 사증발급인정서 교부 신청",
  ],
  "高度専門職2号への在留資格変更許可申請（共通書類・ポイント計算表・疎明資料・所得納税社会保険の書類のみ整備。他の書類は未整備）": [
    "Application for change of status of residence to Highly Skilled Professional (ii) (only the common documents, points calculation table, supporting materials, and income, tax and social insurance documents are covered; other documents are not yet covered)",
    "고도전문직 2호로의 체류자격 변경 허가 신청(공통 서류·포인트 계산표·소명 자료·소득 납세 사회보험 서류만 정비. 다른 서류는 미정비)",
  ],
  "高度専門職（1号）への在留資格変更許可申請（共通書類・ポイント計算表・疎明資料のみ整備。他の書類は未整備）": [
    "Application for change of status of residence to Highly Skilled Professional (i) (only the common documents, points calculation table and supporting materials are covered; other documents are not yet covered)",
    "고도전문직(1호)으로의 체류자격 변경 허가 신청(공통 서류·포인트 계산표·소명 자료만 정비. 다른 서류는 미정비)",
  ],
  "高度専門職 在留資格認定証明書交付申請（共通書類・ポイント計算表・疎明資料のみ整備。他の書類は未整備）": [
    "Highly Skilled Professional: application for certificate of eligibility (only the common documents, points calculation table and supporting materials are covered; other documents are not yet covered)",
    "고도전문직 사증발급인정서 교부 신청(공통 서류·포인트 계산표·소명 자료만 정비. 다른 서류는 미정비)",
  ],
  "高度専門職（1号）の在留期間更新許可申請（共通書類・ポイント計算表・疎明資料のみ整備。他の書類は未整備）": [
    "Application for extension of the period of stay as Highly Skilled Professional (i) (only the common documents, points calculation table and supporting materials are covered; other documents are not yet covered)",
    "고도전문직(1호)의 체류기간 연장 허가 신청(공통 서류·포인트 계산표·소명 자료만 정비. 다른 서류는 미정비)",
  ],
  "高度専門職 在留資格取得許可申請（一部のみ整備）": [
    "Highly Skilled Professional: application for permission for acquisition of status of residence (only partly covered)",
    "고도전문직 체류자격 취득 허가 신청(일부만 정비)",
  ],
  "参考書式。活動の区分（高度専門職1号イ・ロ・ハ）に応じ、いずれかの分野のものを1通": [
    "Reference form. One sheet from any one field, according to the category of activity (Highly Skilled Professional Type 1 (a), (b) or (c))",
    "참고 서식. 활동 구분(고도전문직 1호 이·로·하)에 따라 어느 한 분야의 것을 1통",
  ],
  "ポイント計算表の各項目に関する疎明資料。ポイントの合計が70点以上あることを確認できる資料を提出すれば足り、該当する項目全ての疎明資料を提出する必要はない。ポイント計算表の項目を選ぶと、その疎明資料の番号（①〜㉑）ごとの項目が、この下に出る（docs/hsp-point-evidence.md）": [
    "Supporting materials for each item of the points calculation table. It is sufficient to submit materials confirming that the total is 70 points or more; supporting materials for all applicable items need not be submitted. When you select items in the points calculation table, entries for each supporting material number (① to ㉑) appear below (docs/hsp-point-evidence.md)",
    "포인트 계산표의 각 항목에 관한 소명 자료. 포인트 합계가 70점 이상임을 확인할 수 있는 자료를 제출하면 충분하며, 해당하는 모든 항목의 소명 자료를 제출할 필요는 없다. 포인트 계산표의 항목을 선택하면 그 소명 자료 번호(①~㉑)별 항목이 이 아래에 표시된다(docs/hsp-point-evidence.md)",
  ],
  "指定の規格を満たした写真を用意し、申請書に添付して提出する。規格を満たさない写真の場合は撮り直しになる。在留カードの交付の日において年齢が1歳に満たない方は、写真の提出は不要。令和8年6月13日以前は16歳未満の方が不要だったが、令和8年6月14日以降に交付される在留カードからは1歳以上の方について必要": [
    "Prepare a photo that meets the specified standards and attach it to the application form. If a photo that does not meet the standards is used, you will be asked to retake it. A photo is not required for a person who is under 1 year of age on the date the residence card is issued. Until June 13, 2026 (Reiwa 8), persons under 16 were exempt, but for residence cards issued on or after June 14, 2026, a photo is required for persons aged 1 or older",
    "지정된 규격을 충족하는 사진을 준비하여 신청서에 첨부해 제출한다. 규격을 충족하지 않는 사진인 경우에는 다시 촬영하게 된다. 재류카드 교부일 기준으로 만 1세 미만인 사람은 사진 제출이 필요하지 않다. 2026년(레이와 8년) 6월 13일까지는 16세 미만인 사람이 불필요했으나, 2026년 6월 14일 이후에 교부되는 재류카드부터는 만 1세 이상인 사람에 대해 필요하다",
  ],
  "指定の規格を満たした写真を用意し、申請書に添付して提出する。規格を満たさない写真の場合は撮り直しになる。在留カードの交付の日において年齢が1歳に満たない方は、写真の提出は不要。令和8年6月13日以前は16歳未満の方が不要だったが、令和8年6月14日以降に交付される在留カードからは1歳以上の方について必要。チェックシートでは、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なものとし、写真の裏面に申請人の氏名を記載して、申請書の写真欄に貼付する": [
    "Prepare a photo that meets the specified standards and attach it to the application form. If a photo that does not meet the standards is used, you will be asked to retake it. A photo is not required for a person who is under 1 year of age on the date the residence card is issued. Until June 13, 2026 (Reiwa 8), persons under 16 were exempt, but for residence cards issued on or after June 14, 2026, a photo is required for persons aged 1 or older. According to the checklist, the photo must be clear, taken from the front within 6 months before the application, without a hat and with a plain background; write the applicant's name on the back and affix it to the photo field of the application form",
    "지정된 규격을 충족하는 사진을 준비하여 신청서에 첨부해 제출한다. 규격을 충족하지 않는 사진인 경우에는 다시 촬영하게 된다. 재류카드 교부일 기준으로 만 1세 미만인 사람은 사진 제출이 필요하지 않다. 2026년(레이와 8년) 6월 13일까지는 16세 미만인 사람이 불필요했으나, 2026년 6월 14일 이후에 교부되는 재류카드부터는 만 1세 이상인 사람에 대해 필요하다. 체크시트에 따르면 신청 전 6개월 이내에 정면에서 촬영한, 모자와 배경이 없는 선명한 것으로 하고, 사진 뒷면에 신청인의 이름을 기재하여 신청서의 사진란에 붙인다",
  ],
  "申請人本人以外の方が提出する場合。提出する方の身分を証する文書（申請取次者証明書、戸籍謄本等）の提示": [
    "If submitted by a person other than the applicant. Presentation of a document proving the identity of the person submitting (certificate of an application agent, family register transcript, etc.)",
    "신청인 본인 이외의 사람이 제출하는 경우. 제출하는 사람의 신분을 증명하는 문서(신청 대행자(申請取次者) 증명서, 호적등본 등)의 제시",
  ],
  "入管法施行規則別表第３の「教授」から「報道」まで又は「経営・管理」から「技能」までのいずれかの在留資格の項の下欄に掲げる資料（各在留資格の案内ページから提出書類を確認する）。その資料がカテゴリーにより分かれている場合は、当該カテゴリーに応じた資料": [
    "Materials listed in the lower column of the entry for any of the statuses from \"Professor\" to \"Journalist\" or from \"Business Manager\" to \"Skilled Labor\" in Appended Table 3 of the Ordinance for Enforcement of the Immigration Control Act (check the submission documents on the guidance page of each status). If the materials differ by category, the materials for the relevant category",
    "입관법 시행규칙 별표 제3의 '교수'부터 '보도'까지 또는 '경영·관리'부터 '기능'까지 중 어느 하나의 체류자격 항의 하란에 기재된 자료(각 체류자격의 안내 페이지에서 제출 서류를 확인한다). 그 자료가 카테고리에 따라 나뉘어 있는 경우에는 해당 카테고리에 따른 자료",
  ],
  "在留資格取得許可申請（取得の事由別）": [
    "Application for permission for acquisition of status of residence (by cause of acquisition)",
    "체류자격 취득 허가 신청(취득 사유별)",
  ],

  // 出典の名称
  "在留資格「技術・人文知識・国際業務」（出入国在留管理庁）": [
    "Status of residence \"Engineer / Specialist in Humanities / International Services\" (Immigration Services Agency of Japan)",
    "체류자격 '기술·인문지식·국제업무'(출입국재류관리청)",
  ],
  "提出書類のカテゴリー別一覧（出入国在留管理庁）": [
    "List of submission documents by category (Immigration Services Agency of Japan)",
    "제출 서류의 카테고리별 일람(출입국재류관리청)",
  ],
  "提出書類チェックシート（変更・カテゴリー共通・表1）（出入国在留管理庁）": [
    "Submission document checklist (change; common to all categories; Table 1) (Immigration Services Agency of Japan)",
    "제출 서류 체크시트(변경·카테고리 공통·표 1)(출입국재류관리청)",
  ],
  "提出書類チェックシート（変更・カテゴリー3・4のみ・表2）（出入国在留管理庁）": [
    "Submission document checklist (change; Categories 3 and 4 only; Table 2) (Immigration Services Agency of Japan)",
    "제출 서류 체크시트(변경·카테고리 3·4만·표 2)(출입국재류관리청)",
  ],
  "【認定】提出書類チェックシート（カテゴリー共通・表1）（出入国在留管理庁）": [
    "[Certificate of eligibility] Submission document checklist (common to all categories; Table 1) (Immigration Services Agency of Japan)",
    "[인정] 제출 서류 체크시트(카테고리 공통·표 1)(출입국재류관리청)",
  ],
  "【認定】提出書類チェックシート（カテゴリー3・4のみ・表2）（出入国在留管理庁）": [
    "[Certificate of eligibility] Submission document checklist (Categories 3 and 4 only; Table 2) (Immigration Services Agency of Japan)",
    "[인정] 제출 서류 체크시트(카테고리 3·4만·표 2)(출입국재류관리청)",
  ],
  "在留資格「経営・管理」（出入国在留管理庁）": [
    "Status of residence \"Business Manager\" (Immigration Services Agency of Japan)",
    "체류자격 '경영·관리'(출입국재류관리청)",
  ],
  "在留資格「高度専門職」ポイント計算表（出入国在留管理庁）": [
    "Status of residence \"Highly Skilled Professional\" points calculation table (Immigration Services Agency of Japan)",
    "체류자격 '고도전문직' 포인트 계산표(출입국재류관리청)",
  ],
  "在留資格「高度専門職」在留資格取得許可申請（高度専門職１号）（出入国在留管理庁）": [
    "Status of residence \"Highly Skilled Professional\": application for permission for acquisition of status of residence (Highly Skilled Professional Type 1) (Immigration Services Agency of Japan)",
    "체류자격 '고도전문직' 체류자격 취득 허가 신청(고도전문직 1호)(출입국재류관리청)",
  ],
  "在留資格取得許可申請の手続案内（出入国在留管理庁）": [
    "Guidance on the procedure for application for permission for acquisition of status of residence (Immigration Services Agency of Japan)",
    "체류자격 취득 허가 신청 절차 안내(출입국재류관리청)",
  ],
  "技術・人文知識・国際業務 在留資格取得許可申請（一部のみ整備）": [
    "Technical/Humanities/International Services: application for permission for acquisition of status of residence (only partly covered)",
    "기술·인문지식·국제업무 체류자격 취득 허가 신청(일부만 정비)",
  ],
  "家族滞在 在留資格取得許可申請（一部のみ整備）": [
    "Dependent: application for permission for acquisition of status of residence (only partly covered)",
    "가족체재 체류자격 취득 허가 신청(일부만 정비)",
  ],
  "在留資格「技術・人文知識・国際業務」在留資格取得許可申請（出入国在留管理庁）": [
    "Status of residence \"Engineer/Specialist in Humanities/International Services\": application for permission for acquisition of status of residence (Immigration Services Agency of Japan)",
    "체류자격 '기술·인문지식·국제업무' 체류자격 취득 허가 신청(출입국재류관리청)",
  ],
  "在留資格「家族滞在」在留資格取得許可申請（出入国在留管理庁）": [
    "Status of residence \"Dependent\": application for permission for acquisition of status of residence (Immigration Services Agency of Japan)",
    "체류자격 '가족체재' 체류자격 취득 허가 신청(출입국재류관리청)",
  ],
  "出生の場合も、この「その事由を証する書類」として扱う（出生の乳児が取得する場合の実務の扱いは、案内ページに記載がないため、行政書士が確認する）": [
    "Birth is also treated as this \"document proving the reason\" (the practical handling when an infant acquires status by birth is not stated on the guidance page, so the administrative scrivener confirms it)",
    "출생의 경우에도 이 '사유를 증명하는 서류'로 취급한다(출생한 영아가 취득하는 경우의 실무 취급은 안내 페이지에 기재가 없으므로 행정서사가 확인한다)",
  ],
  "次のいずれか。(1)戸籍謄本 1通 (2)婚姻届受理証明書 1通 (3)結婚証明書（写し）1通 (4)出生証明書（写し）1通 (5)(1)〜(4)に準ずる文書（適宜）": [
    "Any one of the following: (1) family register transcript (1 copy) (2) certificate of acceptance of marriage notification (1 copy) (3) marriage certificate (copy, 1 copy) (4) birth certificate (copy, 1 copy) (5) a document equivalent to (1) to (4) (as appropriate)",
    "다음 중 하나. (1) 호적등본 1통 (2) 혼인신고 수리증명서 1통 (3) 결혼증명서(사본) 1통 (4) 출생증명서(사본) 1통 (5) (1)~(4)에 준하는 문서(적절히)",
  ],
  "1通": ["1 copy", "1통"],
  "扶養者の活動により、次の(1)(2)のどちらかを提出する（チェックシート No.8 は○）。(1)扶養者が収入を伴う事業を運営する活動又は報酬を受ける活動を行っている場合：在職証明書又は営業許可書の写し等（扶養者の職業がわかる証明書）1通、住民税の課税（又は非課税）証明書及び納税証明書 各1通。1年間の総所得と納税状況の両方が記載された証明書であれば、課税（非課税）証明書と納税証明書のいずれか一方でよい。入国後間もない場合などは、最寄りの地方出入国在留管理官署に問い合わせる。(2)(1)以外の活動を行っている場合：扶養者名義の預金残高証明書又は給付金額及び給付期間を明示した奨学金給付に関する証明書（適宜）、又は、これらに準ずるもので申請人の生活費用を支弁できることを証するもの（適宜）": [
    "Submit either (1) or (2) below, depending on the supporter's activity (marked ○ in item No. 8 of the checklist). (1) If the supporter runs a business generating income or engages in an activity for which remuneration is received: certificate of employment or copy of business license, etc. (a certificate showing the supporter's occupation): 1 copy; resident tax assessment (or non-assessment) certificate and tax payment certificate: 1 copy each. If a single certificate states both the total income for one year and the tax payment status, either the assessment (non-assessment) certificate or the tax payment certificate is sufficient. If the supporter entered Japan only recently, inquire at the nearest regional immigration services office. (2) If the supporter engages in an activity other than those in (1): a bank balance certificate in the supporter's name, or a certificate of scholarship payment stating the amount and period of payment (as appropriate), or a document equivalent to these proving that the applicant's living expenses can be covered (as appropriate)",
    "부양자의 활동에 따라 다음 (1)(2) 중 하나를 제출한다(체크시트 No.8은 ○). (1) 부양자가 수입을 수반하는 사업을 운영하는 활동 또는 보수를 받는 활동을 하고 있는 경우: 재직증명서 또는 영업허가서 사본 등(부양자의 직업을 알 수 있는 증명서) 1통, 주민세 과세(또는 비과세) 증명서 및 납세증명서 각 1통. 1년간의 총소득과 납세 상황이 모두 기재된 증명서라면 과세(비과세) 증명서와 납세증명서 중 어느 한쪽이면 된다. 입국한 지 얼마 되지 않은 경우 등은 가장 가까운 지방출입국재류관리관서에 문의한다. (2) (1) 이외의 활동을 하고 있는 경우: 부양자 명의의 예금잔액증명서 또는 급부 금액 및 급부 기간을 명시한 장학금 급부에 관한 증명서(적절히), 또는 이에 준하는 것으로 신청인의 생활비용을 지불할 수 있음을 증명하는 것(적절히)",
  ],
  "出生した者の申請である場合（チェックシートでは△。案内ページは事由の別なく「質問書」を列挙しており、チェックシートに合わせて出生のみ要確認とする）。質問書の様式・記載内容は未確認": [
    "If the application is for a person born in Japan (marked △ on the checklist; the guidance page lists the \"questionnaire\" without distinguishing the cause, and it is shown as needing confirmation for birth only, in line with the checklist). The form and contents of the questionnaire have not been confirmed",
    "출생한 사람의 신청인 경우(체크시트에서는 △. 안내 페이지는 사유 구분 없이 '질문서'를 열거하고 있으며, 체크시트에 맞추어 출생만 확인 필요로 한다). 질문서의 양식·기재 내용은 확인하지 못했다",
  ],
  "必要書類ではないが、提出すると、許可後の在留カードに住民票の住居地が記載される。個人番号（マイナンバー）は省略し、他の事項は省略のないもの。住民票があれば許可後の市区町村での住居地の届出は不要（入管法第19条の8第4項）で、なければ許可後14日以内の届出が必要（同条第1項）": [
    "Not a required document, but if submitted, the address on the residence certificate is entered on the residence card issued after approval. Omit the individual number (My Number); other items must not be omitted. With a residence certificate, notifying the municipality of the residence after approval is not required (Immigration Control Act Art. 19-8(4)); without it, notification is required within 14 days after approval (Art. 19-8(1))",
    "필수 서류는 아니지만, 제출하면 허가 후의 재류카드에 주민표의 주거지가 기재된다. 개인번호(마이넘버)는 생략하고, 다른 사항은 생략이 없는 것. 주민표가 있으면 허가 후 시구정촌에서의 주거지 신고는 불필요(입관법 제19조의8 제4항)하고, 없으면 허가 후 14일 이내에 신고가 필요(같은 조 제1항)",
  ],
  "在留資格取得許可申請書（別記第三十六号様式）（出入国在留管理庁）": [
    "Application for permission for acquisition of status of residence (Appended Form No. 36) (Immigration Services Agency of Japan)",
    "체류자격 취득 허가 신청서(별기 제36호 양식)(출입국재류관리청)",
  ],

  // 介護（Issue #297）
  "介護福祉士登録証（写し）": [
    "Certified care worker registration certificate (copy)",
    "개호복지사 등록증(사본)",
  ],
  "労働条件を明示する文書（労働基準法第15条第1項・同法施行規則第5条に基づき交付されるもの）": [
    "Document stating the working conditions (issued under Article 15, paragraph 1 of the Labor Standards Act and Article 5 of its Enforcement Regulations)",
    "근로조건을 명시한 문서(근로기준법 제15조 제1항 및 같은 법 시행규칙 제5조에 따라 교부되는 것)",
  ],
  "派遣先での活動内容を明らかにする資料（労働条件通知書（雇用契約書）等）": [
    "Material showing the activities at the dispatch destination (notice of working conditions (employment contract), etc.)",
    "파견처에서의 활동 내용을 밝히는 자료(근로조건통지서(고용계약서) 등)",
  ],
  "所属機関の概要を明らかにする文書（沿革・役員・組織・事業内容等が記載された案内書、又はこれに準ずる文書）": [
    "Document showing an overview of the organization (a brochure stating its history, officers, organization, business content, etc., or an equivalent document)",
    "소속 기관의 개요를 밝히는 문서(연혁·임원·조직·사업 내용 등이 기재된 안내서 또는 이에 준하는 문서)",
  ],
  "技能移転に係る申告書（参考様式）": [
    "Declaration on skills transfer (reference form)",
    "기능 이전에 관한 신고서(참고 양식)",
  ],
  "「技能実習」の在留資格で在留していたことがある場合のみ": [
    "Only if the applicant has previously stayed under the status \"Technical Intern Training\"",
    "'기능실습' 체류자격으로 체류한 적이 있는 경우에만",
  ],
  "直近1年分の総所得及び納税状況が記載されたもの。1年間の総所得及び納税状況（税金を納めているかどうか）の両方が記載されている証明書であれば、いずれか一方でかまわない": [
    "One showing the total income and tax payment status for the most recent year. A certificate stating both the total income for one year and the tax payment status (whether taxes have been paid) is sufficient on its own, in place of the other",
    "최근 1년분의 총소득 및 납세 상황이 기재된 것. 1년간의 총소득 및 납세 상황(세금을 납부했는지 여부)이 모두 기재된 증명서라면 어느 한쪽만으로도 된다",
  ],
  "派遣契約に基づいて就労する場合（申請人が被派遣者の場合）のみ。チェックシートで△。ページには記載なし": [
    "Only if working under a dispatch contract (the applicant is a dispatched worker). Marked △ on the checksheet; not stated on the guidance page",
    "파견 계약에 따라 취업하는 경우(신청인이 피파견자인 경우)에만. 체크시트에서 △. 안내 페이지에는 기재 없음",
  ],
  "転職後、初回の更新許可申請の場合のみ": [
    "Only for the first renewal application after changing jobs",
    "이직 후 첫 연장 허가 신청의 경우에만",
  ],
  "介護 在留期間更新許可申請": [
    "Nursing Care: application for extension of the period of stay",
    "개호 체류기간 연장 허가 신청",
  ],
  "介護 在留資格変更許可申請": [
    "Nursing Care: application for change of status of residence",
    "개호 체류자격 변경 허가 신청",
  ],
  "介護 在留資格認定証明書交付申請": [
    "Nursing Care: application for certificate of eligibility",
    "개호 사증발급인정서 교부 신청",
  ],
  "在留資格「介護」（出入国在留管理庁）": [
    "Status of residence \"Nursing Care\" (Immigration Services Agency of Japan)",
    "체류자격 '개호'(출입국재류관리청)",
  ],
  // 法律・会計業務（Issue #301）
  "日本の法律・会計の資格を有することを証明する文書（免許書、証明書等の写し）": [
    "Document proving that the applicant holds a Japanese legal or accounting qualification (copy of the license, certificate, etc.)",
    "일본의 법률·회계 자격을 보유하고 있음을 증명하는 문서(면허증, 증명서 등의 사본)",
  ],
  "弁護士、司法書士、土地家屋調査士、外国法事務弁護士、公認会計士、外国公認会計士、税理士、社会保険労務士、弁理士、海事代理士、行政書士のいずれか": [
    "One of: attorney, judicial scrivener, land and house investigator, registered foreign lawyer, certified public accountant, foreign certified public accountant, tax accountant, social insurance and labor consultant, patent attorney, maritime procedure agent, administrative scrivener",
    "변호사, 사법서사, 토지가옥조사사, 외국법사무변호사, 공인회계사, 외국공인회계사, 세무사, 사회보험노무사, 변리사, 해사대리사, 행정서사 중 하나",
  ],
  "法律・会計業務 在留期間更新許可申請": [
    "Legal/Accounting Services: application for extension of the period of stay",
    "법률·회계업무 체류기간 연장 허가 신청",
  ],
  "法律・会計業務 在留資格変更許可申請": [
    "Legal/Accounting Services: application for change of status of residence",
    "법률·회계업무 체류자격 변경 허가 신청",
  ],
  "法律・会計業務 在留資格認定証明書交付申請": [
    "Legal/Accounting Services: application for certificate of eligibility",
    "법률·회계업무 사증발급인정서 교부 신청",
  ],
  "在留資格「法律・会計業務」（出入国在留管理庁）": [
    "Status of residence \"Legal/Accounting Services\" (Immigration Services Agency of Japan)",
    "체류자격 '법률·회계업무'(출입국재류관리청)",
  ],

  // 教授（Issue #292）
  "カテゴリー1（常勤職員）": ["Category 1 (full-time staff)", "카테고리 1(상근 직원)"],
  "カテゴリー2（非常勤職員）": ["Category 2 (part-time staff)", "카테고리 2(비상근 직원)"],
  "大学等又は大学等以外の機関が作成する、申請人の大学等における活動の内容、期間、地位及び報酬を証明する文書": [
    "Document prepared by the university or another institution certifying the applicant's activities, period, position and remuneration at the university, etc.",
    "대학 등 또는 대학 등 이외의 기관이 작성하는, 신청인의 대학 등에서의 활동 내용, 기간, 지위 및 보수를 증명하는 문서",
  ],
  "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）": [
    "One stating the total income and tax payment status for one year. If a single certificate states both, either one is sufficient (issued by the municipality of residence as of January 1)",
    "1년간의 총소득 및 납세 상황이 기재된 것. 두 가지가 모두 기재된 증명서라면 어느 한쪽이어도 됨(1월 1일 현재 거주지의 시구정촌에서 발급)",
  ],
  "常勤職員として「教授」で在留していた方が、更新申請時点で転職等により非常勤職員となっている場合のみ": [
    "Only if the applicant stayed as full-time staff under \"Professor\" and has become part-time staff by the time of the renewal application due to a job change, etc.",
    "상근 직원으로서 '교수' 체류자격으로 체류하던 분이 연장 신청 시점에 이직 등으로 비상근 직원이 된 경우에만",
  ],
  "教授 在留期間更新許可申請": [
    "Professor: application for extension of the period of stay",
    "교수 체류기간 연장 허가 신청",
  ],
  "教授 在留資格変更許可申請": [
    "Professor: application for change of status of residence",
    "교수 체류자격 변경 허가 신청",
  ],
  "教授 在留資格認定証明書交付申請": [
    "Professor: application for certificate of eligibility",
    "교수 사증발급인정서 교부 신청",
  ],
  "在留資格「教授」（出入国在留管理庁）": [
    "Status of residence \"Professor\" (Immigration Services Agency of Japan)",
    "체류자격 '교수'(출입국재류관리청)",
  ],
  "「教授」に係る提出書類一覧（在留資格認定証明書交付申請用）（出入国在留管理庁）": [
    "List of documents to submit for \"Professor\" (for application for certificate of eligibility) (Immigration Services Agency of Japan)",
    "'교수' 관련 제출 서류 일람(사증발급인정서 교부 신청용)(출입국재류관리청)",
  ],
  "「教授」に係る提出書類一覧（在留資格変更許可申請用）（出入国在留管理庁）": [
    "List of documents to submit for \"Professor\" (for application for change of status of residence) (Immigration Services Agency of Japan)",
    "'교수' 관련 제출 서류 일람(체류자격 변경 허가 신청용)(출입국재류관리청)",
  ],
  "「教授」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）": [
    "List of documents to submit for \"Professor\" (for application for extension of the period of stay) (Immigration Services Agency of Japan)",
    "'교수' 관련 제출 서류 일람(체류기간 연장 허가 신청용)(출입국재류관리청)",
  ],

  // 医療（Issue #302）
  "医師又は歯科医師の日本の資格を有することを証明する文書（免状又は証明書等の写し）": [
    "Document proving that the applicant holds a Japanese qualification as a doctor or dentist (copy of the license, certificate, etc.)",
    "의사 또는 치과의사의 일본 자격을 보유하고 있음을 증명하는 문서(면장 또는 증명서 등의 사본)",
  ],
  "医療に係る日本の資格を有することを証明する文書（免状又は証明書等の写し）": [
    "Document proving that the applicant holds a Japanese medical-related qualification (copy of the license, certificate, etc.)",
    "의료 관련 일본 자격을 보유하고 있음을 증명하는 문서(면장 또는 증명서 등의 사본)",
  ],
  "勤務する機関の概要を明らかにする資料（病院、診療所等設立に許可を受けることを要する機関の場合は、当該許可を受けた年月日を明示したもの）": [
    "Material showing an overview of the workplace (for an organization that requires permission to be established, such as a hospital or clinic, one stating the date the permission was obtained)",
    "근무하는 기관의 개요를 밝히는 자료(병원, 진료소 등 설립에 허가를 받아야 하는 기관의 경우에는 해당 허가를 받은 연월일을 명시한 것)",
  ],
  "従事する職務の内容及び報酬を証明する在職証明書その他の所属機関の文書": [
    "Certificate of employment or other document from the organization proving the duties performed and the remuneration",
    "종사하는 직무의 내용 및 보수를 증명하는 재직증명서 기타 소속 기관의 문서",
  ],
  "医師・歯科医師の場合のみ（入管庁の案内の「カテゴリー1」。所属機関のカテゴリーではなく、申請人の区分）": [
    "Only for doctors and dentists (\"Category 1\" in the Immigration Services Agency's guidance; this is a classification of the applicant, not the organization's category)",
    "의사·치과의사의 경우에만(출입국재류관리청 안내의 '카테고리 1'. 소속 기관의 카테고리가 아니라 신청인의 구분)",
  ],
  "医師・歯科医師以外の場合のみ（入管庁の案内の「カテゴリー2」）": [
    "Only for applicants other than doctors and dentists (\"Category 2\" in the Immigration Services Agency's guidance)",
    "의사·치과의사 이외의 경우에만(출입국재류관리청 안내의 '카테고리 2')",
  ],
  "医師・歯科医師以外の場合のみ（入管庁の案内の「カテゴリー2」）。チェックシートでは医師・歯科医師以外のみ○": [
    "Only for applicants other than doctors and dentists (\"Category 2\" in the guidance). Marked ○ on the checklist only for applicants other than doctors and dentists",
    "의사·치과의사 이외의 경우에만(안내의 '카테고리 2'). 체크시트에서는 의사·치과의사 이외에만 ○",
  ],
  "医師・歯科医師以外の場合のみ（入管庁の案内の「カテゴリー2」）。薬剤師、保健師、助産師、看護師、准看護師、歯科衛生士、診療放射線技師、理学療法士、作業療法士、視能訓練士、臨床工学技士、義肢装具士のいずれか": [
    "Only for applicants other than doctors and dentists (\"Category 2\" in the guidance). One of: pharmacist, public health nurse, midwife, nurse, assistant nurse, dental hygienist, radiological technologist, physical therapist, occupational therapist, orthoptist, clinical engineer, prosthetist/orthotist",
    "의사·치과의사 이외의 경우에만(안내의 '카테고리 2'). 약사, 보건사, 조산사, 간호사, 준간호사, 치과위생사, 진료방사선기사, 물리치료사, 작업치료사, 시능훈련사, 임상공학기사, 의지보조기기사 중 하나",
  ],
  "チェックシートで○（医師・歯科医師以外）。案内ページには記載なし": [
    "Marked ○ on the checklist (for applicants other than doctors and dentists). Not listed on the guidance page",
    "체크시트에서 ○(의사·치과의사 이외). 안내 페이지에는 기재 없음",
  ],
  "医師・歯科医師以外の方が、転職後の初回の更新許可申請を行う場合のみ": [
    "Only if a person other than a doctor or dentist files the first renewal application after changing jobs",
    "의사·치과의사 이외의 사람이 이직 후 첫 연장 허가 신청을 하는 경우에만",
  ],
  "医療 在留期間更新許可申請": [
    "Medical Services: application for extension of the period of stay",
    "의료 체류기간 연장 허가 신청",
  ],
  "医療 在留資格変更許可申請": [
    "Medical Services: application for change of status of residence",
    "의료 체류자격 변경 허가 신청",
  ],
  "医療 在留資格認定証明書交付申請": [
    "Medical Services: application for certificate of eligibility",
    "의료 사증발급인정서 교부 신청",
  ],
  "在留資格「医療」（出入国在留管理庁）": [
    "Status of residence \"Medical Services\" (Immigration Services Agency of Japan)",
    "체류자격 '의료'(출입국재류관리청)",
  ],


  // 研究（Issue #296）
  "研究 在留資格認定証明書交付申請": [
    "Researcher: application for certificate of eligibility",
    "연구 사증발급인정서 교부 신청",
  ],
  "研究 在留資格変更許可申請": [
    "Researcher: application for change of status of residence",
    "연구 체류자격 변경 허가 신청",
  ],
  "研究 在留期間更新許可申請": [
    "Researcher: application for extension of the period of stay",
    "연구 체류기간 연장 허가 신청",
  ],
  "在留資格「研究」（出入国在留管理庁）": [
    "Status of residence \"Researcher\" (Immigration Services Agency of Japan)",
    "체류자격 '연구'(출입국재류관리청)",
  ],
  "外国法人の源泉徴収に対する免除証明書その他の源泉徴収を要しないことを明らかにする資料": [
    "Certificate of exemption from withholding for a foreign corporation, or other material showing that withholding is not required",
    "외국법인의 원천징수 면제 증명서 기타 원천징수가 필요 없음을 밝히는 자료",
  ],
  "源泉徴収の免除を受ける機関の場合のみ。この場合は、下の給与支払事務所等の開設届出書等は不要": [
    "Only for an organization exempt from withholding. In that case, the notification of opening a salary payment office, etc. below is not required",
    "원천징수 면제를 받는 기관의 경우에만. 이 경우 아래의 급여지급사무소 등 개설 신고서 등은 불필요",
  ],
  "学歴及び職歴その他経歴等を証明する文書（履歴書、卒業証明書又は研究の経験期間を証明する文書等）": [
    "Documents proving education, work history and other background (résumé, graduation certificate, or documents proving research experience, etc.)",
    "학력 및 경력 기타 이력 등을 증명하는 문서(이력서, 졸업증명서 또는 연구 경험 기간을 증명하는 문서 등)",
  ],
  "履歴書（関連する職務に従事した機関、活動の内容及び期間を明示したもの）と、大学等の卒業証明書（同等以上の教育又は高度専門士の称号を証明する文書でもよい）又は研究の経験期間を証明する文書（大学院・大学での研究期間を含む）": [
    "A résumé (stating the organizations, activities and periods of related work) and either a graduation certificate from a university, etc. (a document proving equivalent or higher education or the title of Advanced Professional may be used instead) or a document proving the period of research experience (including research at a graduate school or university)",
    "이력서(관련 직무에 종사한 기관, 활동 내용 및 기간을 명시한 것)와 대학 등의 졸업증명서(동등 이상의 교육 또는 고도전문사 칭호를 증명하는 문서도 가능) 또는 연구 경험 기간을 증명하는 문서(대학원·대학에서의 연구 기간 포함)",
  ],
  "労働契約の場合は労働条件通知書等。日本法人の役員に就任する場合は役員報酬を定める定款の写し又は株主総会議事録の写し。外国法人の日本支店への転勤・会社以外の団体の役員に就任する場合は、地位（担当業務）、期間及び報酬額を明らかにする所属団体の文書": [
    "For an employment contract, a notice of working conditions, etc. For an officer of a Japanese company, a copy of the articles of incorporation or of the shareholders' meeting minutes setting officer remuneration. For a transfer to the Japanese branch of a foreign company or an officer of a non-company organization, a document of the organization stating the position (duties), period and remuneration",
    "근로계약의 경우 근로조건통지서 등. 일본 법인의 임원에 취임하는 경우 임원 보수를 정한 정관 사본 또는 주주총회 의사록 사본. 외국법인의 일본 지점으로 전근하는 경우·회사 이외 단체의 임원에 취임하는 경우 지위(담당 업무), 기간 및 보수액을 밝히는 소속 단체의 문서",
  ],
  "転勤の場合の資料（転勤直前の外国の機関の文書、転勤前後の事業所の関係を示す資料）": [
    "Documents for an intra-company transfer (a document from the foreign organization worked for immediately before the transfer, and material showing the relationship between the workplaces before and after)",
    "전근의 경우의 자료(전근 직전 외국 기관의 문서, 전근 전후 사업소의 관계를 보여 주는 자료)",
  ],
  "「研究（転勤）」の場合のみ（申請書は様式L）。過去1年間の業務内容・地位・報酬を明示した転勤直前の機関の文書と、支店の登記事項証明書又は出資・資本関係を明らかにする資料": [
    "Only for \"Researcher (transfer)\" (the application form is Form L). A document from the organization immediately before the transfer stating duties, position and remuneration over the past year, and a certificate of registered matters of the branch or material showing the investment/capital relationship",
    "'연구(전근)'의 경우에만(신청서는 양식 L). 지난 1년간의 업무 내용·지위·보수를 명시한 전근 직전 기관의 문서와, 지점의 등기사항증명서 또는 출자·자본 관계를 밝히는 자료",
  ],
  "沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が詳細に記載された案内書、これに準ずる文書、又は登記事項証明書のいずれか": [
    "Any of: a brochure describing in detail the history, officers, organization and business (including main clients and transaction record), an equivalent document, or a certificate of registered matters",
    "연혁, 임원, 조직, 사업 내용(주요 거래처와 거래 실적 포함) 등이 상세히 기재된 안내서, 이에 준하는 문서 또는 등기사항증명서 중 하나",
  ],
  "カテゴリー3は、転勤して研究を行う業務に従事する場合に限る。新規事業の場合は事業計画書": [
    "For Category 3, only when engaged in research work after a transfer. For a new business, a business plan",
    "카테고리 3은 전근하여 연구 업무에 종사하는 경우에 한함. 신규 사업의 경우 사업계획서",
  ],
  "カテゴリー1：四季報の写し等／カテゴリー2・3：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。カテゴリー2は、オンライン利用申出の承認を受けている場合はその承認を示す文書。提出可能な書類がなければカテゴリー4となる。チェックシートでは、変更・更新に「受付印のあるものの写し」とある": [
    "Category 1: a copy of the Japan Company Handbook, etc. / Categories 2 and 3: a copy of the summary table of statutory reports, such as the withholding tax slips for employees' salaries of the previous year. For Category 2, if approval to use the online system has been obtained, a document showing that approval. If no document can be submitted, the organization falls under Category 4. In the checklists, change and renewal say \"a copy bearing the receipt stamp\"",
    "카테고리 1: 『회사사계보』 사본 등／카테고리 2·3: 전년도 직원 급여소득 원천징수영수증 등의 법정조서합계표(사본). 카테고리 2는 온라인 이용 신청의 승인을 받은 경우 그 승인을 나타내는 문서. 제출 가능한 서류가 없으면 카테고리 4가 된다. 체크시트에서는 변경·연장에 '접수인이 찍힌 것의 사본'이라고 되어 있다",
  ],
  "「留学」からの変更で、カテゴリー2（大学・短大・大学院の卒業（予定）者等）として扱う場合。チェックシートでは、カテゴリーを証明する文書の選択肢の一つとして○": [
    "For a change from \"Student\", when treated as Category 2 (graduates or expected graduates of universities, junior colleges, graduate schools, etc.). In the checklist, it is marked ○ as one of the options for the document proving the category",
    "'유학'에서의 변경으로 카테고리 2(대학·단기대학·대학원 졸업(예정)자 등)로 취급하는 경우. 체크시트에서는 카테고리를 증명하는 문서의 선택지 중 하나로 ○로 되어 있다",
  ],
  "新規事業の場合は事業計画書。ページの読み方は、カテゴリー4は必要（カテゴリー3のみ「転勤して研究を行う業務に従事する場合に限る」）。チェックシートの読み方は、行全体（カテゴリー3・4）に「転勤して研究を行う業務に従事する場合に限る」が付き、記号は○（認定）。両者が食い違うため要確認": [
    "For a new business, a business plan. The guidance page reads it as required for Category 4 (only Category 3 is limited to \"when engaged in research work after a transfer\"). The checklist reads it as the whole row (Categories 3 and 4) being limited to \"when engaged in research work after a transfer\", with the mark ○ (certificate of eligibility). The two readings differ, so please verify",
    "신규 사업의 경우 사업계획서. 안내 페이지에서는 카테고리 4는 필요하다고 읽히며(카테고리 3만 '전근하여 연구 업무에 종사하는 경우에 한함'), 체크시트에서는 행 전체(카테고리 3·4)에 '전근하여 연구 업무에 종사하는 경우에 한함'이 붙고 기호는 ○(인정증명서)입니다. 두 해석이 달라 확인 필요",
  ],
  "新規事業の場合は事業計画書。ページの読み方は、カテゴリー4は必要（カテゴリー3のみ「転勤して研究を行う業務に従事する場合に限る」）。チェックシートの読み方は、行全体（カテゴリー3・4）に「転勤して研究を行う業務に従事する場合に限る」が付き、記号は△（変更）。両者が食い違うため要確認": [
    "For a new business, a business plan. The guidance page reads it as required for Category 4 (only Category 3 is limited to \"when engaged in research work after a transfer\"). The checklist reads it as the whole row (Categories 3 and 4) being limited to \"when engaged in research work after a transfer\", with the mark △ (change). The two readings differ, so please verify",
    "신규 사업의 경우 사업계획서. 안내 페이지에서는 카테고리 4는 필요하다고 읽히며(카테고리 3만 '전근하여 연구 업무에 종사하는 경우에 한함'), 체크시트에서는 행 전체(카테고리 3·4)에 '전근하여 연구 업무에 종사하는 경우에 한함'이 붙고 기호는 △(변경)입니다. 두 해석이 달라 확인 필요",
  ],
  "転職後、初回の更新許可申請の場合のみ。新規事業の場合は事業計画書。ページの読み方は、カテゴリー4は必要（カテゴリー3のみ「転勤して研究を行う業務に従事する場合に限る」）。チェックシートの読み方は、行全体（カテゴリー3・4）に「転勤して研究を行う業務に従事する場合に限る」が付き、記号は△（更新）。両者が食い違うため要確認": [
    "Only for the first renewal application after changing jobs. For a new business, a business plan. The guidance page reads it as required for Category 4 (only Category 3 is limited to \"when engaged in research work after a transfer\"). The checklist reads it as the whole row (Categories 3 and 4) being limited to \"when engaged in research work after a transfer\", with the mark △ (renewal). The two readings differ, so please verify",
    "이직 후 첫 연장 허가 신청의 경우에만. 신규 사업의 경우 사업계획서. 안내 페이지에서는 카테고리 4는 필요하다고 읽히며(카테고리 3만 '전근하여 연구 업무에 종사하는 경우에 한함'), 체크시트에서는 행 전체(카테고리 3·4)에 '전근하여 연구 업무에 종사하는 경우에 한함'이 붙고 기호는 △(연장)입니다. 두 해석이 달라 확인 필요",
  ],
  "転職後、初回の更新許可申請で、転勤して研究を行う業務に従事する場合に限る。チェックシート（更新）は△（条件付き）のため要確認": [
    "Only for the first renewal application after changing jobs, and only when engaged in research work after a transfer. The checklist (renewal) shows △ (conditional), so please verify",
    "이직 후 첫 연장 허가 신청에서, 전근하여 연구 업무에 종사하는 경우에 한함. 체크시트(연장)는 △(조건부)이므로 확인 필요",
  ],
  "転職後、初回の更新許可申請の場合のみ。カテゴリー3は、ページは「提出書類10は不要」、チェックシート（PDF）は「提出資料11は不要」で、代表者申告書（No.10）は○のため要確認": [
    "Only for the first renewal application after changing jobs. For Category 3, the guidance page says \"document 10 is not required\" while the checklist (PDF) says \"document 11 is not required\", and the representative declaration (No. 10) is marked ○, so please verify",
    "이직 후 첫 연장 허가 신청의 경우에만. 카테고리 3은 안내 페이지에는 '제출서류 10은 불필요', 체크시트(PDF)에는 '제출자료 11은 불필요'라고 되어 있고, 대표자 신고서(No.10)는 ○이므로 확인 필요",
  ],
  "転職後、初回の更新許可申請の場合のみ。源泉徴収の免除を受ける機関の場合のみ。この場合は、下の給与支払事務所等の開設届出書等は不要": [
    "Only for the first renewal application after changing jobs. Only for an organization exempt from withholding. In that case, the notification of opening a payroll office and the like below are not required",
    "이직 후 첫 연장 허가 신청의 경우에만. 원천징수 면제를 받는 기관의 경우에만. 이 경우 아래의 급여지급사무소 개설 신고서 등은 불필요",
  ],
  "転職後、初回の更新許可申請の場合のみ。納期の特例の承認を受けている場合": [
    "Only for the first renewal application after changing jobs. If the special payment deadline has been approved",
    "이직 후 첫 연장 허가 신청의 경우에만. 납기 특례의 승인을 받고 있는 경우",
  ],

  // 教育（Issue #293）
  "カテゴリー1（小学校・中学校・高等学校・中等教育学校・特別支援学校に常勤）": [
    "Category 1 (full-time at an elementary school, junior high school, high school, secondary education school or special needs school)",
    "카테고리 1(초등학교·중학교·고등학교·중등교육학교·특별지원학교에 상근)",
  ],
  "カテゴリー2（上記以外の教育機関に常勤）": [
    "Category 2 (full-time at an educational institution other than the above)",
    "카테고리 2(위 이외의 교육기관에 상근)",
  ],
  "カテゴリー3（非常勤）": ["Category 3 (part-time)", "카테고리 3(비상근)"],
  "申請人の活動内容等を明らかにする資料（労働契約の場合は労働条件を明示する文書、雇用以外の契約の場合は業務従事に係る契約書の写し）": [
    "Documents clarifying the applicant's activities, etc. (for an employment contract, a document specifying working conditions; for a non-employment contract, a copy of the contract for the work)",
    "신청인의 활동 내용 등을 밝히는 자료(근로계약의 경우 근로조건을 명시한 문서, 고용 이외의 계약의 경우 업무 종사에 관한 계약서 사본)",
  ],
  "労働基準法第15条第1項・同法施行規則第5条に基づき交付される文書。雇用以外の契約で複数の機関と契約する場合は、すべての機関との間の契約書の写し": [
    "A document issued under Article 15, paragraph 1 of the Labor Standards Act and Article 5 of its Enforcement Regulations. For a non-employment contract with multiple institutions, copies of the contracts with all of them",
    "근로기준법 제15조 제1항 및 동법 시행규칙 제5조에 따라 교부되는 문서. 고용 이외의 계약으로 여러 기관과 계약하는 경우에는 모든 기관과의 계약서 사본",
  ],
  "申請人の履歴を証明する資料（履歴書と、学歴又は職歴等を証明する文書）": [
    "Documents certifying the applicant's background (a résumé and documents certifying education or work history, etc.)",
    "신청인의 이력을 증명하는 자료(이력서와 학력 또는 경력 등을 증명하는 문서)",
  ],
  "履歴書は、関連する職務に従事した機関と活動の内容・期間を明示したもの。学歴又は職歴等は、大学等の卒業証明書等（専修学校の専攻科は専攻科の修了証明）、免許証等資格の写し、外国語教育の場合は当該外国語による12年以上の教育の証明、外国語以外の科目の場合は当該科目の5年以上の実務経験の証明のいずれか": [
    "The résumé must state the institutions where the applicant worked in related duties and the content and period of the activities. For education or work history, any one of: a university graduation certificate, etc. (for a specialized training college, a certificate of completion of the advanced course), a copy of a license or qualification, for foreign language teaching proof of at least 12 years of education in that language, or for other subjects proof of at least 5 years of practical experience in that subject",
    "이력서는 관련 직무에 종사한 기관과 활동의 내용·기간을 명시한 것. 학력 또는 경력 등은 대학 등의 졸업증명서 등(전수학교는 전공과 수료 증명), 면허증 등 자격의 사본, 외국어 교육의 경우 해당 외국어로 12년 이상 교육을 받았음의 증명, 외국어 이외의 과목의 경우 해당 과목의 5년 이상 실무 경험의 증명 중 하나",
  ],
  "事業内容を明らかにする資料（勤務先等の案内書、これに準ずる文書、登記事項証明書）": [
    "Documents clarifying the business (a brochure of the workplace, etc., a document equivalent to it, or a certificate of registered matters)",
    "사업 내용을 밝히는 자료(근무처 등의 안내서, 이에 준하는 문서, 등기사항증명서)",
  ],
  "案内書は、勤務先等の沿革、役員、組織、事業内容等が詳細に記載されたもの": [
    "The brochure must describe in detail the history, officers, organization and business of the workplace, etc.",
    "안내서는 근무처 등의 연혁, 임원, 조직, 사업 내용 등이 상세히 기재된 것",
  ],
  "直近の年度の決算文書の写し": ["Copy of the financial statements for the most recent fiscal year", "최근 연도 결산 문서 사본"],
  "業務従事に係る契約書の写し（雇用以外の契約に基づいて業務に従事する場合）": [
    "Copy of the contract for the work (if working under a non-employment contract)",
    "업무 종사에 관한 계약서 사본(고용 이외의 계약에 따라 업무에 종사하는 경우)",
  ],
  "チェックシートに△の凡例がないため要確認。複数の機関との契約に基づいて業務に従事する場合は、そのすべての機関との間の契約書の写し": [
    "Needs confirmation because the checksheet has no legend for the △ mark. If working under contracts with multiple institutions, copies of the contracts with all of them",
    "체크시트에 △의 범례가 없어 확인이 필요합니다. 여러 기관과의 계약에 따라 업무에 종사하는 경우에는 모든 기관과의 계약서 사본",
  ],
  "転職後の初回の更新許可申請の場合のみ": [
    "Only for the first renewal application after a job change",
    "이직 후 첫 연장 허가 신청의 경우에만",
  ],
  "転職後の初回の更新許可申請の場合のみ（新規事業の場合は事業計画書）": [
    "Only for the first renewal application after a job change (for a new business, a business plan)",
    "이직 후 첫 연장 허가 신청의 경우에만(신규 사업의 경우 사업계획서)",
  ],
  "教育 在留期間更新許可申請": [
    "Instructor: application for extension of the period of stay",
    "교육 체류기간 연장 허가 신청",
  ],
  "教育 在留資格変更許可申請": [
    "Instructor: application for change of status of residence",
    "교육 체류자격 변경 허가 신청",
  ],
  "教育 在留資格認定証明書交付申請": [
    "Instructor: application for certificate of eligibility",
    "교육 사증발급인정서 교부 신청",
  ],
  "在留資格「教育」（出入国在留管理庁）": [
    "Status of residence \"Instructor\" (Immigration Services Agency of Japan)",
    "체류자격 '교육'(출입국재류관리청)",
  ],
  "「教育」に係る提出書類一覧（在留資格認定証明書交付申請用）（出入国在留管理庁）": [
    "List of documents to submit for \"Instructor\" (for application for certificate of eligibility) (Immigration Services Agency of Japan)",
    "'교육' 관련 제출 서류 일람(사증발급인정서 교부 신청용)(출입국재류관리청)",
  ],
  "「教育」に係る提出書類一覧（在留資格変更許可申請用）（出入国在留管理庁）": [
    "List of documents to submit for \"Instructor\" (for application for change of status of residence) (Immigration Services Agency of Japan)",
    "'교육' 관련 제출 서류 일람(체류자격 변경 허가 신청용)(출입국재류관리청)",
  ],
  "「教育」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）": [
    "List of documents to submit for \"Instructor\" (for application for extension of the period of stay) (Immigration Services Agency of Japan)",
    "'교육' 관련 제출 서류 일람(체류기간 연장 허가 신청용)(출입국재류관리청)",
  ],

  // 報道（Issue #294）
  "報道 在留資格認定証明書交付申請": [
    "Journalist: application for certificate of eligibility",
    "보도 사증발급인정서 교부 신청",
  ],
  "報道 在留資格変更許可申請": [
    "Journalist: application for change of status of residence",
    "보도 체류자격 변경 허가 신청",
  ],
  "報道 在留期間更新許可申請": [
    "Journalist: application for extension of the period of stay",
    "보도 체류기간 연장 허가 신청",
  ],
  "在留資格「報道」（出入国在留管理庁）": [
    "Status of residence \"Journalist\" (Immigration Services Agency of Japan)",
    "체류자격 '보도'(출입국재류관리청)",
  ],
  "「報道」に係る提出書類一覧（在留資格認定証明書交付申請用）（出入国在留管理庁）": [
    "List of documents to submit for \"Journalist\" (for application for certificate of eligibility) (Immigration Services Agency of Japan)",
    "'보도' 관련 제출서류 일람(사증발급인정서 교부 신청용)(출입국재류관리청)",
  ],
  "「報道」に係る提出書類一覧（在留資格変更許可申請用）（出入国在留管理庁）": [
    "List of documents to submit for \"Journalist\" (for application for change of status of residence) (Immigration Services Agency of Japan)",
    "'보도' 관련 제출서류 일람(체류자격 변경 허가 신청용)(출입국재류관리청)",
  ],
  "「報道」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）": [
    "List of documents to submit for \"Journalist\" (for application for extension of the period of stay) (Immigration Services Agency of Japan)",
    "'보도' 관련 제출서류 일람(체류기간 연장 허가 신청용)(출입국재류관리청)",
  ],
  "カテゴリー1（外務省報道官から外国記者登録証を発行された者を雇用する外国の報道機関に雇用される場合）": [
    "Category 1 (employed by a foreign news organization that employs a person issued a foreign press registration card by the Ministry of Foreign Affairs press officer)",
    "카테고리 1(외무성 보도관으로부터 외국 기자 등록증을 발급받은 사람을 고용하는 외국 보도기관에 고용되는 경우)",
  ],
  "カテゴリー2（上記に該当しない団体・個人）": [
    "Category 2 (an organization or individual not falling under the above)",
    "카테고리 2(위에 해당하지 않는 단체·개인)",
  ],
  "申請人を雇用する外国の報道機関が、外務省報道官から外国記者登録証を発行された社員を雇用していることを証明する文書": [
    "A document certifying that the foreign news organization employing the applicant employs a staff member issued a foreign press registration card by the Ministry of Foreign Affairs press officer",
    "신청인을 고용하는 외국 보도기관이 외무성 보도관으로부터 외국 기자 등록증을 발급받은 직원을 고용하고 있음을 증명하는 문서",
  ],
  "申請人の活動の内容等を明らかにする資料（次のいずれか）": [
    "Material clarifying the applicant's activities (any of the following)",
    "신청인의 활동 내용 등을 밝히는 자료(다음 중 하나)",
  ],
  "(1)外国の報道機関から派遣される場合：その機関が作成した活動の内容、派遣期間、地位及び報酬を証明する文書／(2)外国の報道機関に日本で雇用される場合：労働基準法第15条第1項・同法施行規則第5条に基づき交付される労働条件を明示する文書／(3)雇用以外の契約に基づいて活動する場合（フリーランサー等）：その契約書（活動の内容、期間、地位及び報酬のいずれかの記載がないときは、その事項を記載した外国の報道機関の文書）": [
    "(1) Dispatched by a foreign news organization: a document prepared by that organization certifying the activities, dispatch period, position and remuneration / (2) Employed in Japan by a foreign news organization: a document stating working conditions issued under Article 15, paragraph 1 of the Labor Standards Act and Article 5 of its Enforcement Regulations / (3) Working under a non-employment contract (freelancer, etc.): the contract (if any of the activities, period, position or remuneration is not stated, a document of the foreign news organization stating them)",
    "(1) 외국 보도기관에서 파견되는 경우: 그 기관이 작성한 활동 내용, 파견 기간, 지위 및 보수를 증명하는 문서 / (2) 외국 보도기관에 일본에서 고용되는 경우: 근로기준법 제15조 제1항 및 동 시행규칙 제5조에 따라 교부되는 근로조건을 명시한 문서 / (3) 고용 이외의 계약에 따라 활동하는 경우(프리랜서 등): 그 계약서(활동 내용, 기간, 지위 및 보수 중 기재되지 않은 것이 있을 때는 그 사항을 기재한 외국 보도기관의 문서)",
  ],
  "外国の報道機関の概要（代表者名、沿革、組織、施設、職員数、報道実績等）を明らかにする資料": [
    "Material clarifying an outline of the foreign news organization (name of representative, history, organization, facilities, number of staff, reporting record, etc.)",
    "외국 보도기관의 개요(대표자명, 연혁, 조직, 시설, 직원 수, 보도 실적 등)를 밝히는 자료",
  ],
  "外務省報道官が発行した外国記者登録証の写し": [
    "Copy of the foreign press registration card issued by the Ministry of Foreign Affairs press officer",
    "외무성 보도관이 발급한 외국 기자 등록증 사본",
  ],
  "外国の報道機関の作成した在職証明書等（引き続き派遣され、雇用され、又は契約により活動していることを証明する文書）": [
    "Certificate of employment, etc. prepared by the foreign news organization (a document certifying continued dispatch, employment or activity under a contract)",
    "외국 보도기관이 작성한 재직증명서 등(계속 파견되거나 고용되거나 계약에 따라 활동하고 있음을 증명하는 문서)",
  ],
  "在職証明書は、所属機関の名称、所在地及び電話番号が記載されているものに限る": [
    "The certificate of employment must state the name, address and telephone number of the organization",
    "재직증명서는 소속 기관의 명칭, 소재지 및 전화번호가 기재된 것에 한함",
  ],
  "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）。入国後間もない場合や転居等で発行されないときは、最寄りの出入国在留管理官署に問い合わせる": [
    "One stating a year's total income and tax payment status. If one certificate states both, either one is sufficient (issued by the municipality of the address as of January 1). If it cannot be issued because of recent arrival or a move, ask the nearest immigration office",
    "1년간의 총소득 및 납세 상황이 기재된 것. 둘 다 기재된 증명서라면 어느 한쪽이어도 됨(1월 1일 현재 주소지의 시구정촌에서 발급). 입국 직후나 이사 등으로 발급되지 않을 때는 가까운 출입국재류관리관서에 문의",
  ],
  "転職後、初回の更新許可申請の場合のみ。(1)外国の報道機関から派遣される場合：その機関が作成した活動の内容、派遣期間、地位及び報酬を証明する文書／(2)外国の報道機関に日本で雇用される場合：労働基準法第15条第1項・同法施行規則第5条に基づき交付される労働条件を明示する文書／(3)雇用以外の契約に基づいて活動する場合（フリーランサー等）：その契約書（活動の内容、期間、地位及び報酬のいずれかの記載がないときは、その事項を記載した外国の報道機関の文書）": [
    "Only for the first renewal application after changing jobs. (1) Dispatched by a foreign news organization: a document prepared by that organization certifying the activities, dispatch period, position and remuneration / (2) Employed in Japan by a foreign news organization: a document stating working conditions issued under Article 15, paragraph 1 of the Labor Standards Act and Article 5 of its Enforcement Regulations / (3) Working under a non-employment contract (freelancer, etc.): the contract (if any of the activities, period, position or remuneration is not stated, a document of the foreign news organization stating them)",
    "이직 후 첫 연장 허가 신청의 경우에만. (1) 외국 보도기관에서 파견되는 경우: 그 기관이 작성한 활동 내용, 파견 기간, 지위 및 보수를 증명하는 문서 / (2) 외국 보도기관에 일본에서 고용되는 경우: 근로기준법 제15조 제1항 및 동 시행규칙 제5조에 따라 교부되는 근로조건을 명시한 문서 / (3) 고용 이외의 계약에 따라 활동하는 경우(프리랜서 등): 그 계약서(활동 내용, 기간, 지위 및 보수 중 기재되지 않은 것이 있을 때는 그 사항을 기재한 외국 보도기관의 문서)",
  ],
  "転職後、初回の更新許可申請の場合のみ。案内ページには記載があるが、チェックシート（更新）にはないため要確認": [
    "Only for the first renewal application after changing jobs. The guidance page lists it, but the checklist (renewal) does not, so please verify",
    "이직 후 첫 연장 허가 신청의 경우에만. 안내 페이지에는 기재되어 있으나 체크시트(연장)에는 없으므로 확인 필요",
  ],

  // 技能（Issue #298）
  "技能 在留資格認定証明書交付申請": [
    "Skilled Labor: application for certificate of eligibility",
    "기능 사증발급인정서 교부 신청",
  ],
  "技能 在留資格変更許可申請": [
    "Skilled Labor: application for change of status of residence",
    "기능 체류자격 변경 허가 신청",
  ],
  "技能 在留期間更新許可申請": [
    "Skilled Labor: application for extension of the period of stay",
    "기능 체류기간 연장 허가 신청",
  ],
  "在留資格「技能」（出入国在留管理庁）": [
    "Status of residence \"Skilled Labor\" (Immigration Services Agency of Japan)",
    "체류자격 '기능'(출입국재류관리청)",
  ],
  "在留資格「技能」調理師としての活動の場合（出入国在留管理庁）": [
    "Status of residence \"Skilled Labor\": activities as a cook (Immigration Services Agency of Japan)",
    "체류자격 '기능' 조리사로서의 활동의 경우(출입국재류관리청)",
  ],
  "在留資格「技能」調理師以外の活動の場合（出入国在留管理庁）": [
    "Status of residence \"Skilled Labor\": activities other than as a cook (Immigration Services Agency of Japan)",
    "체류자격 '기능' 조리사 이외의 활동의 경우(출입국재류관리청)",
  ],
  "従事する業務の内容を証明する所属機関の文書": [
    "Document from the organization proving the work to be performed",
    "종사하는 업무의 내용을 증명하는 소속 기관의 문서",
  ],
  "申請に係る技能を要する業務に従事した機関及び内容並びに期間を明示した履歴書": [
    "A résumé stating the organizations, content and periods of past work requiring the relevant skill",
    "신청에 관련된 기능을 요하는 업무에 종사한 기관, 내용 및 기간을 명시한 이력서",
  ],
  "料理人（タイ料理人を除く）の職歴を証明する文書（在職証明書等）": [
    "Document proving the work history of a cook other than a Thai cook (certificate of employment, etc.)",
    "요리사(태국 요리사 제외)의 경력을 증명하는 문서(재직증명서 등)",
  ],
  "職種によって提出する文書が異なる（案内ページの「職歴を証明する文書」）。該当する職種の場合のみ（調理師）。所属していた機関の在職証明書（機関の名称、所在地及び電話番号が記載されたもの）等で、技能を要する業務に従事した期間を証明する文書（外国の教育機関で当該業務に係る科目を専攻した期間を含む）。公的機関が発行する証明書がある場合はその写し（中華料理人は戸口簿及び職業資格証明書）": [
    "The documents to submit differ by occupation (\\\"Documents proving work history\\\" in the guidance). Only for the following occupation (cook). A certificate of employment from a former organization (stating its name, address and telephone number) or similar document proving the period of work requiring the skill (including the period of majoring in related subjects at a foreign educational institution). If a public authority has issued a certificate, a copy of it (for Chinese cooks, the household register and the vocational qualification certificate)",
    "직종에 따라 제출하는 문서가 다릅니다(안내 페이지의 '경력을 증명하는 문서'). 해당 직종인 경우에만(조리사). 근무했던 기관의 재직증명서(기관의 명칭, 소재지 및 전화번호가 기재된 것) 등으로 기능을 요하는 업무에 종사한 기간을 증명하는 문서(외국 교육기관에서 해당 업무에 관련된 과목을 전공한 기간 포함). 공적 기관이 발급한 증명서가 있는 경우 그 사본(중국 요리사는 호구부 및 직업자격증명서)",
  ],
  "タイ料理人の職歴・技能水準を証明する文書": [
    "Documents proving the work history and skill level of a Thai cook",
    "태국 요리사의 경력·기능 수준을 증명하는 문서",
  ],
  "職種によって提出する文書が異なる（案内ページの「職歴を証明する文書」）。該当する職種の場合のみ（タイ料理人）。タイ料理人として5年以上の実務経験を証明する文書（タイ労働省が発行するタイ料理人としての技能水準に関する証明書を取得するための要件を満たすために教育機関において教育を受けた期間を含む）、初級以上のタイ料理人としての技能水準に関する証明書、申請の直前1年間にタイでタイ料理人として妥当な報酬を受けていたことを証明する文書": [
    "The documents to submit differ by occupation (\\\"Documents proving work history\\\" in the guidance). Only for the following occupation (Thai cook). A document proving at least 5 years of practical experience as a Thai cook (including the period of education received at an educational institution to meet the requirements for obtaining the certificate of skill level as a Thai cook issued by the Thai Ministry of Labour), a certificate of skill level as a Thai cook at beginner level or above, and a document proving that the applicant received appropriate remuneration as a Thai cook in Thailand during the year immediately before the application",
    "직종에 따라 제출하는 문서가 다릅니다(안내 페이지의 '경력을 증명하는 문서'). 해당 직종인 경우에만(태국 요리사). 태국 요리사로서 5년 이상의 실무 경험을 증명하는 문서(태국 노동부가 발급하는 태국 요리사 기능 수준 증명서를 취득하기 위한 요건을 충족하기 위해 교육기관에서 교육을 받은 기간을 포함), 초급 이상의 태국 요리사로서의 기능 수준에 관한 증명서, 신청 직전 1년 동안 태국에서 태국 요리사로서 적정한 보수를 받았음을 증명하는 문서",
  ],
  "外国特有の建築技術者等の職歴を証明する文書（在職証明書等）": [
    "Document proving the work history of a foreign-specific architectural engineer, etc. (certificate of employment, etc.)",
    "외국 특유의 건축 기술자 등의 경력을 증명하는 문서(재직증명서 등)",
  ],
  "職種によって提出する文書が異なる（案内ページの「職歴を証明する文書」）。該当する職種の場合のみ（外国特有の建築技術者、外国特有の製品製造者、動物の調教師、海底掘削・探査技術者、宝石・貴金属・毛皮加工技能者）。所属していた機関の在職証明書（機関の名称、所在地及び電話番号が記載されたもの）等で、技能を要する業務に従事した期間を証明する文書（外国の教育機関で当該業務に係る科目を専攻した期間を含む）": [
    "The documents to submit differ by occupation (\\\"Documents proving work history\\\" in the guidance). Only for the following occupation (foreign-specific architectural engineer, foreign-specific product maker, animal trainer, undersea drilling/exploration engineer, or jewelry/precious metal/fur processing craftsperson). A certificate of employment from a former organization (stating its name, address and telephone number) or similar document proving the period of work requiring the skill (including the period of majoring in related subjects at a foreign educational institution)",
    "직종에 따라 제출하는 문서가 다릅니다(안내 페이지의 '경력을 증명하는 문서'). 해당 직종인 경우에만(외국 특유의 건축 기술자, 외국 특유의 제품 제조자, 동물 조련사, 해저 굴착·탐사 기술자, 보석·귀금속·모피 가공 기능자). 근무했던 기관의 재직증명서(기관의 명칭, 소재지 및 전화번호가 기재된 것) 등으로 기능을 요하는 업무에 종사한 기간을 증명하는 문서(외국 교육기관에서 해당 업무에 관련된 과목을 전공한 기간 포함)",
  ],
  "パイロットの250時間以上の飛行経歴を証明する所属機関の文書": [
    "Document from the organization proving a flight history of at least 250 hours (pilot)",
    "조종사의 250시간 이상 비행 경력을 증명하는 소속 기관의 문서",
  ],
  "職種によって提出する文書が異なる（案内ページの「職歴を証明する文書」）。該当する職種の場合のみ（パイロット）": [
    "The documents to submit differ by occupation (\\\"Documents proving work history\\\" in the guidance). Only for the following occupation (pilot)",
    "직종에 따라 제출하는 문서가 다릅니다(안내 페이지의 '경력을 증명하는 문서'). 해당 직종인 경우에만(조종사)",
  ],
  "スポーツ指導者の実務経験及び国際競技会への出場を証明する文書": [
    "Documents proving the practical experience of a sports instructor and participation in international competitions",
    "스포츠 지도자의 실무 경험 및 국제 경기대회 출전을 증명하는 문서",
  ],
  "職種によって提出する文書が異なる（案内ページの「職歴を証明する文書」）。該当する職種の場合のみ（スポーツ指導者）。指導の実務に従事していたことを証明する文書（外国の教育機関で当該スポーツの指導に係る科目を専攻した期間及び報酬を受けて当該スポーツに従事していた期間を含む）と、選手としてオリンピック大会、世界選手権大会その他国際的な競技会に出場したことを証明する文書": [
    "The documents to submit differ by occupation (\\\"Documents proving work history\\\" in the guidance). Only for the following occupation (sports instructor). A document proving that the applicant worked in sports instruction (including the period of majoring in related subjects at a foreign educational institution and the period of paid work in the sport), and a document proving that the applicant competed as an athlete in the Olympic Games, a world championship or another international competition",
    "직종에 따라 제출하는 문서가 다릅니다(안내 페이지의 '경력을 증명하는 문서'). 해당 직종인 경우에만(스포츠 지도자). 지도 실무에 종사했음을 증명하는 문서(외국 교육기관에서 해당 스포츠 지도에 관련된 과목을 전공한 기간 및 보수를 받고 해당 스포츠에 종사한 기간 포함)와, 선수로서 올림픽 대회, 세계선수권 대회 기타 국제 경기대회에 출전했음을 증명하는 문서",
  ],
  "ソムリエの実務経験及び国際ソムリエコンクールの成績又は資格を証明する文書": [
    "Documents proving a sommelier's practical experience and results at an international sommelier competition or qualification",
    "소믈리에의 실무 경험 및 국제 소믈리에 콩쿠르 성적 또는 자격을 증명하는 문서",
  ],
  "職種によって提出する文書が異なる（案内ページの「職歴を証明する文書」）。該当する職種の場合のみ（ソムリエ）。在職証明書でワイン鑑定等の実務経験を証明する文書（外国の教育機関でワイン鑑定等に係る科目を専攻した期間を含む）と、次の(ア)又は(イ)の資料（所持しない場合は(ウ)）：(ア)国際ソムリエコンクールで優秀な成績を収めたことを証明する文書、(イ)国際ソムリエコンクールで国の代表となったことを証明する文書（出場者が1国につき1名に制限されているものに限る）、(ウ)ワイン鑑定等に係る技能について、国又は地方公共団体等が認定する資格で法務大臣が告示で定めるものを有することを証明する文書": [
    "The documents to submit differ by occupation (\\\"Documents proving work history\\\" in the guidance). Only for the following occupation (sommelier). A certificate of employment proving practical experience in wine appraisal, etc. (including the period of majoring in related subjects at a foreign educational institution), and the document in (a) or (b) below (or (c) if the applicant has neither): (a) a document proving excellent results at an international sommelier competition; (b) a document proving that the applicant represented the country at an international sommelier competition (limited to competitions with one entrant per country); (c) a document proving that the applicant holds a qualification for wine appraisal skills, certified by a national or local government or an equivalent public/private body, that is designated by the Minister of Justice by public notice",
    "직종에 따라 제출하는 문서가 다릅니다(안내 페이지의 '경력을 증명하는 문서'). 해당 직종인 경우에만(소믈리에). 재직증명서로 와인 감정 등의 실무 경험을 증명하는 문서(외국 교육기관에서 와인 감정 등에 관련된 과목을 전공한 기간 포함)와, 다음 (가) 또는 (나)의 자료(소지하지 않은 경우 (다)): (가) 국제 소믈리에 콩쿠르에서 우수한 성적을 거두었음을 증명하는 문서, (나) 국제 소믈리에 콩쿠르에서 국가 대표가 되었음을 증명하는 문서(출전자가 1국당 1명으로 제한된 것에 한함), (다) 와인 감정 등에 관한 기능에 대해 국가 또는 지방공공단체 등이 인정하는 자격으로 법무대신이 고시로 정한 것을 보유하고 있음을 증명하는 문서",
  ],
  "労働契約の場合は、労働条件を明示する文書（労働基準法第15条第1項・同法施行規則第5条に基づき交付されるもの）。日本法人の役員に就任する場合は、役員報酬を定める定款の写し又は役員報酬を決議した株主総会の議事録の写し": [
    "For an employment contract: the document stating working conditions (issued under Article 15, paragraph 1 of the Labor Standards Act and Article 5 of its Enforcement Regulations). For an officer of a Japanese company: a copy of the articles of incorporation setting officer remuneration, or a copy of the minutes of the shareholders' meeting resolving it",
    "노동계약의 경우: 근로조건을 명시한 문서(노동기준법 제15조 제1항 및 동법 시행규칙 제5조에 따라 교부되는 것). 일본 법인의 임원으로 취임하는 경우: 임원 보수를 정한 정관의 사본 또는 임원 보수를 결의한 주주총회 의사록의 사본",
  ],
  "転職後、初回の更新許可申請の場合のみ。新規事業の場合は事業計画書": [
    "Only for the first renewal application after changing jobs. For a new business, a business plan",
    "이직 후 첫 연장 허가 신청의 경우에만. 신규 사업의 경우 사업계획서",
  ],
  // 企業内転勤（Issue #295）
  "企業内転勤 在留資格認定証明書交付申請": [
    "Intra-company Transferee: application for certificate of eligibility",
    "기업 내 전근 사증발급인정서 교부 신청",
  ],
  "企業内転勤 在留資格変更許可申請": [
    "Intra-company Transferee: application for permission for change of status of residence",
    "기업 내 전근 체류자격 변경 허가 신청",
  ],
  "企業内転勤 在留期間更新許可申請": [
    "Intra-company Transferee: application for permission for extension of the period of stay",
    "기업 내 전근 체류기간 연장 허가 신청",
  ],
  "在留資格「企業内転勤」（出入国在留管理庁）": [
    "Status of residence \"Intra-company Transferee\" (Immigration Services Agency of Japan)",
    "체류자격 「기업 내 전근」(출입국재류관리청)",
  ],
  "「企業内転勤」に係る提出書類一覧（在留資格認定証明書交付申請用・カテゴリー共通・表1）（出入国在留管理庁）": [
    "List of documents to submit for \"Intra-company Transferee\" (for certificate of eligibility, common to all categories, Table 1) (Immigration Services Agency of Japan)",
    "「기업 내 전근」 제출서류 일람(사증발급인정서 교부 신청용·카테고리 공통·표 1)(출입국재류관리청)",
  ],
  "「企業内転勤」に係る提出書類一覧（在留資格認定証明書交付申請用・カテゴリー3・4のみ・表2）（出入国在留管理庁）": [
    "List of documents to submit for \"Intra-company Transferee\" (for certificate of eligibility, categories 3 and 4 only, Table 2) (Immigration Services Agency of Japan)",
    "「기업 내 전근」 제출서류 일람(사증발급인정서 교부 신청용·카테고리 3·4 전용·표 2)(출입국재류관리청)",
  ],
  "「企業内転勤」に係る提出書類一覧（在留資格変更許可申請用・カテゴリー共通・表1）（出入国在留管理庁）": [
    "List of documents to submit for \"Intra-company Transferee\" (for change of status of residence, common to all categories, Table 1) (Immigration Services Agency of Japan)",
    "「기업 내 전근」 제출서류 일람(체류자격 변경 허가 신청용·카테고리 공통·표 1)(출입국재류관리청)",
  ],
  "「企業内転勤」に係る提出書類一覧（在留資格変更許可申請用・カテゴリー3・4のみ・表2）（出入国在留管理庁）": [
    "List of documents to submit for \"Intra-company Transferee\" (for change of status of residence, categories 3 and 4 only, Table 2) (Immigration Services Agency of Japan)",
    "「기업 내 전근」 제출서류 일람(체류자격 변경 허가 신청용·카테고리 3·4 전용·표 2)(출입국재류관리청)",
  ],
  "「企業内転勤」に係る提出書類の変更について（令和8年4月1日運用開始）（出入国在留管理庁）": [
    "Changes to the documents to submit for \"Intra-company Transferee\" (effective April 1, 2026 (Reiwa 8)) (Immigration Services Agency of Japan)",
    "「기업 내 전근」 제출서류 변경에 대하여(2026년 4월 1일 운용 개시)(출입국재류관리청)",
  ],
  "「企業内転勤」に係る提出書類一覧（在留期間更新許可申請用）（出入国在留管理庁）": [
    "List of documents to submit for \"Intra-company Transferee\" (for extension of the period of stay) (Immigration Services Agency of Japan)",
    "「기업 내 전근」 제출서류 일람(체류기간 연장 허가 신청용)(출입국재류관리청)",
  ],
  "申請人の活動の内容等を明らかにする資料（活動内容、期間、地位及び報酬を含む。次のいずれか）": [
    "Material clarifying the applicant's activities, including the content, period, position and remuneration (any of the following)",
    "신청인의 활동 내용 등을 밝히는 자료(활동 내용, 기간, 지위 및 보수 포함. 다음 중 하나)",
  ],
  "転勤前に勤務していた事業所と転勤後の事業所の関係を示す資料（次のいずれか）": [
    "Material showing the relationship between the office where the applicant worked before the transfer and the office after the transfer (any of the following)",
    "전근 전에 근무하던 사업소와 전근 후 사업소의 관계를 나타내는 자료(다음 중 하나)",
  ],
  "転勤前に勤務していた事業所の存在を明らかにする資料（次のいずれか）": [
    "Material showing that the office where the applicant worked before the transfer exists (any of the following)",
    "전근 전에 근무하던 사업소의 존재를 밝히는 자료(다음 중 하나)",
  ],
  "申請人の経歴を証明する文書": [
    "Documents certifying the applicant's career history",
    "신청인의 경력을 증명하는 문서",
  ],
  "申請人が活動する事業所の存在を明らかにする資料（不動産登記簿、事務所の写真・平面図等）": [
    "Material showing that the office where the applicant will work exists (real estate register, photographs and floor plan of the office, etc.)",
    "신청인이 활동하는 사업소의 존재를 밝히는 자료(부동산 등기부, 사무소 사진·평면도 등)",
  ],
  "商業・法人登記": [
    "Commercial and corporate registration",
    "상업·법인 등기",
  ],
  "(1)法人を異にしない転勤の場合：転勤命令書の写し・辞令等の写し／(2)法人を異にする転勤の場合：労働基準法第15条第1項・同法施行規則第5条に基づき交付される労働条件を明示する文書／(3)役員等労働者に該当しない者：会社の場合は役員報酬を定める定款の写し又は役員報酬を決議した株主総会の議事録（報酬委員会が設置されている会社は同委員会の議事録）の写し、会社以外の団体の場合は地位（担当業務）、期間及び支払われる報酬額を明らかにする所属団体の文書": [
    "(1) Transfer within the same legal entity: a copy of the transfer order and a copy of the letter of appointment, etc. / (2) Transfer between different legal entities: a document stating working conditions issued under Article 15, paragraph 1 of the Labor Standards Act and Article 5 of its Enforcement Regulations / (3) Persons who are not workers, such as officers: for a company, a copy of the articles of incorporation setting officer remuneration or of the minutes of the shareholders' meeting resolving it (the minutes of the remuneration committee, if the company has one); for an organization other than a company, a document of the organization stating the position (duties), period and remuneration to be paid",
    "(1) 같은 법인 내 전근인 경우: 전근 명령서 사본·발령장 등의 사본 / (2) 법인이 다른 전근인 경우: 근로기준법 제15조 제1항 및 동 시행규칙 제5조에 따라 교부되는 근로조건을 명시한 문서 / (3) 임원 등 근로자에 해당하지 않는 사람: 회사의 경우 임원 보수를 정한 정관 사본 또는 임원 보수를 결의한 주주총회 의사록(보수위원회가 설치된 회사는 같은 위원회 의사록) 사본, 회사 이외의 단체의 경우 지위(담당 업무), 기간 및 지급되는 보수액을 밝히는 소속 단체의 문서",
  ],
  "(1)同一の法人内の転勤の場合：外国法人の支店の登記事項証明書等、当該法人が日本に事業所を有することを明らかにする資料／(2)日本法人への出向の場合：当該日本法人と出向元の外国法人との出資関係を明らかにする資料／(3)日本に事務所を有する外国法人への出向の場合：当該外国法人の支店の登記事項証明書等（日本に事務所を有することを明らかにする資料）と、当該外国法人と出向元の法人との資本関係を明らかにする資料": [
    "(1) Transfer within the same legal entity: a certificate of registered matters of the foreign corporation's branch, etc., showing that the corporation has an office in Japan / (2) Secondment to a Japanese corporation: material showing the capital relationship between that Japanese corporation and the foreign corporation that sends the applicant / (3) Secondment to a foreign corporation that has an office in Japan: a certificate of registered matters of that foreign corporation's branch, etc. (showing that it has an office in Japan), and material showing the capital relationship between that foreign corporation and the sending corporation",
    "(1) 같은 법인 내 전근인 경우: 외국 법인 지점의 등기사항증명서 등, 해당 법인이 일본에 사업소를 두고 있음을 밝히는 자료 / (2) 일본 법인으로 파견되는 경우: 해당 일본 법인과 파견 원 외국 법인의 출자 관계를 밝히는 자료 / (3) 일본에 사무소를 둔 외국 법인으로 파견되는 경우: 해당 외국 법인 지점의 등기사항증명서 등(일본에 사무소를 두고 있음을 밝히는 자료)과 해당 외국 법인과 파견 원 법인의 자본 관계를 밝히는 자료",
  ],
  "(1)公的機関から発行された法人登記に関する資料／(2)納税状況、取引実績、船荷証券、輸出入許可書、広告等": [
    "(1) Material on corporate registration issued by a public agency / (2) Tax payment status, transaction record, bill of lading, import/export permit, advertisements, etc.",
    "(1) 공적 기관이 발행한 법인 등기에 관한 자료 / (2) 납세 상황, 거래 실적, 선하증권, 수출입 허가서, 광고 등",
  ],
  "(1)関連する業務に従事した機関及び内容並びに期間を明示した履歴書／(2)過去1年間に従事した業務内容及び地位、報酬を明示した、転勤の直前に勤務した外国の機関の文書（社会保険加入証明、戸口簿等）。転勤の直前1年以内に企業内転勤の在留資格で本邦に在留していた期間がある場合は、その期間に勤務していた本邦の機関を含む": [
    "(1) A résumé stating the organizations, content and periods of related work / (2) A document of the foreign organization where the applicant worked immediately before the transfer, stating the work, position and remuneration over the past year (social insurance certificate, household register, etc.). If the applicant stayed in Japan with the status of residence \"Intra-company Transferee\" within one year immediately before the transfer, this includes the Japanese organization where the applicant worked during that period",
    "(1) 관련 업무에 종사한 기관 및 내용, 기간을 명시한 이력서 / (2) 최근 1년간 종사한 업무 내용, 지위, 보수를 명시한, 전근 직전에 근무한 외국 기관의 문서(사회보험 가입 증명, 호적 등). 전근 직전 1년 이내에 기업 내 전근 체류자격으로 일본에 체류한 기간이 있는 경우에는 그 기간에 근무한 일본 기관을 포함",
  ],
  "沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が詳細に記載された案内書、又はこれに準ずる勤務先等の作成した文書のいずれか": [
    "Either a brochure describing in detail the history, officers, organization and business (including main clients and transaction record), or an equivalent document prepared by the workplace",
    "연혁, 임원, 조직, 사업 내용(주요 거래처와 거래 실적 포함) 등이 상세히 기재된 안내서 또는 이에 준하는 근무처 등이 작성한 문서 중 하나",
  ],
  "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）。入国後間もない場合や転居等で発行されないときは、最寄りの出入国在留管理官署に問い合わせる。提出できない場合は、給与について申告済みであることを明らかにする資料を提出する": [
    "One stating a year's total income and tax payment status. If one certificate states both, either one is sufficient (issued by the municipality of the address as of January 1). If it cannot be issued because of recent arrival or a move, ask the nearest immigration office. If it cannot be submitted, submit material showing that the salary has been declared",
    "1년간의 총소득 및 납세 상황이 기재된 것. 둘 다 기재된 증명서라면 어느 한쪽이어도 됨(1월 1일 현재 주소지의 시구정촌에서 발급). 입국 직후나 이사 등으로 발급되지 않을 때는 가까운 출입국재류관리관서에 문의. 제출할 수 없는 경우에는 급여에 대해 신고를 마쳤음을 밝히는 자료를 제출",
  ],
  // 特定活動（特定研究等活動。Issue #299）
  "在留資格「特定活動」（特定研究等活動）（出入国在留管理庁）": [
    "Status of residence \"Designated Activities\" (Designated Research Activities) (Immigration Services Agency of Japan)",
    "체류자격 「특정활동」(특정 연구 등 활동)(출입국재류관리청)",
  ],
  "特定活動（特定研究等活動） 在留資格認定証明書交付申請": [
    "Designated Activities (Designated Research Activities): application for certificate of eligibility",
    "특정활동(특정 연구 등 활동) 사증발급인정서 교부 신청",
  ],
  "特定活動（特定研究等活動） 在留資格変更許可申請": [
    "Designated Activities (Designated Research Activities): application for permission for change of status of residence",
    "특정활동(특정 연구 등 활동) 체류자격 변경 허가 신청",
  ],
  "特定活動（特定研究等活動） 在留期間更新許可申請": [
    "Designated Activities (Designated Research Activities): application for permission for extension of the period of stay",
    "특정활동(특정 연구 등 활동) 체류기간 연장 허가 신청",
  ],
  "申請人と契約を結んだ本邦の機関の概要及び事業活動を明らかにする資料：案内書（パンフレット等）": [
    "Materials showing the outline and business activities of the Japanese organization that has a contract with the applicant: brochure (pamphlet, etc.)",
    "신청인과 계약을 체결한 일본 기관의 개요 및 사업 활동을 밝히는 자료: 안내서(팸플릿 등)",
  ],
  "申請人が研究、研究の指導又は教育と関連する事業を自ら経営する活動を行う場合も、案内書・登記事項証明書・これらに準ずる文書を提出する": [
    "Also submit the brochure, the certificate of registered matters and equivalent documents when the applicant will personally operate a business related to research, research guidance or education",
    "신청인이 연구, 연구 지도 또는 교육과 관련된 사업을 직접 경영하는 활동을 하는 경우에도 안내서·등기사항증명서·이에 준하는 문서를 제출한다",
  ],
  "上記の案内書及び登記事項証明書に準ずる文書": [
    "Documents equivalent to the above brochure and certificate of registered matters",
    "위 안내서 및 등기사항증명서에 준하는 문서",
  ],
  "適宜。案内書・登記事項証明書だけでは機関の概要・事業活動が明らかにならない場合に提出する": [
    "As appropriate. Submit when the brochure and the certificate of registered matters alone do not show the organization's outline and business activities",
    "적절히. 안내서·등기사항증명서만으로는 기관의 개요·사업 활동이 밝혀지지 않는 경우에 제출한다",
  ],
  "国籍・氏名・性別・生年月日・入社年月日・在留資格・在留期間・在留期間満了日・職務内容を含んだもの": [
    "Including nationality, name, sex, date of birth, date of joining, status of residence, period of stay, expiry date of the period of stay and job duties",
    "국적·성명·성별·생년월일·입사일·체류자격·체류기간·체류기간 만료일·직무 내용을 포함한 것",
  ],
  "用紙は地方出入国在留管理官署に用意されている": [
    "The form is available at the regional immigration services bureaus",
    "용지는 지방출입국·외국인관서에 비치되어 있다",
  ],
  "(1)受入れ機関（本邦の機関）との雇用契約書の写し／(2)辞令の写し／(3)採用通知書の写し／(4)上記(1)〜(3)に準ずる文書": [
    "(1) Copy of the employment contract with the host organization (Japanese organization) / (2) copy of the letter of appointment / (3) copy of the notice of hiring / (4) documents equivalent to (1) to (3)",
    "(1) 수용 기관(일본 기관)과의 고용계약서 사본 / (2) 발령장 사본 / (3) 채용 통지서 사본 / (4) 위 (1)~(3)에 준하는 문서",
  ],
  "卒業証明書、在職証明書、履歴書（各1通）": [
    "Graduation certificate, certificate of employment and curriculum vitae (one of each)",
    "졸업증명서, 재직증명서, 이력서(각 1통)",
  ],
  "前雇用先機関が作成した退職証明書（退職日を明記したもの）": [
    "Certificate of retirement issued by the previous employer (stating the retirement date)",
    "전 고용처 기관이 작성한 퇴직증명서(퇴직일을 명기한 것)",
  ],
  "転職した場合のみ": [
    "Only if the applicant has changed jobs",
    "이직한 경우에만",
  ],
  "転職した場合のみ。1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）。入国後間もない場合や転居等で発行されないときは、最寄りの出入国在留管理官署に問い合わせる": [
    "Only if the applicant has changed jobs. A certificate stating total income and tax payment status for one year. A certificate stating both is sufficient on its own (issued by the municipality of the address as of January 1). If it cannot be issued, e.g. soon after entry or because of relocation, consult the nearest regional immigration services bureau",
    "이직한 경우에만. 1년간의 총소득 및 납세 상황이 기재된 것. 둘 다 기재된 증명서라면 어느 한쪽이라도 된다(1월 1일 현재 주소지의 시·구·읍·면에서 발급). 입국 후 얼마 안 된 경우나 이사 등으로 발급되지 않을 때는 가까운 출입국·외국인관서에 문의한다",
  ],
  "研究、研究の指導又は教育と関連する事業に係る事業所の損益計算書の写し": [
    "Copy of the profit and loss statement of the business site for the business related to research, research guidance or education",
    "연구, 연구 지도 또는 교육과 관련된 사업에 관한 사업소의 손익계산서 사본",
  ],
  "「特定研究等活動」で、研究、研究の指導又は教育と関連する事業を自ら経営する活動を行っている場合のみ（1通）。入管庁の案内ページでは「その他（転職した場合）」の項に記載されている": [
    "Only if the applicant, under \"Designated Research Activities\", personally operates a business related to research, research guidance or education (one copy). The Immigration Services Agency's guidance page lists it under \"Other (if the applicant has changed jobs)\"",
    "「특정 연구 등 활동」으로 연구, 연구 지도 또는 교육과 관련된 사업을 직접 경영하는 활동을 하고 있는 경우에만(1통). 출입국재류관리청 안내 페이지에는 「기타(이직한 경우)」 항목에 기재되어 있다",
  ],
  // 特定活動（本邦大学卒業者。Issue #300）
  "在留資格「特定活動」（本邦大学等卒業者及びその配偶者等）（出入国在留管理庁）": [
    "Status of residence \"Designated Activities\" (graduates of Japanese universities, etc. and their spouses, etc.) (Immigration Services Agency of Japan)",
    "체류자격 「특정활동」(본방 대학 등 졸업자 및 그 배우자 등)(출입국재류관리청)",
  ],
  "特定活動（本邦大学卒業者） 在留資格認定証明書交付申請": [
    "Designated Activities (Graduates of Japanese universities): application for certificate of eligibility",
    "특정활동(본방 대학 졸업자) 사증발급인정서 교부 신청",
  ],
  "特定活動（本邦大学卒業者） 在留資格変更許可申請": [
    "Designated Activities (Graduates of Japanese universities): application for permission for change of status of residence",
    "특정활동(본방 대학 졸업자) 체류자격 변경 허가 신청",
  ],
  "特定活動（本邦大学卒業者） 在留期間更新許可申請": [
    "Designated Activities (Graduates of Japanese universities): application for permission for extension of the period of stay",
    "특정활동(본방 대학 졸업자) 체류기간 연장 허가 신청",
  ],
  "申請人の労働基準法第15条第1項及び同法施行規則第5条に基づき、労働者に交付される労働条件を明示する文書（写し）": [
    "Document stating the working conditions, issued to the worker under Article 15, paragraph 1 of the Labor Standards Act and Article 5 of its Enforcement Regulations (copy)",
    "신청인의 노동기준법 제15조 제1항 및 동법 시행규칙 제5조에 따라 근로자에게 교부되는 근로조건 명시 문서(사본)",
  ],
  "雇用理由書": [
    "Statement of reasons for employment",
    "고용 이유서",
  ],
  "労働条件を明示する文書の内容から、日本語を用いた業務等、本制度に該当する業務に従事することが明らかな場合は提出不要。所属機関が作成したものが必要で、様式は自由（所属機関名及び代表者の記名をお願いします）": [
    "Not required if the document stating the working conditions makes it clear that the applicant will engage in work covered by this system, such as work using Japanese. It must be prepared by the affiliated organization; the format is free (please enter the organization's name and the representative's name)",
    "근로조건 명시 문서의 내용으로 보아 일본어를 사용하는 업무 등 이 제도에 해당하는 업무에 종사함이 명백한 경우에는 제출 불필요. 소속 기관이 작성한 것이 필요하며 양식은 자유(소속 기관명 및 대표자 기명 요망)",
  ],
  "申請人の学歴等を証明する文書（次のいずれか）": [
    "Document certifying the applicant's educational background (any of the following)",
    "신청인의 학력 등을 증명하는 문서(다음 중 하나)",
  ],
  "(1)本邦の大学卒業者又は大学院修了者：卒業（修了）証書（写し）又は卒業（修了）証明書（学位の確認が可能なものに限る）／(2)本邦の短期大学若しくは高等専門学校を卒業又は専門職大学の前期課程を修了し、独立行政法人大学改革支援・学位授与機構が行う審査に合格して学士の学位を授与された者：ア 短期大学又は高等専門学校卒業者は卒業証書（写し）又は卒業証明書、専門職大学前期課程修了者は修了証書（写し）又は修了証明書、イ 同機構が交付した学位記（写し）又は学位授与証明書／(3)外国人留学生キャリア形成促進プログラムとして認定を受けた専修学校専門課程や専攻科の学科を修了し、高度専門士の称号を付与された者：高度専門士の称号を付与されたことを証明する文書": [
    "(1) Graduates of a Japanese university or graduate school: copy of the diploma (certificate of completion) or certificate of graduation (completion) (only one from which the degree can be confirmed) / (2) Those who graduated from a Japanese junior college or college of technology, or completed the first-stage course of a professional university, passed the examination of the National Institution for Academic Degrees and Quality Enhancement of Higher Education and were awarded a bachelor's degree: (a) for junior college or college of technology graduates, a copy of the diploma or certificate of graduation; for those who completed the first-stage course of a professional university, a copy of the certificate of completion; (b) a copy of the degree certificate or certificate of degree conferral issued by that institution / (3) Those who completed a course at a specialized training college accredited under the career formation promotion program for international students and were awarded the title of Advanced Professional: a document certifying that the title was awarded",
    "(1) 일본 대학 졸업자 또는 대학원 수료자: 졸업(수료)증서(사본) 또는 졸업(수료)증명서(학위 확인이 가능한 것에 한함) / (2) 일본의 단기대학 또는 고등전문학교를 졸업하거나 전문직대학 전기과정을 수료하고, 독립행정법인 대학개혁지원·학위수여기구가 실시하는 심사에 합격하여 학사 학위를 받은 자: 가. 단기대학 또는 고등전문학교 졸업자는 졸업증서(사본) 또는 졸업증명서, 전문직대학 전기과정 수료자는 수료증서(사본) 또는 수료증명서, 나. 같은 기구가 교부한 학위기(사본) 또는 학위수여증명서 / (3) 외국인 유학생 커리어 형성 촉진 프로그램으로 인정받은 전수학교 전문과정이나 전공과 학과를 수료하고 고도전문사 칭호를 부여받은 자: 고도전문사 칭호를 부여받았음을 증명하는 문서",
  ],
  "申請人の日本語能力を証明する文書": [
    "Document certifying the applicant's Japanese language ability",
    "신청인의 일본어 능력을 증명하는 문서",
  ],
  "日本語能力試験N1又はBJTビジネス日本語能力テスト480点以上の成績証明書（写し）。外国の大学において日本語を専攻した方は、当該大学の卒業証書（写し）又は卒業証明書": [
    "Copy of the score report of the Japanese-Language Proficiency Test N1 or the BJT Business Japanese Proficiency Test (480 points or higher). For those who majored in Japanese at a foreign university, a copy of the diploma or certificate of graduation of that university",
    "일본어능력시험 N1 또는 BJT 비즈니스 일본어능력테스트 480점 이상의 성적증명서(사본). 외국 대학에서 일본어를 전공한 사람은 해당 대학의 졸업증서(사본) 또는 졸업증명서",
  ],
  "事業内容を明らかにする資料（次のいずれか）": [
    "Materials showing the business content (any of the following)",
    "사업 내용을 밝히는 자료(다음 중 하나)",
  ],
  "(1)勤務先の沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が記載された案内書／(2)その他の勤務先等の作成した(1)に準ずる文書／(3)勤務先のホームページの写し（トップページのみで可）／(4)登記事項証明書": [
    "(1) Brochure stating the history, officers, organization and business (including main clients and transaction record) of the workplace / (2) other document prepared by the workplace equivalent to (1) / (3) copy of the workplace's website (the top page is sufficient) / (4) certificate of registered matters",
    "(1) 근무처의 연혁, 임원, 조직, 사업 내용(주요 거래처와 거래 실적 포함) 등이 기재된 안내서 / (2) 그 밖에 근무처 등이 작성한 (1)에 준하는 문서 / (3) 근무처 홈페이지 사본(톱페이지만 가능) / (4) 등기사항증명서",
  ],
  "所属機関の代表者に関する申告書（参考様式）": [
    "Declaration concerning the representative of the affiliated organization (reference form)",
    "소속 기관 대표자에 관한 신고서(참고 양식)",
  ],
  "2026年4月15日以降の申請から提出する（家族としての活動の場合は添付不要）": [
    "Submit for applications made on or after April 15, 2026 (not required for activities as a family member)",
    "2026년 4월 15일 이후 신청부터 제출한다(가족으로서의 활동인 경우에는 첨부 불필요)",
  ],
  "1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）。入国後間もない場合や転居等で発行されないときは、源泉徴収票及び当該期間の給与明細書の写し、賃金台帳の写し等を提出する": [
    "One stating a year's total income and tax payment status. If one certificate states both, either one is sufficient (issued by the municipality of the address as of January 1). If it cannot be issued because of recent arrival or a move, submit the withholding slip and copies of the payslips for the period, a copy of the wage ledger, etc.",
    "1년간의 총소득 및 납세 상황이 기재된 것. 둘 다 기재된 증명서라면 어느 한쪽이어도 됨(1월 1일 현재 주소지의 시구정촌에서 발급). 입국 직후나 이사 등으로 발급되지 않을 때는 원천징수영수증 및 해당 기간의 급여명세서 사본, 임금대장 사본 등을 제출",
  ],
  // 特定活動（特定情報処理活動。Issue #334）
  "在留資格「特定活動」（特定情報処理活動）（出入国在留管理庁）": [
    "Status of residence \"Designated Activities\" (Designated Information Processing Activities) (Immigration Services Agency of Japan)",
    "체류자격 「특정활동」(특정 정보처리 활동)(출입국재류관리청)",
  ],
  "特定活動（特定情報処理活動） 在留資格認定証明書交付申請": [
    "Designated Activities (Designated information processing activities): application for certificate of eligibility",
    "특정활동(특정 정보처리 활동) 사증발급인정서 교부 신청",
  ],
  "特定活動（特定情報処理活動） 在留資格変更許可申請": [
    "Designated Activities (Designated information processing activities): application for permission for change of status of residence",
    "특정활동(특정 정보처리 활동) 체류자격 변경 허가 신청",
  ],
  "特定活動（特定情報処理活動） 在留期間更新許可申請": [
    "Designated Activities (Designated information processing activities): application for permission for extension of the period of stay",
    "특정활동(특정 정보처리 활동) 체류기간 연장 허가 신청",
  ],
  "(1)雇用契約書の写し／(2)辞令の写し／(3)採用通知書の写し／(4)上記(1)〜(3)に準ずる文書": [
    "(1) Copy of the employment contract / (2) copy of the letter of appointment / (3) copy of the notice of hiring / (4) documents equivalent to (1) to (3)",
    "(1) 고용계약서 사본 / (2) 발령장 사본 / (3) 채용 통지서 사본 / (4) 위 (1)~(3)에 준하는 문서",
  ],
  "派遣で就労する場合：派遣の根拠となる契約書及び派遣先の事業活動を明らかにする資料": [
    "If the applicant will work as a dispatched worker: the contract that is the basis for the dispatch and materials showing the business activities of the destination",
    "파견으로 근무하는 경우: 파견의 근거가 되는 계약서 및 파견처의 사업 활동을 밝히는 자료",
  ],
  "(1)在職証明書／(2)辞令の写し／(3)雇用契約書の写し／(4)上記(1)〜(3)に準ずる文書": [
    "(1) Certificate of employment / (2) copy of the letter of appointment / (3) copy of the employment contract / (4) documents equivalent to (1) to (3)",
    "(1) 재직증명서 / (2) 발령장 사본 / (3) 고용계약서 사본 / (4) 위 (1)~(3)에 준하는 문서",
  ],
  "派遣で就労する場合のみ。派遣先の事業活動を明らかにする資料は、契約機関の資料（案内書・登記事項証明書・それらに準ずる文書・外国人社員リスト。同意書を除く）に当たるもの": [
    "Only if the applicant will work as a dispatched worker. The materials showing the destination's business activities are those corresponding to the contracting organization's materials (brochure, certificate of registered matters, equivalent documents, list of foreign staff; excluding the consent form)",
    "파견으로 근무하는 경우에만 해당. 파견처의 사업 활동을 밝히는 자료는 계약 기관의 자료(안내서, 등기사항증명서, 이에 준하는 문서, 외국인 직원 목록. 동의서 제외)에 해당하는 것",
  ],
  "契約機関が変更された場合のみ": [
    "Only if the contracting organization has changed",
    "계약 기관이 변경된 경우에만",
  ],
  "契約機関が変更された場合のみ。1年間の総所得及び納税状況が記載されたもの。両方が記載されている証明書であれば、いずれか一方でよい（1月1日現在の住所地の市区町村から発行される）。入国後間もない場合や転居等で発行されないときは、最寄りの出入国在留管理官署に問い合わせる": [
    "Only if the contracting organization has changed. A certificate stating total income and tax payment status for one year. A certificate stating both is sufficient on its own (issued by the municipality of the address as of January 1). If it cannot be issued, e.g. soon after entry or because of relocation, consult the nearest regional immigration services bureau",
    "계약 기관이 변경된 경우에만. 1년간의 총소득 및 납세 상황이 기재된 것. 둘 다 기재된 증명서라면 어느 한쪽이라도 된다(1월 1일 현재 주소지의 시·구·읍·면에서 발급). 입국 후 얼마 안 된 경우나 이사 등으로 발급되지 않을 때는 가까운 출입국·외국인관서에 문의한다",
  ],

  // 技術・人文知識・国際業務（照合済み 2026-10-18。#333 手順E）
  "派遣形態で就労する場合（申請人が被派遣者の場合）のみ。直近の在留期間中の資料も提出する": [
    "Only if working under a dispatch arrangement (the applicant is a dispatched worker). Also submit the materials for the most recent period of stay",
    "파견 형태로 근무하는 경우(신청인이 피파견자인 경우)에만. 직전 체류기간 중의 자료도 제출한다",
  ],
  "転職後、初回の更新許可申請の場合のみ。労働契約の場合は労働条件通知書等。役員就任・外国法人の日本支店への転勤の場合は、公式案内の資料を提出する": [
    "Only for the first renewal application after changing jobs. For an employment contract, the notice of working conditions, etc. For appointment as an officer or transfer to the Japanese branch of a foreign corporation, submit the materials listed in the official guidance",
    "이직 후 첫 연장 허가 신청의 경우에만. 근로계약의 경우 근로조건통지서 등. 임원 취임·외국 법인의 일본 지점으로의 전근의 경우에는 공식 안내의 자료를 제출한다",
  ],
  "転職後、初回の更新許可申請の場合のみ。沿革、役員、組織、事業内容（主要取引先と取引実績を含む）等が記載されたもの、又はこれに準ずる文書": [
    "Only for the first renewal application after changing jobs. A document describing the history, officers, organization, and business (including main clients and transaction record), or an equivalent document",
    "이직 후 첫 연장 허가 신청의 경우에만. 연혁, 임원, 조직, 사업 내용(주요 거래처와 거래 실적 포함) 등이 기재된 것 또는 이에 준하는 문서",
  ],
  "言語能力を用いた対人業務に従事する場合。業務内容の変更や転職等により、言語能力を用いた対人業務等に主に従事することとなった場合は、更新時に提出が必要。以前から同様の業務に継続して従事している場合は不要（審査で求められる場合あり）。日本語の場合は、JLPT・N2以上、BJTビジネス日本語能力テスト400点以上、日本留学試験（日本語）200点以上、JPT日本語能力試験525点以上、中長期在留者として20年以上の在留、本邦の大学卒業又は高等専門学校・専修学校の専門課程・専攻科の修了、我が国の義務教育修了と高等学校卒業のいずれかに該当すれば、B2相当の日本語能力を有するものとみなす": [
    "If engaged in interpersonal work that uses language ability. If, due to a change in duties or a job change, the applicant has come to mainly engage in such work, it must be submitted at renewal. Not required if the applicant has continuously engaged in similar work (it may be requested during examination). For Japanese, the applicant is deemed to have Japanese ability equivalent to CEFR B2 if any of the following applies: JLPT N2 or higher, BJT Business Japanese Proficiency Test 400 points or more, Examination for Japanese University Admission for International Students (Japanese) 200 points or more, JPT Japanese Proficiency Test 525 points or more, residence in Japan as a mid- to long-term resident for 20 years or more, graduation from a Japanese university or completion of the specialized course or advanced course of a Japanese college of technology or specialized training college, or completion of compulsory education in Japan and graduation from high school",
    "언어 능력을 사용하는 대인 업무에 종사하는 경우. 업무 내용의 변경이나 이직 등으로 언어 능력을 사용하는 대인 업무 등에 주로 종사하게 된 경우에는 연장 시 제출이 필요하다. 이전부터 같은 업무에 계속 종사하고 있는 경우에는 불필요(심사에서 요구될 수 있음). 일본어의 경우 JLPT N2 이상, BJT 비즈니스 일본어 능력 테스트 400점 이상, 일본유학시험(일본어) 200점 이상, JPT 일본어 능력시험 525점 이상, 중장기 재류자로서 20년 이상 재류, 일본 대학 졸업 또는 고등전문학교·전수학교 전문과정·전공과 수료, 일본 의무교육 수료 및 고등학교 졸업 중 어느 하나에 해당하면 CEFR B2 상당의 일본어 능력을 갖춘 것으로 본다",
  ],
  "転職後、初回の更新許可申請の場合のみ。カテゴリー3は源泉徴収の資料が不要。源泉徴収の免除を受ける機関の場合のみ。この場合は、下の給与支払事務所等の開設届出書等は不要": [
    "Only for the first renewal application after changing jobs. Category 3 does not need the withholding documents. Only for an organization exempt from withholding. In that case, the notification of opening a payroll office and the like below are not required",
    "이직 후 첫 연장 허가 신청의 경우에만. 카테고리 3은 원천징수 관련 자료가 불필요. 원천징수 면제를 받는 기관의 경우에만. 이 경우 아래의 급여지급사무소 개설 신고서 등은 불필요",
  ],
  "転職後、初回の更新許可申請の場合のみ。カテゴリー3は源泉徴収の資料が不要": [
    "Only for the first renewal application after changing jobs. Category 3 does not need the withholding documents",
    "이직 후 첫 연장 허가 신청의 경우에만. 카테고리 3은 원천징수 관련 자료가 불필요",
  ],
  "転職後、初回の更新許可申請の場合のみ。カテゴリー3は源泉徴収の資料が不要。納期の特例の承認を受けている場合": [
    "Only for the first renewal application after changing jobs. Category 3 does not need the withholding documents. If the special payment deadline has been approved",
    "이직 후 첫 연장 허가 신청의 경우에만. 카테고리 3은 원천징수 관련 자료가 불필요. 납기 특례의 승인을 받은 경우",
  ],
  "「留学」からの変更で、カテゴリー2（大学・短大・大学院の卒業（予定）者等）として扱う場合。チェックシートでは、カテゴリーを証明する文書の選択肢の一つとして○。カテゴリー2として扱う「留学」からの変更は、a.本邦の大学院・大学・短大の卒業（予定）者、b.海外の優秀大学の卒業者（3つの世界ランキング中2つ以上で上位300位の外国の大学）、c.「留学」から就労資格に変更して就労し、その後当該所属機関において在留期間更新した者を現に受け入れている機関において就労する者": [
    "Only for a change from \"Student\" treated as Category 2 (graduates or prospective graduates of universities, junior colleges, graduate schools, etc.). On the checksheet it is marked ○ as one of the options for the document proving the category. Changes from \"Student\" treated as Category 2 are: (a) graduates or prospective graduates of a Japanese graduate school, university, or junior college; (b) graduates of an excellent overseas university (a foreign university ranked in the top 300 in at least 2 of 3 world rankings); (c) persons who work at an organization that currently employs a person who changed from \"Student\" to a work status, worked there, and then renewed the period of stay with that organization",
    "'유학'에서의 변경으로 카테고리 2(대학·단기대학·대학원 졸업(예정)자 등)로 취급하는 경우에만. 체크시트에서는 카테고리를 증명하는 문서의 선택지 중 하나로 ○. 카테고리 2로 취급하는 '유학'에서의 변경은 a. 일본 대학원·대학·단기대학 졸업(예정)자, b. 해외 우수 대학 졸업자(3개 세계 랭킹 중 2개 이상에서 상위 300위인 외국 대학), c. '유학'에서 취업 자격으로 변경하여 취업하고 이후 해당 소속 기관에서 체류기간을 갱신한 사람을 현재 받아들이고 있는 기관에서 근무하는 사람",
  ],
  "専門学校を卒業した場合のみ。外国人留学生キャリア形成促進プログラムの認定学科修了者は認定学科修了証明書。認定学科修了証明書は、案内ページにあるが、チェックシート（PDF）にはないため要確認": [
    "Only if graduated from a specialized training college. Persons who completed a department certified under the Career Formation Promotion Program for International Students must submit the certificate of completion of the certified department. The certificate of completion of the certified department appears on the guidance page but not on the checksheet (PDF), so confirmation is required",
    "전수학교를 졸업한 경우에만. 외국인 유학생 커리어 형성 촉진 프로그램으로 인정받은 학과 수료자는 인정학과 수료증명서. 인정학과 수료증명서는 안내 페이지에는 있으나 체크시트(PDF)에는 없으므로 확인 필요",
  ],
  "主に言語能力を用いて対人業務等に従事する場合（翻訳・通訳、接客等）。日本語の場合は、JLPT・N2以上、BJTビジネス日本語能力テスト400点以上、日本留学試験（日本語）200点以上、JPT日本語能力試験525点以上、中長期在留者として20年以上の在留、本邦の大学卒業又は高等専門学校・専修学校の専門課程・専攻科の修了、我が国の義務教育修了と高等学校卒業のいずれかに該当すれば、B2相当の日本語能力を有するものとみなす": [
    "If mainly engaged in interpersonal work that uses language ability (translation, interpreting, customer service, etc.). For Japanese, the applicant is deemed to have Japanese ability equivalent to CEFR B2 if any of the following applies: JLPT N2 or higher, BJT Business Japanese Proficiency Test 400 points or more, Examination for Japanese University Admission for International Students (Japanese) 200 points or more, JPT Japanese Proficiency Test 525 points or more, residence in Japan as a mid- to long-term resident for 20 years or more, graduation from a Japanese university or completion of the specialized course or advanced course of a Japanese college of technology or specialized training college, or completion of compulsory education in Japan and graduation from high school",
    "주로 언어 능력을 사용하는 대인 업무 등에 종사하는 경우(번역·통역, 접객 등). 일본어의 경우 JLPT N2 이상, BJT 비즈니스 일본어 능력 테스트 400점 이상, 일본유학시험(일본어) 200점 이상, JPT 일본어 능력시험 525점 이상, 중장기 재류자로서 20년 이상 재류, 일본 대학 졸업 또는 고등전문학교·전수학교 전문과정·전공과 수료, 일본 의무교육 수료 및 고등학교 졸업 중 어느 하나에 해당하면 CEFR B2 상당의 일본어 능력을 갖춘 것으로 본다",
  ],
  "専門学校を卒業した場合のみ。外国人留学生キャリア形成促進プログラムの認定学科修了者は認定学科修了証明書": [
    "Only if graduated from a specialized training college. Persons who completed a department certified under the Career Formation Promotion Program for International Students must submit the certificate of completion of the certified department",
    "전수학교를 졸업한 경우에만. 외국인 유학생 커리어 형성 촉진 프로그램으로 인정받은 학과 수료자는 인정학과 수료증명서",
  ],
  "履歴書と、学歴又は職歴を証明する文書。外国の文化に基盤を有する業務では、3年以上の実務経験を証明する文書など、業務内容により異なる。IT技術者の資格証書は、案内ページに「【共通】６の資料を提出している場合は不要」とあるが、【共通】６が指す書類は未確認（行政書士が確認する）": [
    "A résumé and a document proving educational background or work history. Requirements differ by the type of work, such as a document proving 3 or more years of practical experience for work based on a foreign culture. For IT engineers' qualification certificates, the guidance page says they are \"not required if the materials in [Common] 6 have been submitted\", but which document [Common] 6 refers to has not been confirmed (to be confirmed by the scrivener)",
    "이력서와 학력 또는 경력을 증명하는 문서. 외국 문화에 기반을 둔 업무에서는 3년 이상의 실무 경험을 증명하는 문서 등 업무 내용에 따라 다르다. IT 기술자의 자격증서는 안내 페이지에 '[공통] 6의 자료를 제출한 경우에는 불필요'라고 되어 있으나, [공통] 6이 가리키는 서류는 미확인(행정서사가 확인한다)",
  ],
  "申請人が被派遣者の場合のみ": [
    "Only if the applicant is a dispatched worker",
    "신청인이 피파견자인 경우에만",
  ],
  "翻訳・通訳、接客等、言語能力を用いた対人業務に主に従事する場合。それ以外でも審査で求められる場合がある。日本語の場合は、JLPT・N2以上、BJTビジネス日本語能力テスト400点以上、日本留学試験（日本語）200点以上、JPT日本語能力試験525点以上、中長期在留者として20年以上の在留、本邦の大学卒業又は高等専門学校・専修学校の専門課程・専攻科の修了、我が国の義務教育修了と高等学校卒業のいずれかに該当すれば、B2相当の日本語能力を有するものとみなす": [
    "If mainly engaged in interpersonal work that uses language ability, such as translation, interpreting, and customer service. It may be requested during examination even in other cases. For Japanese, the applicant is deemed to have Japanese ability equivalent to CEFR B2 if any of the following applies: JLPT N2 or higher, BJT Business Japanese Proficiency Test 400 points or more, Examination for Japanese University Admission for International Students (Japanese) 200 points or more, JPT Japanese Proficiency Test 525 points or more, residence in Japan as a mid- to long-term resident for 20 years or more, graduation from a Japanese university or completion of the specialized course or advanced course of a Japanese college of technology or specialized training college, or completion of compulsory education in Japan and graduation from high school",
    "번역·통역, 접객 등 언어 능력을 사용하는 대인 업무에 주로 종사하는 경우. 그 외의 경우에도 심사에서 요구될 수 있다. 일본어의 경우 JLPT N2 이상, BJT 비즈니스 일본어 능력 테스트 400점 이상, 일본유학시험(일본어) 200점 이상, JPT 일본어 능력시험 525점 이상, 중장기 재류자로서 20년 이상 재류, 일본 대학 졸업 또는 고등전문학교·전수학교 전문과정·전공과 수료, 일본 의무교육 수료 및 고등학교 졸업 중 어느 하나에 해당하면 CEFR B2 상당의 일본어 능력을 갖춘 것으로 본다",
  ],

  // 取得：芸術・宗教・法律・会計業務・短期滞在・特定活動〔07・08・11〕（照合済み 2026-10-19。Issue #421・#422・#424・#431・#432）
  "芸術 在留資格取得許可申請（一部のみ整備）": [
    "Artist: application for permission for acquisition of status of residence (only partly covered)",
    "예술 체류자격 취득 허가 신청(일부만 정비)",
  ],
  "宗教 在留資格取得許可申請（一部のみ整備）": [
    "Religious Activities: application for permission for acquisition of status of residence (only partly covered)",
    "종교 체류자격 취득 허가 신청(일부만 정비)",
  ],
  "法律・会計業務 在留資格取得許可申請（一部のみ整備）": [
    "Legal/Accounting Services: application for permission for acquisition of status of residence (only partly covered)",
    "법률·회계업무 체류자격 취득 허가 신청(일부만 정비)",
  ],
  "短期滞在 在留資格取得許可申請（一部のみ整備）": [
    "Temporary Visitor: application for permission for acquisition of status of residence (only partly covered)",
    "단기체재 체류자격 취득 허가 신청(일부만 정비)",
  ],
  "特定活動（特定研究等活動） 在留資格取得許可申請（一部のみ整備）": [
    "Designated Activities (designated research activities, etc.): application for permission for acquisition of status of residence (only partly covered)",
    "특정활동(특정연구등활동) 체류자격 취득 허가 신청(일부만 정비)",
  ],
  "特定活動（本邦大学卒業者） 在留資格取得許可申請（一部のみ整備）": [
    "Designated Activities (graduates of Japanese universities): application for permission for acquisition of status of residence (only partly covered)",
    "특정활동(일본 대학 졸업자) 체류자격 취득 허가 신청(일부만 정비)",
  ],
  "特定活動（特定情報処理活動） 在留資格取得許可申請（一部のみ整備）": [
    "Designated Activities (designated information processing activities): application for permission for acquisition of status of residence (only partly covered)",
    "특정활동(특정정보처리활동) 체류자격 취득 허가 신청(일부만 정비)",
  ],
  "入管庁『在留資格から探す』の各ページ（URL 未記録）": [
    "Pages of the Immigration Services Agency of Japan's \"Search by status of residence\" (URL not recorded)",
    "출입국재류관리청 '체류자격으로 찾기'의 각 페이지(URL 미기록)",
  ],
  "在留資格「法律・会計業務」在留資格取得許可申請（出入国在留管理庁）": [
    "Status of residence \"Legal/Accounting Services\": application for permission for acquisition of status of residence (Immigration Services Agency of Japan)",
    "체류자격 '법률·회계업무' 체류자격 취득 허가 신청(출입국재류관리청)",
  ],
  "在留資格「特定活動」（特定研究等活動）在留資格取得許可申請（出入国在留管理庁）": [
    "Status of residence \"Designated Activities\" (designated research activities, etc.): application for permission for acquisition of status of residence (Immigration Services Agency of Japan)",
    "체류자격 '특정활동'(특정연구등활동) 체류자격 취득 허가 신청(출입국재류관리청)",
  ],
  "在留資格「特定活動」（本邦大学等卒業者）在留資格取得許可申請（出入国在留管理庁）": [
    "Status of residence \"Designated Activities\" (graduates of Japanese universities, etc.): application for permission for acquisition of status of residence (Immigration Services Agency of Japan)",
    "체류자격 '특정활동'(일본 대학 등 졸업자) 체류자격 취득 허가 신청(출입국재류관리청)",
  ],
  "在留資格「特定活動」（特定情報処理活動）在留資格取得許可申請（出入国在留管理庁）": [
    "Status of residence \"Designated Activities\" (designated information processing activities): application for permission for acquisition of status of residence (Immigration Services Agency of Japan)",
    "체류자격 '특정활동'(특정정보처리활동) 체류자격 취득 허가 신청(출입국재류관리청)",
  ],
  "提示のみで、提出書類としてコピーを付ける書類ではない。案内ページの原文は「パスポート及び在留カード 提示」": [
    "To be presented only; not a document to be submitted with a copy. The original text on the guidance page reads \"Passport and Residence Card: to be presented\"",
    "제시만 하며, 제출 서류로 사본을 첨부하는 서류가 아니다. 안내 페이지의 원문은 '여권 및 재류카드 제시'",
  ],
  "提示のみで、提出書類としてコピーを付ける書類ではない。在留カードを持たない場合の扱いは、案内ページに記載がないため行政書士が確認する": [
    "To be presented only; not a document to be submitted with a copy. The handling when the applicant has no residence card is not stated on the guidance page, so the administrative scrivener confirms it",
    "제시만 하며, 제출 서류로 사본을 첨부하는 서류가 아니다. 재류카드를 가지고 있지 않은 경우의 취급은 안내 페이지에 기재가 없으므로 행정서사가 확인한다",
  ],
  "次のいずれか。(1)公私の機関又は個人との契約に基づいて活動を行う場合：活動の内容、期間、地位及び報酬を証明する文書 1通 (2)公私の機関又は個人との契約に基づかないで活動を行う場合：申請人が作成する具体的な活動の内容、期間及び行おうとする活動から生じる収入の見込額を記載した文書（適宜の様式） 適宜": [
    "Any one of the following. (1) If the activities are based on a contract with a public or private organization or an individual: a document certifying the content, period, position, and remuneration of the activities (1 copy) (2) If the activities are not based on such a contract: a document prepared by the applicant stating the specific content and period of the activities and the expected income from them (any format) (as appropriate)",
    "다음 중 하나. (1) 공사의 기관 또는 개인과의 계약에 따라 활동하는 경우: 활동의 내용, 기간, 지위 및 보수를 증명하는 문서 1통 (2) 공사의 기관 또는 개인과의 계약에 따르지 않고 활동하는 경우: 신청인이 작성하는 구체적인 활동의 내용, 기간 및 하려는 활동으로 생기는 수입 예상액을 기재한 문서(적절한 양식) 적절히",
  ],
  "次のいずれか。関係団体からの推薦状 1通／過去の活動に関する報道 適宜／入賞、入選等の実績 適宜／過去の作品等の目録 適宜／これらに準ずるもの 適宜": [
    "Any one of the following: a letter of recommendation from a related organization (1 copy) / press coverage of past activities (as appropriate) / records of prizes, selections, etc. (as appropriate) / a catalog of past works, etc. (as appropriate) / materials equivalent to these (as appropriate)",
    "다음 중 하나. 관계 단체의 추천장 1통／과거 활동에 관한 보도 적절히／입상, 입선 등의 실적 적절히／과거 작품 등의 목록 적절히／이에 준하는 것 적절히",
  ],
  "適宜": ["As appropriate", "적절히"],
  "適宜。派遣機関からの証明書等で、申請人の宗教家としての地位、職歴を証明する。派遣状等に地位・職歴が記載されていれば不要": [
    "As appropriate. Prove the applicant's position and career as a religious worker with a certificate, etc. from the dispatching organization. Not required if the letter of dispatch, etc. states the position and career",
    "적절히. 파견 기관의 증명서 등으로 신청인의 종교가로서의 지위, 경력을 증명한다. 파견장 등에 지위·경력이 기재되어 있으면 불필요",
  ],
  "適宜。提示": ["As appropriate. To be presented", "적절히. 제시"],
};

function pickLang(t: Translated | undefined, lang: Lang): string | undefined {
  if (!t || lang === "ja") return undefined;
  return t[lang === "en" ? 0 : 1];
}

/** 規則の注記・題名・出典名の、画面用の訳。訳がなければ日本語の原文 */
export function ruleText(lang: Lang, original: string): string {
  return pickLang(RULE_TEXT_TRANSLATIONS[original], lang) ?? original;
}

/** 規則の書類名の、画面用の訳（案内書類の訳表を優先し、なければこの訳表）。訳がなければ日本語の原文 */
export function ruleDocumentName(lang: Lang, original: string): string {
  return translatedRequirementName(original, lang) ?? ruleText(lang, original);
}
