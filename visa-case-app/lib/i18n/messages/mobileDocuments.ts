import { defineMessages } from "../define";

/**
 * iPhone 版の書類（/m/cases/[id]/documents）の文言。
 * 書類の種類・状態・データ状態・生成の結果などは PC 版と共通のため documents 区分を使う。ここには iPhone 版だけの見出し・案内を置く。
 */
export const mobileDocuments = defineMessages({
  ja: {
    title: "書類",
    entry: "書類の作成と履歴",
    backLabel: "案件詳細",
    backAria: "案件詳細へ戻る",
    selected: "選択中",
    notSelected: "選択なし",
    officialNote: "公式申請様式（エクセル）の作成は、PC 版で行います。",
    historyNote: "書類の内容の表示、Word・PDF などの出力、状態の変更、保管は、PC 版で行います。",
    openInDesktop: "PC 版で開く",
    showArchivedOn: "保管済みを表示中",
    showArchivedOff: "保管済みを表示しない",
  },
  en: {
    title: "Documents",
    entry: "Create documents and history",
    backLabel: "Case",
    backAria: "Back to the case",
    selected: "Selected",
    notSelected: "Not selected",
    officialNote: "Official application forms (Excel) are created in the desktop version.",
    historyNote: "Viewing the content, exporting to Word or PDF, changing the status and archiving are done in the desktop version.",
    openInDesktop: "Open in desktop version",
    showArchivedOn: "Archived versions shown",
    showArchivedOff: "Archived versions hidden",
  },
  ko: {
    title: "서류",
    entry: "서류 작성과 이력",
    backLabel: "사건 상세",
    backAria: "사건 상세로 돌아가기",
    selected: "선택됨",
    notSelected: "선택 안 함",
    officialNote: "공식 신청 양식(엑셀)의 작성은 PC 버전에서 합니다.",
    historyNote: "서류 내용 보기, Word·PDF 등의 출력, 상태 변경, 보관은 PC 버전에서 합니다.",
    openInDesktop: "PC 버전에서 열기",
    showArchivedOn: "보관된 버전 표시 중",
    showArchivedOff: "보관된 버전 숨김",
  },
});
