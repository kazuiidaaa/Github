import { defineMessages } from "../define";

/**
 * iPhone 版の新規案件登録（/m/cases/new）の文言。
 * 誤りの文・完了の通知・手続の説明などは、PC 版と共通のため caseNew 区分を使う。ここには iPhone 版だけの見出し・案内を置く。
 */
export const mobileNew = defineMessages({
  ja: {
    title: "新規案件",
    sectionMode: "登録方法",
    sectionProcedure: "手続",
    sectionStatus: "在留資格",
    sectionCase: "案件",
    sectionNames: "申請人（案件名）",
    sectionOptional: "任意",
    select: "選択してください",
    gradeLegend: "高度専門職の号",
    gradeNone: "号を選ばない",
    bulkEmploymentNote: "雇用・会社情報は、作成後に各案件の画面で入力します。",
    leaveAria: "入力を破棄して案件一覧へ戻る",
  },
  en: {
    title: "New case",
    sectionMode: "How to register",
    sectionProcedure: "Procedure",
    sectionStatus: "Residence status",
    sectionCase: "Case",
    sectionNames: "Applicants (case names)",
    sectionOptional: "Optional",
    select: "Select",
    gradeLegend: "Highly Skilled Professional category",
    gradeNone: "No category",
    bulkEmploymentNote: "Employment and company details can be entered on each case after it is created.",
    leaveAria: "Discard input and return to the case list",
  },
  ko: {
    title: "새 사건",
    sectionMode: "등록 방법",
    sectionProcedure: "절차",
    sectionStatus: "체류자격",
    sectionCase: "사건",
    sectionNames: "신청인(사건명)",
    sectionOptional: "선택",
    select: "선택해 주세요",
    gradeLegend: "고도전문직 구분",
    gradeNone: "구분 선택 안 함",
    bulkEmploymentNote: "고용·회사 정보는 사건을 만든 뒤 각 사건 화면에서 입력합니다.",
    leaveAria: "입력을 버리고 사건 목록으로 돌아가기",
  },
});
