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
  "規格を満たした、申請前6か月以内に正面から撮影された無帽・無背景で鮮明なもの": [
    "A clear photo meeting the specifications, taken from the front within 6 months before the application, without a hat and with a plain background",
    "규격을 충족하며 신청 전 6개월 이내에 정면에서 촬영한, 모자와 배경이 없는 선명한 것",
  ],
  "直近1年分の総所得及び納税状況が記載されたもの": [
    "One showing the total income and tax payment status for the most recent year",
    "최근 1년분의 총소득 및 납세 상황이 기재된 것",
  ],
  "カテゴリーを証明する文書として提出する": ["Submitted as the document proving the category", "카테고리를 증명하는 문서로 제출한다"],
  "納期の特例の承認を受けている場合": ["If the special payment deadline has been approved", "납기 특례의 승인을 받은 경우"],
  "提出の要否を、出入国在留管理局の案内で確認すること": [
    "Check whether submission is required in the guidance of the Immigration Services Agency",
    "제출 필요 여부를 출입국재류관리국의 안내로 확인할 것",
  ],
  "2026年4月15日以降の申請で提出する": ["Submit for applications made on or after April 15, 2026", "2026년 4월 15일 이후의 신청에서 제출한다"],
  "言語能力を用いた対人業務に従事する場合。更新では、以前から同様の業務に継続して従事している場合は不要（審査で求められる場合あり）": [
    "If engaged in interpersonal work that uses language ability. For renewals, not required if the applicant has continued the same kind of work (may be requested during examination)",
    "언어 능력을 활용한 대인 업무에 종사하는 경우. 연장에서는 이전부터 같은 업무에 계속 종사하고 있는 경우 불필요(심사에서 요구될 수 있음)",
  ],
  "派遣形態で就労する場合のみ。公式案内で資料の範囲を確認すること": [
    "Only if working as a dispatched worker. Check the scope of the materials in the official guidance",
    "파견 형태로 근무하는 경우에만. 자료의 범위는 공식 안내로 확인할 것",
  ],
  "公式案内に列挙された文書のうち、提出可能なものを提出する。提出可能な文書がなければカテゴリー4となる": [
    "Submit whichever of the documents listed in the official guidance can be submitted. If none can be submitted, the organization falls under Category 4",
    "공식 안내에 열거된 문서 중 제출 가능한 것을 제출한다. 제출 가능한 문서가 없으면 카테고리 4가 된다",
  ],
  "カテゴリー2と同様の添付資料での申請を希望し、利用申出が承認された機関の場合のみ": [
    "Only for an organization that wishes to apply with the same attachments as Category 2 and whose application for use has been approved",
    "카테고리 2와 같은 첨부 자료로 신청하기를 희망하며 이용 신청이 승인된 기관의 경우에만",
  ],
  "「留学」からの変更で、カテゴリー2（大学・短大・大学院の卒業（予定）者等）として扱う場合": [
    "For a change from \"Student\", when treated as Category 2 (graduates or expected graduates of universities, junior colleges, graduate schools, etc.)",
    "'유학'에서의 변경으로 카테고리 2(대학·단기대학·대학원 졸업(예정)자 등)로 취급하는 경우",
  ],
  "専門学校を卒業した場合のみ。外国人留学生キャリア形成促進プログラムの認定学科修了者は認定学科修了証明書": [
    "Only for graduates of a vocational school. For those who completed a department certified under the Career Development Promotion Program for International Students, the certificate of completion of the certified department",
    "전문학교를 졸업한 경우에만. 외국인 유학생 경력 형성 촉진 프로그램의 인정 학과 수료자는 인정 학과 수료 증명서",
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
  "公式ページの本文にはカテゴリー3は「その他の資料は原則不要」との記載があり、チェックシートと食い違う。チェックシートに従いカテゴリー3も必要としている": [
    "The body text of the official page says that for Category 3 \"other materials are generally not required\", which differs from the checklist. Following the checklist, Category 3 is also treated as requiring it",
    "공식 페이지 본문에는 카테고리 3은 '기타 자료는 원칙적으로 불필요'라고 기재되어 있어 체크시트와 다르다. 체크시트에 따라 카테고리 3도 필요로 하고 있다",
  ],
  "主に言語能力を用いて対人業務等に従事する場合（翻訳・通訳、接客等）": [
    "If mainly engaged in interpersonal work using language ability (translation, interpreting, customer service, etc.)",
    "주로 언어 능력을 활용하여 대인 업무 등에 종사하는 경우(번역·통역, 접객 등)",
  ],
  "源泉徴収の免除を受ける外国法人等の場合は、免除証明書その他の源泉徴収を要しないことを明らかにする資料": [
    "For a foreign corporation etc. exempt from withholding, an exemption certificate or other material showing that withholding is not required",
    "원천징수를 면제받는 외국 법인 등의 경우에는 면제 증명서 기타 원천징수가 필요하지 않음을 밝히는 자료",
  ],
  "この書類、又は納期の特例の承認を受けていることを明らかにする資料のいずれか": [
    "Either this document or material showing that the special payment deadline has been approved",
    "이 서류 또는 납기 특례의 승인을 받았음을 밝히는 자료 중 하나",
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
  "専門学校を卒業した場合のみ": ["Only for graduates of a vocational school", "전문학교를 졸업한 경우에만"],
  "申請人が被派遣者の場合のみ。公式案内で資料の範囲を確認すること": [
    "Only if the applicant is a dispatched worker. Check the scope of the materials in the official guidance",
    "신청인이 피파견자인 경우에만. 자료의 범위는 공식 안내로 확인할 것",
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
  "翻訳・通訳、接客等、言語能力を用いた対人業務に主に従事する場合。それ以外でも審査で求められる場合がある": [
    "If mainly engaged in interpersonal work using language ability, such as translation, interpreting or customer service. It may also be requested during examination in other cases",
    "번역·통역, 접객 등 언어 능력을 활용한 대인 업무에 주로 종사하는 경우. 그 외의 경우에도 심사에서 요구될 수 있다",
  ],
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
  "認定証明書上の氏名と旅券上の氏名の表記が異なる場合に、提出が可能であれば併せて提出する。認定申請では旅券・在留カードの提示は不要": [
    "If the name on the certificate of eligibility differs from the name on the passport, submit it together if possible. Presenting the passport and residence card is not required for a certificate of eligibility application",
    "사증발급인정서상의 성명과 여권상의 성명 표기가 다른 경우, 제출이 가능하면 함께 제출한다. 인정 신청에서는 여권·재류카드의 제시는 불필요",
  ],
  "更新の一覧が未提供のため、公開情報に基づく暫定の内容": [
    "Provisional content based on public information, because the list for renewals has not been provided",
    "연장 목록이 제공되지 않았으므로 공개 정보에 근거한 잠정 내용",
  ],
  "申請人が事業の管理に従事する場合のみ": ["Only if the applicant is engaged in business management", "신청인이 사업 관리에 종사하는 경우에만"],
  "カテゴリー1：四季報の写し等／カテゴリー2：前年分の職員の給与所得の源泉徴収票等の法定調書合計表（写し）。提出可能な書類がなければカテゴリー4となる": [
    "Category 1: a copy of the Japan Company Handbook, etc. / Category 2: a copy of the summary table of statutory reports, such as the withholding tax slips for employees' salaries of the previous year. If no document can be submitted, the organization falls under Category 4",
    "카테고리 1: 『회사사계보』 사본 등／카테고리 2: 전년도 직원 급여소득 원천징수영수증 등의 법정조서합계표(사본). 제출 가능한 서류가 없으면 카테고리 4가 된다",
  ],
  "変更の一覧が未提供のため、認定証明書交付申請の一覧に準じた暫定の内容": [
    "Provisional content following the list for certificate of eligibility applications, because the list for changes has not been provided",
    "변경 목록이 제공되지 않았으므로 사증발급인정서 교부 신청 목록에 준한 잠정 내용",
  ],
  "申請人が事業の管理に従事する場合のみ（提供された一覧で△）": [
    "Only if the applicant is engaged in business management (marked △ in the provided list)",
    "신청인이 사업 관리에 종사하는 경우에만(제공된 목록에서 △)",
  ],
  "カテゴリー4のみ": ["Category 4 only", "카테고리 4만"],
  "事業内容を明らかにする資料として登記事項証明書を提出済みの場合は不要": [
    "Not required if a certificate of registered matters has already been submitted as material showing the business content",
    "사업 내용을 밝히는 자료로 등기사항증명서를 이미 제출한 경우에는 불필요",
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
  "ポイント制の案内では、1号は70点以上、2号は別途要件がある。取得でポイント計算表が必要かは、入管庁の案内で確認できていないため要確認": [
    "According to the points-based system guidance, Type 1 requires 70 points or more and Type 2 has separate requirements. Whether the points calculation table is required for acquisition has not been confirmed in the Immigration Services Agency guidance, so confirmation is needed",
    "포인트제 안내에 따르면 1호는 70점 이상, 2호는 별도 요건이 있다. 취득에서 포인트 계산표가 필요한지는 출입국재류관리청 안내로 확인하지 못했으므로 확인 필요",
  ],
  "ポイント計算表を提出する場合の疎明資料。提出の要否は、入管庁の案内で確認できていないため要確認。ポイント計算表の項目を選ぶと、その疎明資料の番号（①〜㉑）ごとの項目が、この下に出る（docs/hsp-point-evidence.md）": [
    "Supporting materials for the points calculation table, if submitted. Whether submission is required has not been confirmed in the Immigration Services Agency guidance, so confirmation is needed. When you select items in the points calculation table, entries for each supporting material number (① to ㉑) appear below (docs/hsp-point-evidence.md)",
    "포인트 계산표를 제출하는 경우의 소명 자료. 제출 필요 여부는 출입국재류관리청 안내로 확인하지 못했으므로 확인 필요. 포인트 계산표의 항목을 선택하면 그 소명 자료 번호(①~㉑)별 항목이 이 아래에 표시된다(docs/hsp-point-evidence.md)",
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
