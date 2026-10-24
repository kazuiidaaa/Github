import { SCHOOL_TYPES, type SchoolType } from "../formDetails";
import type { RequirementRule } from "./rules";

// 在留資格「留学」の提出書類一覧表（チェックシート。入管庁が入学先の種類・適正校の区分ごとに掲載）の表。Issue #420。
// 照合表は docs/official/reconciliation/ryugaku-procedures-2026-10-24.md。資料は docs/official/ryugaku-{coe|change-acquisition|renewal}-checksheet-*.pdf。
// 列「提出の要否」の記号：○＝必須（required）／△（備考欄参照）＝備考欄の場合に必要（check。備考をそのまま note にする）／－＝提出不要（規則を作らない）。
// 列「提出確認欄 いずれか選択（有・無）」は、申請書類を提出したかを申請人が○で示す欄で、要否ではないため写さない。
// 「別表掲載国・地域」「同左以外」の2列がある表は、2列が同じなら1つの規則にし、異なる書類は要確認（verify）で、列ごとの要否を note に書く
// （別表掲載国・地域は案件の入力項目にないため、判定の軸にはしない）。
// 変更・取得は1枚の一覧が両手続を兼ねる。取得は、案内ページの「１在留資格取得許可申請書及び３申請時の在留資格に該当する活動に関する資料を除いて準用」により、活動資料を外す。

export type RyugakuProcedure = "coe" | "change" | "renewal" | "acquisition";
type SheetProcedure = "coe" | "change" | "renewal";

/**
 * 手元に提出書類一覧表（PDF）がある入学先の種類（手続ごと）。入管庁のページは、どの手続でも9区分すべての一覧表を掲載している。
 * 現在は9区分×3手続（認定・変更・取得・更新。変更と取得は同じ一覧）の27枚がそろっている。資料が無い組み合わせができたときは、
 * ここから外すと、書類を出さず「一覧表は未取得」の要確認の1行を出す（ryugakuSheetRules。仕組みは残してある）
 */
export const RYUGAKU_SHEET_TYPES: Record<RyugakuProcedure, SchoolType[]> = {
  coe: [...SCHOOL_TYPES],
  change: [...SCHOOL_TYPES],
  renewal: [...SCHOOL_TYPES],
  acquisition: [...SCHOOL_TYPES],
};

/** 書類の名前（シートの書き方のまま。表ごとに言い回しが違うものは、行で name を上書きする） */
const DOCS = {
  checklist: "提出書類一覧表（本表及び別紙「各種確認書」）",
  passport: "旅券の身分事項ページ（写し）及び追記欄に記載がある旅券については追記欄ページ（写し）",
  activity: "申請時の在留資格に該当する活動に関する資料",
  lastEdu: "最終学歴の卒業証明書",
  jaAbility: "日本語能力に係る資料",
  research: "研究内容を証する文書",
  course: "履修届けの写し又は聴講科目及び聴講時間を証する文書",
  nightUniv: "大学の管理体制を説明した文書",
  koseki: "戸籍又はこれに代わる証明書",
  lastSchool: "最終学校の卒業証明書",
  jaHistory: "日本語学習歴を証明する資料（本国政府等から認可を受けた施設で学習したもの。オンライン学習が含まれている場合はその時間数を明記したもの。）",
  exchange: "学生交換計画その他これに準ずる国際交流計画に関する資料",
  enrollment: "在学証明書",
  attendance: "出席証明書、成績証明書及び卒業証明書（直近の在留諸申請時以降に在籍した全ての教育機関に係る証明書）",
  living: "滞在費支弁に関する申告書",
  expense: "経費支弁書",
  relation: "経費支弁者と申請人の関係を立証する資料",
  deposit: "預金残高証明書(原本)",
  funds: "過去１年間の資金形成経緯を明らかにする資料",
  payerJob: "経費支弁者の職業を立証する資料",
  payerIncome: "過去１年間の経費支弁者の収入を立証する資料",
  selfTax:
    "直近の住民税の課税（又は非課税）証明書及び納税証明書（アルバイトを１年以上行っている場合）※１年間の総収入及び納税状況の両方が記載されていればアルバイトによる収入等に係る記載がある預金通帳の写し、Web通帳の画面の写し等（取引履歴が分かるもの）でも可",
  selfPayslip: "給与明細書の写し（アルバイトを行ったのが１年未満である場合）※アルバイトによる収入等に係る記載がある預金通帳の写し、Web通帳の画面の写し等（取引履歴が分かるもの）でも可",
  homeIncome: "本国での収入又は資産の額を証明する資料",
  remit: "送金証明書",
  carrier: "携行者の身分を証する資料",
  payerRelation: "経費支弁者との関係を明らかにする資料",
  payerIncomeProof: "経費支弁者の収入を証明する資料",
  guardianReason: "監護するに至った経緯、監護計画を説明する資料",
  guardianRelation: "監護人と申請人の関係を立証する資料",
  lodging: "宿泊施設の概要を明らかにする資料",
  lifeAdvisor: "生活指導担当者の在職証明書",
  specialStudent: "特待生受入れに関する資料（待遇や選抜方法等について）",
  parentConsent: "親権者の同意書（申請人が留学をすることについて親権者が同意したことを疎明する任意の様式）",
  scholarship: "奨学金の給付に関する証明書",
  support: "申請人の身の回りの世話や生活上の相談及び助言等を行う体制について教育機関が確認したことを証する資料",
  denial: "認定不交付処分又は在留不許可処分について、処分理由を払拭する説明及び資料",
} as const;
type DocKey = keyof typeof DOCS;
const DOC_ORDER = Object.keys(DOCS) as DocKey[];

