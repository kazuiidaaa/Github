import type { Lang } from "@/lib/documents/lang";

/**
 * 公式様式の項目名・見出し・様式名（lib/formDetails.ts の FORM_LAYOUTS）の、画面用の訳表。
 * FORM_LAYOUTS の日本語は、書類の出力（転記補助シート・様式への差し込み）が使うため、変更しない。
 * 項目名の先頭の番号（例：「5 」「10 (1) 」「3 (2) 」）は、公式様式の項番のため、そのまま残し、番号の後ろの名称のみを訳す。
 * キーは、番号を除いた日本語の名称（または番号のない名称）。訳がなければ日本語の原文を表示する。
 * 訳文は、行政書士の確認前の下書き（確認の状態は reviewStatus.ts の caseForm）。
 * 全項目の名称に訳があることは、試験（tests/formLabels.test.ts）で確認する。
 */
type Translated = readonly [en: string, ko: string];

export const FORM_LABEL_TRANSLATIONS: Record<string, Translated> = {
  // 様式名
  "在留期間更新許可申請書": ["Application for Permission for Extension of the Period of Stay", "체류기간 연장 허가 신청서"],
  "在留資格変更許可申請書": ["Application for Permission for Change of Status of Residence", "체류자격 변경 허가 신청서"],
  "在留資格認定証明書交付申請書": ["Application for Certificate of Eligibility", "사증발급인정서 교부 신청서"],
  "在留資格取得許可申請書": ["Application for Permission for Acquisition of Status of Residence", "체류자격 취득 허가 신청서"],

  // 見出し
  "申請人等作成用1（項番5〜15）": ["For the applicant, etc. (1) (items 5 to 15)", "신청인 등 작성용 1(항번 5~15)"],
  "申請人等作成用1（項番5〜20）": ["For the applicant, etc. (1) (items 5 to 20)", "신청인 등 작성용 1(항번 5~20)"],
  "申請人等作成用2（N）（項番17〜22）": ["For the applicant, etc. (2) (N) (items 17 to 22)", "신청인 등 작성용 2(N)(항번 17~22)"],
  "申請人等作成用2（N）（項番22〜27）": ["For the applicant, etc. (2) (N) (items 22 to 27)", "신청인 등 작성용 2(N)(항번 22~27)"],
  "申請人等作成用（項番5〜14）": ["For the applicant, etc. (items 5 to 14)", "신청인 등 작성용(항번 5~14)"],
  "申請人等作成用（項番16・17、取次者）": ["For the applicant, etc. (items 16 and 17, application agent)", "신청인 등 작성용(항번 16·17, 신청 대행자)"],
  "所属機関等作成用1・2（N）": ["For the affiliated organization, etc. (1) and (2) (N)", "소속기관 등 작성용 1·2(N)"],
  "在日親族及び同居者": ["Relatives and cohabitants in Japan", "재일 친족 및 동거인"],
  "在日親族（父・母・配偶者・子・兄弟姉妹・祖父母・叔(伯)父・叔(伯)母など）及び同居者": [
    "Relatives in Japan (father, mother, spouse, children, siblings, grandparents, uncles and aunts, etc.) and cohabitants",
    "재일 친족(부·모·배우자·자녀·형제자매·조부모·숙(백)부·숙(백)모 등) 및 동거인",
  ],
  "職歴（外国におけるものを含む）": ["Employment history (including overseas)", "경력(외국에서의 것을 포함)"],

  // 項目名
  "取次者 氏名": ["Application agent: name", "신청 대행자 성명"],
  "取次者 住所": ["Application agent: address", "신청 대행자 주소"],
  "取次者 所属機関等": ["Application agent: affiliated organization, etc.", "신청 대행자 소속기관 등"],
  "取次者 電話番号": ["Application agent: telephone number", "신청 대행자 전화번호"],
  "法人番号（13桁）": ["Corporate number (13 digits)", "법인번호(13자리)"],
  "雇用保険適用事業所番号（11桁）": ["Employment insurance business office number (11 digits)", "고용보험 적용 사업소 번호(11자리)"],
  "電話番号": ["Telephone number", "전화번호"],
  "年間売上高（直近年度）": ["Annual sales (most recent fiscal year)", "연간 매출액(최근 연도)"],
  "外国人職員数": ["Number of foreign employees", "외국인 직원 수"],
  "旅券番号": ["Passport number", "여권 번호"],
  "旅券の有効期限": ["Passport expiry date", "여권 유효기간"],
  "現に有する在留期間": ["Current period of stay", "현재 보유한 체류기간"],
  "希望する在留期間": ["Desired period of stay", "희망하는 체류기간"],
  "犯罪を理由とする処分を受けたことの有無": ["Whether subject to a disposition for a criminal offense", "범죄를 이유로 한 처분을 받은 적의 유무"],
  "具体的内容": ["Details", "구체적 내용"],
  "勤務先 支店・事業所名": ["Workplace: branch / office name", "근무처 지점·사업소명"],
  "勤務先 電話番号": ["Workplace: telephone number", "근무처 전화번호"],
  "最終学歴の所在": ["Location of the final education", "최종 학력의 소재"],
  "学歴の区分": ["Level of education", "학력 구분"],
  "学校名": ["School name", "학교명"],
  "卒業年月日": ["Date of graduation", "졸업 연월일"],
  "専攻・専門分野": ["Major / field of specialization", "전공·전문 분야"],
  "情報処理技術者資格又は試験合格": ["Information processing engineer qualification or examination passed", "정보처리기술자 자격 또는 시험 합격"],
  "代理人 氏名（法定代理人による申請の場合）": ["Representative: name (when applying through a legal representative)", "대리인 성명(법정대리인에 의한 신청의 경우)"],
  "本人との関係": ["Relationship to the applicant", "본인과의 관계"],
  "代理人 住所": ["Representative: address", "대리인 주소"],
  "代理人 電話番号": ["Representative: telephone number", "대리인 전화번호"],
  "実務経験年数": ["Years of practical experience", "실무 경험 연수"],
  "職務上の地位（役職名）": ["Position (job title)", "직무상의 지위(직책명)"],
  "職種（別紙「職種一覧」の番号）": ["Occupation (number in the attached \"List of Occupations\")", "직종(별지 '직종 일람'의 번호)"],
  "派遣先等 (1) 名称": ["Dispatch destination, etc. (1) Name", "파견처 등 (1) 명칭"],
  "法人番号": ["Corporate number", "법인번호"],
  "支店・事業所名": ["Branch / office name", "지점·사업소명"],
  "雇用保険適用事業所番号": ["Employment insurance business office number", "고용보험 적용 사업소 번호"],
  "所在地": ["Address", "소재지"],
  "資本金": ["Capital", "자본금"],
  "年間売上高": ["Annual sales", "연간 매출액"],
  "派遣予定期間": ["Planned period of dispatch", "파견 예정 기간"],
  "配偶者の有無": ["Marital status (spouse)", "배우자 유무"],
  "職業": ["Occupation", "직업"],
  "本国における居住地": ["Residence in the home country", "본국에서의 거주지"],
  "携帯電話番号": ["Mobile phone number", "휴대전화 번호"],
  "更新の理由": ["Reason for extension", "연장 사유"],
  "出生地": ["Place of birth", "출생지"],
  "電話番号（住居地の欄）": ["Telephone number (in the residence field)", "전화번호(주거지란)"],
  "携帯電話番号（住居地の欄）": ["Mobile phone number (in the residence field)", "휴대전화 번호(주거지란)"],
  "変更の理由": ["Reason for change", "변경 사유"],
  "日本における連絡先": ["Contact in Japan", "일본에서의 연락처"],
  "電話番号（連絡先の欄）": ["Telephone number (in the contact field)", "전화번호(연락처란)"],
  "携帯電話番号（連絡先の欄）": ["Mobile phone number (in the contact field)", "휴대전화 번호(연락처란)"],
  "入国予定年月日": ["Planned date of entry", "입국 예정 연월일"],
  "上陸予定港": ["Planned port of entry", "상륙 예정 항"],
  "滞在予定期間": ["Planned period of stay", "체류 예정 기간"],
  "同伴者の有無": ["Accompanying persons", "동반자 유무"],
  "査証申請予定地": ["Place where the visa will be applied for", "사증 신청 예정지"],
  "過去の出入国歴": ["Past entry/departure history", "과거 출입국 이력"],
  "回数": ["Number of times", "횟수"],
  "直近の出入国歴（入国年月日）": ["Most recent entry/departure (date of entry)", "최근 출입국 이력(입국 연월일)"],
  "直近の出入国歴（出国年月日）": ["Most recent entry/departure (date of departure)", "최근 출입국 이력(출국 연월일)"],
  "過去の在留資格認定証明書交付申請歴": ["Past applications for a certificate of eligibility", "과거 사증발급인정서 교부 신청 이력"],
  "うち不交付となった回数": ["Of which, number of times not issued", "그중 불교부가 된 횟수"],
  "退去強制又は出国命令による出国の有無": ["Departure by deportation or departure order", "강제퇴거 또는 출국명령에 의한 출국의 유무"],
  "直近の送還歴（年月日）": ["Most recent repatriation (date)", "최근 송환 이력(연월일)"],
  "申請人、法定代理人、法第7条の2第2項に規定する代理人 (1) 氏名": [
    "Applicant, legal representative, or representative under Article 7-2, paragraph 2 of the Act (1) Name",
    "신청인, 법정대리인, 법 제7조의2 제2항에 규정하는 대리인 (1) 성명",
  ],
  "住所": ["Address", "주소"],
  "在留資格取得の事由": ["Cause of acquisition of status of residence", "체류자격 취득의 사유"],
  "その他の内容": ["Details of \"other\"", "기타의 내용"],
  "在留の理由": ["Reason for staying", "체류 사유"],
  "在留期間（希望する在留資格に対する期間）": ["Period of stay (for the desired status of residence)", "체류기간(희망하는 체류자격에 대한 기간)"],
  "在日身元保証人又は連絡先 氏名": ["Guarantor or contact in Japan: name", "재일 신원보증인 또는 연락처 성명"],
  "希望する在留資格": ["Desired status of residence", "희망하는 체류자격"],
  "変更後の在留資格": ["Status of residence after the change", "변경 후의 체류자격"],
  "入国目的": ["Purpose of entry", "입국 목적"],
  "同居予定の有無": ["Planned cohabitation", "동거 예정 여부"],
};

const NUMBER_PREFIX = /^(\d+(?: \([^)]+\))?)\s+([\s\S]*)$/;

/**
 * 様式の項目名・見出し・様式名の、画面用の訳。番号は、そのまま残す。日本語・訳がない場合は、日本語の原文
 * 例：formLabelText("en", "5 出生地") → "5 Place of birth"
 */
export function formLabelText(lang: Lang, label: string): string {
  if (lang === "ja") return label;
  const idx = lang === "en" ? 0 : 1;
  const whole = FORM_LABEL_TRANSLATIONS[label];
  if (whole) return whole[idx];
  const m = NUMBER_PREFIX.exec(label);
  if (m) {
    const rest = FORM_LABEL_TRANSLATIONS[m[2]];
    if (rest) return `${m[1]} ${rest[idx]}`;
  }
  return label;
}