/** 教育機関が作成・確認する書類（その他は申請人が用意する） */
const ORGANIZATION_DOCS: DocKey[] = ["support", "enrollment", "attendance", "lifeAdvisor"];

/**
 * 表の1行。l は提出の要否：1列の表は "o"（○）・"c"（△）、2列の表（別表掲載国・地域／同左以外）は2文字（"oo"・"cc"・"co"・"-o"・"-c"・"--" など。"-" は「－」）。
 * note は備考欄の文言（長い備考は同じ文を共有する）。name は表ごとに書類名の言い回しが違うときの上書き
 */
interface Row {
  k: DocKey;
  l: string;
  note?: string;
  name?: string;
}
const r = (k: DocKey, l: string, note?: string, name?: string): Row => ({ k, l, ...(note ? { note } : {}), ...(name ? { name } : {}) });

// ---- 備考欄の文言 ----
const N_BETSU_UNIV = "日本語別科において専ら日本語教育を受ける者について、別表掲載国・地域の出身国籍である申請人が外国の高等教育機関（大学等）を卒業し、その卒業証書等を提出する場合、「各種確認書」の提出は不要";
const N_BETSU_JP = "別表掲載国・地域の出身国籍である申請人が外国の高等教育機関（大学等）を卒業し、その卒業証書等を提出する場合、「各種確認書」の提出は不要";
const N_VOC = "専修学校又は各種学校に入学する場合は「各種確認書」の提出は不要";
const N_JA_UNIV = "日本語別科において専ら日本語教育を受ける者について、上記２の「各種確認書」で試験を選択した場合、試験の証明書を併せて提出（面接欄にも記載する場合を除く。）";
const N_JA_UNIV_NONAPP = `${N_JA_UNIV}。日本語別科において専ら日本語教育を受ける者以外の者について、高等教育機関（大学等）を卒業し、その卒業証書等を提出する場合は不要`;
// 変更・取得の表は「外国の高等教育機関（大学等）」、認定の表は「高等教育機関（大学等）」と書く（PDFの文言のまま）
const N_JA_UNIV_NONAPP_CHANGE = `${N_JA_UNIV}。日本語別科において専ら日本語教育を受ける者以外の者について、外国の高等教育機関（大学等）を卒業し、その卒業証書等を提出する場合は不要`;
const N_JA_JP = "上記２の「各種確認書」で試験を選択した場合、試験の証明書を併せて提出（面接欄にも記載する場合を除く。）";
const N_RESEARCH = "大学等において、専ら聴講によらない研究生として受け入れられる場合";
const N_COURSE = "大学等において、聴講生、科目等履修生、専ら聴講による研究生として受け入れられることが申請時に決定している場合";
const N_NIGHT = "大学の夜間において授業を行う大学院の研究科において、専ら夜間通学して教育を受ける場合";
const N_SCHOLAR = "奨学金の給付を受ける場合（詳細は奨学金の給付に関する証明書一覧のとおり）";
const N_SUPPORT = "18歳未満の申請人が単身で生活する場合（入寮等する場合を除く。）";
const N_DENIAL = "在留資格認定証明書交付申請の不交付処分、在留期間更新許可申請又は在留資格変更許可申請の不許可処分を受けたことがある場合";
const N_ACTIVITY = "例：就労資格の場合は給与明細の写し、源泉徴収票など";
// 高等学校・中学校・小学校（変更・取得）
const N_HS = "高校に入学する場合";
const N_HS_JA = "高校に入学する場合であって、かつ、教育機関において１年以上の日本語学習歴を有している場合";
const N_EXCHANGE = "学生交換計画又はこれに準ずる国際交流計画を策定している場合";
const N_HS_NO_EXCHANGE = "高校に入学する場合であって、学生交換計画又はこれに準ずる国際交流計画を策定していない場合";
const N_JUNIOR = "中学校又は小学校に入学する場合";
const N_SPECIAL = "高校に特待生として入学する場合";
const N_CONSENT = "本国法において申請人が未成年である場合。ただし、学生交換計画を策定している場合は不要。";
const N_SUPPORT_HS = "18歳未満の申請人が高校に入学し、単身で生活する場合（入寮等する場合を除く。）";
// 更新
const N_RENEW_JP_CHECK = "同じ日本語教育機関で更新する場合は「各種確認書」の提出は不要";
const N_RENEW_UNIV_CHECK = "同じ大学等で更新する場合は「各種確認書」の提出は不要（当該大学等で専ら日本語教育を受けていた場合を除く。）";
const N_RENEW_HS_CHECK = "高校に在籍している（入学する）場合又は同じ教育機関で更新する場合は「各種確認書」の提出は不要";
const N_VOC_LAST = "所属機関が大学・専修学校専門課程（専ら日本語教育を受ける者を除く。）以外の場合";
const N_RENEW_VOC_CHECK = "専修学校若しくは各種学校に入学する場合又は同じ教育機関で更新する場合（当該教育機関で専ら日本語教育を受けていた場合を除く。）は「各種確認書」の提出は不要";
const N_RENEW_VOC_JA = "同じ教育機関で更新する場合は不要（当該校で専ら日本語教育を受けていた場合を除く。）";
const N_GUIDED = "直近の在留期間更新許可申請時において、資格外活動許可に係る指導を受けている場合";
const N_GUIDED_BETSU = "別表掲載国・地域は、直近の在留期間更新許可申請時において、資格外活動許可に係る指導を受けている場合";
const N_SUPPORT_RENEW = "18歳未満の申請人が単身で生活する場合（入寮等する場合を除く。）であって、直近の在留諸申請時から変更が生じている場合";
const N_CHANGED = "直近の在留諸申請時から変更が生じている場合";
const N_SELF_WORK_GUIDED = "本邦での資格外活動許可により得た収入や報酬を滞在費支弁に充てている場合、かつ、直近の在留期間更新許可申請時において、資格外活動許可に係る指導を受けている場合";
const N_SELF_WORK_GUIDED_UNIV = "直近の在留期間更新許可申請時において、資格外活動許可に係る指導を受けている場合、かつ、本邦での資格外活動許可により得た収入や報酬を滞在費支弁に充てている場合";
const N_SELF_WORK_BETSU = "【別表掲載国・地域】本邦での資格外活動許可により得た収入や報酬を滞在費支弁に充てている場合、かつ、直近の在留期間更新許可申請時において、資格外活動許可に係る指導を受けている場合。【別表掲載国・地域以外】本邦での資格外活動許可により得た収入や報酬を滞在費支弁に充てている場合";
const N_PAYER_GUIDED = "本邦に居住するものが経費支弁者となる場合、かつ、資格外活動許可に係る指導を受けている場合";
const N_PAYER_GUIDED_UNIV = "本邦に居住するものが経費支弁者となる場合、かつ、直近の在留期間更新許可申請時において、資格外活動許可に係る指導を受けている場合";
const N_PAYER_BETSU = "【別表掲載国・地域】本邦に居住するものが経費支弁者となる場合、かつ、資格外活動許可に係る指導を受けている場合。【別表掲載国・地域以外】本邦に居住するものが経費支弁者となる場合";
const N_SCHOLAR_RENEW = "直近の在留諸申請時以降、新たに奨学金の給付を受ける場合（詳細は奨学金の給付に関する証明書一覧のとおり）";
const N_SCHOLAR_RENEW_UNIV = "直近の在留諸申請時以降、新たに奨学金の給付を受ける場合（国費留学制度によるものを除く。詳細は奨学金の給付に関する証明書一覧のとおり。）";
// 滞在費の見出し（表の区切り行）
const G_SELF = "滞在費を本人支弁とする場合";
const G_OTHER = "滞在費を他人支弁とする場合";
const withGroup = (group: string, note?: string) => (note ? `${group}。${note}` : group);

// ---- 表（手続 × 入学先の種類）。行の並びは表の番号順。申請書（番号1）は共通の規則（procedureCommonRules）が持つため入れない ----
type Sheets = Partial<Record<SchoolType, Row[]>>;

const COE: Sheets = {
  "univ-approved": [
    r("checklist", "c", N_BETSU_UNIV),
    r("passport", "o"),
    r("jaAbility", "c", N_JA_UNIV),
    r("research", "c", N_RESEARCH),
    r("course", "c", N_COURSE),
    r("nightUniv", "c", N_NIGHT),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "univ-nonapproved": [
    r("checklist", "c", N_BETSU_UNIV),
    r("passport", "o"),
    r("jaAbility", "c", N_JA_UNIV_NONAPP),
    r("research", "c", N_RESEARCH),
    r("course", "c", N_COURSE),
    r("nightUniv", "c", N_NIGHT),
    r("expense", "o"),
    r("relation", "o"),
    r("deposit", "o"),
    r("funds", "o"),
    r("payerJob", "o"),
    r("payerIncome", "o"),
    r("scholarship", "c", N_SCHOLAR),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "vocational-class1": [
    r("checklist", "c", N_VOC),
    r("passport", "o"),
    r("jaAbility", "o"),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "vocational-class2": [
    r("checklist", "cc", N_VOC),
    r("passport", "oo"),
    r("jaAbility", "oo"),
    r("expense", "-o"),
    r("deposit", "-o"),
    r("scholarship", "-c", N_SCHOLAR),
    r("support", "cc", N_SUPPORT),
    r("denial", "cc", N_DENIAL),
  ],
  "vocational-nonapproved": [
    r("checklist", "c", N_VOC),
    r("passport", "o"),
    r("lastSchool", "c", N_VOC_LAST),
    r("jaAbility", "o"),
    r("expense", "o"),
    r("relation", "o"),
    r("deposit", "o"),
    r("funds", "o"),
    r("payerJob", "o"),
    r("payerIncome", "o"),
    r("scholarship", "c", N_SCHOLAR),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "japanese-nonapproved": [
    r("checklist", "c", N_BETSU_JP),
    r("passport", "o"),
    r("lastSchool", "o"),
    r("jaAbility", "c", N_JA_JP),
    r("expense", "o"),
    r("relation", "o"),
    r("deposit", "o"),
    r("funds", "o"),
    r("payerJob", "o"),
    r("payerIncome", "o"),
    r("scholarship", "c", N_SCHOLAR),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "japanese-class1": [
    r("checklist", "c", N_BETSU_JP),
    r("passport", "o"),
    r("jaAbility", "c", N_JA_JP),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "japanese-class2": [
    r("checklist", "co", N_BETSU_JP),
    r("passport", "oo"),
    r("jaAbility", "cc", N_JA_JP),
    r("expense", "-o"),
    r("relation", "-o"),
    r("deposit", "-o"),
    r("funds", "-o"),
    r("scholarship", "-c", N_SCHOLAR),
    r("support", "cc", N_SUPPORT),
    r("denial", "cc", N_DENIAL),
  ],
  "highschool-below": [
    r("checklist", "c", "高校に入学する場合は「各種確認書」の提出は不要"),
    r("passport", "o"),
    r("koseki", "o"),
    r("lastSchool", "c", N_HS),
    r("jaHistory", "c", N_HS_JA),
    r("exchange", "c", N_EXCHANGE),
    r("expense", "o"),
    r("relation", "o"),
    r("deposit", "c", N_HS_NO_EXCHANGE),
    r("funds", "c", N_HS_NO_EXCHANGE),
    r("payerJob", "c", N_HS_NO_EXCHANGE),
    r("payerIncome", "c", N_HS_NO_EXCHANGE),
    r("guardianReason", "c", N_JUNIOR),
    r("guardianRelation", "c", N_JUNIOR),
    r("lodging", "c", N_JUNIOR),
    r("lifeAdvisor", "c", N_JUNIOR),
    r("specialStudent", "c", N_SPECIAL),
    r("parentConsent", "c", N_CONSENT),
    r("support", "c", N_SUPPORT_HS),
    r("denial", "c", N_DENIAL),
  ],
};

const CHANGE: Sheets = {
  "univ-approved": [
    r("checklist", "c", N_BETSU_UNIV),
    r("activity", "o", N_ACTIVITY),
    r("jaAbility", "c", N_JA_UNIV),
    r("research", "c", N_RESEARCH),
    r("course", "c", N_COURSE),
    r("nightUniv", "c", N_NIGHT),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "univ-nonapproved": [
    r("checklist", "c", N_BETSU_UNIV),
    r("activity", "o", N_ACTIVITY),
    r("jaAbility", "c", N_JA_UNIV_NONAPP_CHANGE),
    r("research", "c", N_RESEARCH),
    r("course", "c", N_COURSE),
    r("nightUniv", "c", N_NIGHT),
    r("expense", "o"),
    r("relation", "o"),
    r("deposit", "o"),
    r("funds", "o"),
    r("payerJob", "o"),
    r("payerIncome", "o"),
    r("scholarship", "c", N_SCHOLAR),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "vocational-class1": [
    r("checklist", "c", N_VOC),
    r("activity", "o", N_ACTIVITY),
    r("jaAbility", "o"),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "vocational-class2": [
    r("checklist", "cc", N_VOC),
    r("activity", "oo", N_ACTIVITY),
    r("jaAbility", "oo"),
    r("expense", "-o"),
    r("deposit", "-o"),
    r("scholarship", "-c", N_SCHOLAR),
    r("support", "cc", N_SUPPORT),
    r("denial", "cc", N_DENIAL),
  ],
  "vocational-nonapproved": [
    r("checklist", "c", N_VOC),
    r("activity", "o", N_ACTIVITY),
    r("lastSchool", "c", N_VOC_LAST),
    r("jaAbility", "o"),
    r("expense", "o"),
    r("relation", "o"),
    r("deposit", "o"),
    r("funds", "o"),
    r("payerJob", "o"),
    r("payerIncome", "o"),
    r("scholarship", "c", N_SCHOLAR),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "japanese-nonapproved": [
    r("checklist", "c", N_BETSU_JP),
    r("activity", "o", N_ACTIVITY),
    r("lastEdu", "o"),
    r("jaAbility", "c", N_JA_JP),
    r("expense", "o"),
    r("relation", "o"),
    r("deposit", "o"),
    r("funds", "o"),
    r("payerJob", "o"),
    r("payerIncome", "o"),
    r("scholarship", "c", N_SCHOLAR),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "japanese-class1": [
    r("checklist", "c", N_BETSU_JP),
    r("activity", "o", N_ACTIVITY),
    r("jaAbility", "c", N_JA_JP),
    r("support", "c", N_SUPPORT),
    r("denial", "c", N_DENIAL),
  ],
  "japanese-class2": [
    r("checklist", "co", N_BETSU_JP),
    r("activity", "oo", N_ACTIVITY),
    r("jaAbility", "cc", N_JA_JP),
    r("expense", "-o"),
    r("relation", "-o"),
    r("deposit", "-o"),
    r("funds", "-o"),
    r("scholarship", "-c", N_SCHOLAR),
    r("support", "cc", N_SUPPORT),
    r("denial", "cc", N_DENIAL),
  ],
  "highschool-below": [
    r("checklist", "c", "高校に入学する場合は「各種確認書」の提出は不要"),
    r("koseki", "o"),
    r("lastSchool", "c", N_HS),
    r("jaHistory", "c", N_HS_JA),
    r("exchange", "c", N_EXCHANGE),
    r("expense", "o"),
    r("relation", "o"),
    r("deposit", "c", N_HS_NO_EXCHANGE),
    r("funds", "c", N_HS_NO_EXCHANGE),
    r("payerJob", "c", N_HS_NO_EXCHANGE),
    r("payerIncome", "c", N_HS_NO_EXCHANGE),
    r("guardianReason", "c", N_JUNIOR),
    r("guardianRelation", "c", N_JUNIOR),
    r("lodging", "c", N_JUNIOR),
    r("lifeAdvisor", "c", N_JUNIOR),
    r("specialStudent", "c", N_SPECIAL),
    r("parentConsent", "c", N_CONSENT),
    r("support", "c", N_SUPPORT_HS),
    r("denial", "c", N_DENIAL),
  ],
};

const RENEWAL_JP_NAME_ENROLL = "在学証明書（進学予定の場合は入学許可書）";
/** 日本語教育機関（通知を受けていない・クラスⅡ）の更新。別表掲載国・地域／同左以外の2列。2枚の表の行は同じ */
const RENEWAL_JP_TWO_COLUMNS: Row[] = [
  r("checklist", "cc", N_RENEW_JP_CHECK),
  r("enrollment", "oo", undefined, RENEWAL_JP_NAME_ENROLL),
  r("attendance", "oo"),
  r("living", "co", N_GUIDED_BETSU),
  r("support", "cc", N_SUPPORT_RENEW),
  r("selfTax", "cc", withGroup(G_SELF, N_SELF_WORK_BETSU)),
  r("selfPayslip", "cc", withGroup(G_SELF, N_SELF_WORK_BETSU)),
  r("homeIncome", "co", withGroup(G_SELF, N_GUIDED_BETSU)),
  r("remit", "co", withGroup(G_OTHER, N_GUIDED_BETSU)),
  r("carrier", "co", withGroup(G_OTHER, N_GUIDED_BETSU)),
  r("payerRelation", "cc", withGroup(G_OTHER, N_CHANGED)),
  r("payerIncomeProof", "cc", withGroup(G_OTHER, N_PAYER_BETSU)),
  r("scholarship", "cc", N_SCHOLAR_RENEW),
];

const RENEWAL_VOC_NAME_ATT = "出席証明書（発行可能な場合）、成績証明書及び卒業証明書（直近の在留諸申請時以降に在籍した全ての教育機関に係る証明書）";
/** 専修学校等（クラスⅡ・通知を受けていない）の更新。別表掲載国・地域／同左以外の2列。本国での収入・送金証明書・携行者の列の要否だけが2表で違う */
const renewalVocTwoColumns = (guided: "cc" | "co"): Row[] => [
  r("checklist", "cc", N_RENEW_VOC_CHECK),
  r("enrollment", "oo", undefined, RENEWAL_JP_NAME_ENROLL),
  r("attendance", "oo", undefined, RENEWAL_VOC_NAME_ATT),
  r("jaAbility", "cc", N_RENEW_VOC_JA),
  r("living", "co", N_GUIDED_BETSU),
  r("support", "cc", N_SUPPORT_RENEW),
  r("selfTax", "cc", withGroup(G_SELF, N_SELF_WORK_BETSU)),
  r("selfPayslip", "cc", withGroup(G_SELF, N_SELF_WORK_BETSU)),
  r("homeIncome", guided, withGroup(G_SELF, guided === "co" ? N_GUIDED_BETSU : N_GUIDED)),
  r("remit", guided, withGroup(G_OTHER, guided === "co" ? N_GUIDED_BETSU : N_GUIDED)),
  r("carrier", guided, withGroup(G_OTHER, guided === "co" ? N_GUIDED_BETSU : N_GUIDED)),
  r("payerRelation", "cc", withGroup(G_OTHER, N_CHANGED)),
  r("payerIncomeProof", "cc", withGroup(G_OTHER, N_PAYER_BETSU)),
  r("scholarship", "cc", N_SCHOLAR_RENEW_UNIV),
];

const RENEWAL: Sheets = {
  "univ-approved": [
    r("checklist", "c", N_RENEW_UNIV_CHECK),
    r("attendance", "o", undefined, "出席証明書(発行可能な場合)、成績証明書及び卒業証明書（直近の在留諸申請時以降に在籍した全ての教育機関に係る証明書）"),
    r("research", "c", N_RESEARCH),
    r("course", "c", N_COURSE),
    r("nightUniv", "c", N_NIGHT),
    r("enrollment", "o", undefined, "在学証明書（入学前に申請する場合は入学許可書）"),
    r("living", "c", N_GUIDED),
    r("support", "c", N_SUPPORT_RENEW),
    r("selfTax", "c", withGroup(G_SELF, N_SELF_WORK_GUIDED_UNIV)),
    r("selfPayslip", "c", withGroup(G_SELF, N_SELF_WORK_GUIDED_UNIV)),
    r("homeIncome", "c", withGroup(G_SELF, N_GUIDED)),
    r("remit", "c", withGroup(G_OTHER, N_GUIDED)),
    r("carrier", "c", withGroup(G_OTHER, N_GUIDED)),
    r("payerRelation", "c", withGroup(G_OTHER, N_CHANGED)),
    r("payerIncomeProof", "c", withGroup(G_OTHER, N_PAYER_GUIDED_UNIV)),
    r("scholarship", "c", N_SCHOLAR_RENEW_UNIV),
  ],
  "univ-nonapproved": [
    r("checklist", "cc", N_RENEW_UNIV_CHECK),
    r("attendance", "oo", undefined, "出席証明書(発行可能な場合)、成績証明書及び卒業証明書（直近の在留諸申請時以降に在籍した全ての教育機関に係る証明書）"),
    r("research", "cc", N_RESEARCH),
    r("course", "cc", N_COURSE),
    r("nightUniv", "cc", N_NIGHT),
    r("enrollment", "oo", undefined, "在学証明書（入学前に申請する場合は入学許可書）"),
    r("living", "co", N_GUIDED_BETSU),
    r("support", "cc", N_SUPPORT_RENEW),
    r("selfTax", "cc", withGroup(G_SELF, N_SELF_WORK_BETSU)),
    r("selfPayslip", "cc", withGroup(G_SELF, N_SELF_WORK_BETSU)),
    r("homeIncome", "co", withGroup(G_SELF, N_GUIDED_BETSU)),
    r("remit", "co", withGroup(G_OTHER, N_GUIDED_BETSU)),
    r("carrier", "co", withGroup(G_OTHER, N_GUIDED_BETSU)),
    r("payerRelation", "cc", withGroup(G_OTHER, N_CHANGED)),
    r("payerIncomeProof", "cc", withGroup(G_OTHER, N_PAYER_BETSU)),
    r("scholarship", "cc", N_SCHOLAR_RENEW_UNIV),
  ],
  "vocational-class1": [
    r("checklist", "c", N_RENEW_VOC_CHECK),
    r("enrollment", "o", undefined, RENEWAL_JP_NAME_ENROLL),
    r("attendance", "o", undefined, RENEWAL_VOC_NAME_ATT),
    r("jaAbility", "c", N_RENEW_VOC_JA),
    r("living", "c", N_GUIDED),
    r("support", "c", N_SUPPORT_RENEW),
    r("selfTax", "c", withGroup(G_SELF, N_SELF_WORK_GUIDED_UNIV)),
    r("selfPayslip", "c", withGroup(G_SELF, N_SELF_WORK_GUIDED_UNIV)),
    r("homeIncome", "c", withGroup(G_SELF, N_GUIDED)),
    r("remit", "c", withGroup(G_OTHER, N_GUIDED)),
    r("carrier", "c", withGroup(G_OTHER, N_GUIDED)),
    r("payerRelation", "c", withGroup(G_OTHER, N_CHANGED)),
    r("payerIncomeProof", "c", withGroup(G_OTHER, N_PAYER_GUIDED)),
    r("scholarship", "c", N_SCHOLAR_RENEW_UNIV),
  ],
  "vocational-class2": renewalVocTwoColumns("cc"),
  "vocational-nonapproved": renewalVocTwoColumns("co"),
  "japanese-nonapproved": RENEWAL_JP_TWO_COLUMNS,
  "japanese-class1": [
    r("checklist", "c", N_RENEW_JP_CHECK),
    r("enrollment", "o", undefined, RENEWAL_JP_NAME_ENROLL),
    r("attendance", "o"),
    r("living", "c", N_GUIDED),
    r("support", "c", N_SUPPORT_RENEW),
    r("selfTax", "c", withGroup(G_SELF, N_SELF_WORK_GUIDED)),
    r("selfPayslip", "c", withGroup(G_SELF, N_SELF_WORK_GUIDED)),
    r("homeIncome", "c", withGroup(G_SELF, N_GUIDED)),
    r("remit", "c", withGroup(G_OTHER, N_GUIDED)),
    r("carrier", "c", withGroup(G_OTHER, N_GUIDED)),
    r("payerRelation", "c", withGroup(G_OTHER, N_CHANGED)),
    r("payerIncomeProof", "c", withGroup(G_OTHER, N_PAYER_GUIDED)),
    r("scholarship", "c", N_SCHOLAR_RENEW),
  ],
  "japanese-class2": RENEWAL_JP_TWO_COLUMNS,
  "highschool-below": [
    r("checklist", "c", N_RENEW_HS_CHECK),
    r("attendance", "o", undefined, "出席証明書及び成績証明書（直近の在留諸申請時以降に在籍した全ての教育機関に係る証明書）"),
    r("enrollment", "o", undefined, "在学証明書（在学前に申請する場合は入学許可書）"),
    r("expense", "c", N_CHANGED),
    r("relation", "c", N_CHANGED),
    r("deposit", "c", N_CHANGED),
    r("payerJob", "c", N_CHANGED),
    r("payerIncome", "c", N_CHANGED),
    r("guardianReason", "c", N_CHANGED),
    r("guardianRelation", "c", N_CHANGED),
    r("lodging", "c", N_CHANGED),
    r("lifeAdvisor", "c", N_CHANGED),
    r("support", "c", `${N_SUPPORT_HS}であって、直近の在留諸申請時から変更が生じている場合`),
  ],
};

const SHEETS: Record<SheetProcedure, Sheets> = { coe: COE, change: CHANGE, renewal: RENEWAL };

const LEVEL_MARK: Record<string, string> = { o: "○", c: "△（備考欄参照）", "-": "－" };

/** 1つの行を、規則の level・note・verify に直す。"-" だけ（全列で不要）は null */
function resolveRow(row: Row): { level: RequirementRule["level"]; note?: string; verify?: boolean } | null {
  const codes = row.l.split("");
  if (codes.every((c) => c === "-")) return null;
  const same = codes.every((c) => c === codes[0]);
  const level = codes.includes("o") && same ? "required" : "check";
  if (same) return { level, ...(row.note ? { note: row.note } : {}) };
  // 列で要否が異なる行：要確認にして、列ごとの要否を注記に書く
  const [listed, other] = codes;
  const prefix = `要否は列で異なる（別表掲載国・地域＝${LEVEL_MARK[listed]}、同左以外＝${LEVEL_MARK[other]}）`;
  return { level: "check", note: row.note ? `${prefix}。${row.note}` : prefix, verify: true };
}

/**
 * 手続の提出書類一覧表から、入学先の種類ごとの規則を作る。同じ書類・要否・備考の表は1つの規則にまとめ、schoolTypes に入学先の種類を並べる。
 * 取得は変更・取得の表を使い、案内ページの定めにより活動資料（申請時の在留資格に該当する活動に関する資料）を外す。
 * 規則の並びは、書類の標準の並び（DOCS）順。同じ書類で内容が違う表は、同じ並びの隣に置く。
 */
export function ryugakuSheetRules(procedure: RyugakuProcedure): RequirementRule[] {
  const sheets = SHEETS[procedure === "acquisition" ? "change" : procedure];
  const types = RYUGAKU_SHEET_TYPES[procedure];
  const groups = new Map<string, { k: DocKey; name: string; level: RequirementRule["level"]; note?: string; verify?: boolean; schoolTypes: SchoolType[] }>();
  for (const type of types) {
    for (const row of sheets[type] ?? []) {
      if (procedure === "acquisition" && row.k === "activity") continue;
      const resolved = resolveRow(row);
      if (!resolved) continue;
      const name = row.name ?? DOCS[row.k];
      const key = [row.k, name, resolved.level, resolved.note ?? "", resolved.verify ? "v" : ""].join("\u0000");
      const found = groups.get(key);
      if (found) found.schoolTypes.push(type);
      else groups.set(key, { k: row.k, name, ...resolved, schoolTypes: [type] });
    }
  }
  const missing = SCHOOL_TYPES.filter((t) => !types.includes(t));
  const sorted = [...groups.values()].sort((a, b) => DOC_ORDER.indexOf(a.k) - DOC_ORDER.indexOf(b.k));
  const seen = new Map<DocKey, number>();
  const rules: RequirementRule[] = sorted.map((g) => {
    const n = (seen.get(g.k) ?? 0) + 1;
    seen.set(g.k, n);
    return {
      id: n === 1 ? `ryugaku_${g.k}` : `ryugaku_${g.k}_${n}`,
      name: g.name,
      party: ORGANIZATION_DOCS.includes(g.k) ? "organization" : "applicant",
      schoolTypes: g.schoolTypes,
      level: g.level,
      ...(g.note ? { note: g.note } : {}),
      ...(g.verify ? { verify: true } : {}),
    };
  });
  // 手元に一覧表が無い入学先の種類（現在はなし）。この行を再び使うときは、lib/i18n/ruleTexts.ts に、名前と注記の訳を足す（以前の訳は履歴の ryugaku_sheet_not_obtained の行）。
  // 手元に一覧表が無い入学先の種類。ページには掲載があるため「掲載なし」とはせず、未取得として要確認の1行を出す
  if (missing.length > 0) rules.unshift({
    id: "ryugaku_sheet_not_obtained",
    name: "入学先の種類に応じた提出書類一覧表に掲げる資料（この入学先の一覧表は未取得）",
    party: "applicant",
    schoolTypes: missing,
    level: "check",
    note: "入管庁の留学のページには、この入学先の種類の提出書類一覧表が掲載されているが、この一覧表（PDF）は未入手のため、書類の名前は出していない。入管庁のページで一覧表を確認すること（行政書士が確認）",
    verify: true,
  });
  return rules;
}
