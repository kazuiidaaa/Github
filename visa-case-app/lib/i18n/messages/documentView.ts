import { defineMessages } from "../define";

/**
 * 書類のプレビュー画面（/cases/[id]/documents/[docId]）の、画面の操作部分の文言。
 * プレビューされる書類の本文（DocumentSheet・ClientGuideSheet）は、書類の内容であり、ここに含めない（翻訳しない）。
 * 書類の種類・状態・出力形式の表示名、公式様式の注意、エラー文は、documents 区分を使う。
 */
export const documentView = defineMessages({
  ja: {
    notFound: "文書が見つかりません。",
    back: "← 申請書類作成",
    stale: "生成後に案件情報が更新されています。この版は生成時点の内容です。最新の内容で確認する場合は、再生成してください。",
    outputNote: "この版は{format}として出力・保存された版です。内容は変更できません。",
    newerVersion: "これより新しい版（v{latest}）があります。",

    langNoticeJa: "画面の言語を切り替えても、書類の内容と出力（Word・PDF・エクセル）は日本語のままです。",
    langNoticeGuide: "画面の言語とは別に、ご案内書類の言語は、下の「案内書の言語」で選びます。",
    langNoticeSaved: "画面の言語を切り替えても、保存済みの版の言語は変わりません。",

    guideLangLegend: "案内書の言語",
    guideLangHint: "切り替えると、案内書の表示と、Word・PDF の出力の言語が変わります。保存済みの内容は変わりません。",
    guideLangNotice:
      "訳文は、行政書士が内容を確認してから、依頼者へお渡しください。書類名は、訳文のあとに日本語の原文を併記します。訳がないものは、原文のあとに「Not translated」などの目印を付けています。備考・宛名・氏名は、翻訳しません。",

    markReviewed: "行政書士確認済みにする",
    markSubmitted: "提出済みにする",
    markArchived: "保管にする",
    download: "{format}をダウンロード",
    exportXlsx: "エクセル出力",
    exportDocx: "Word出力",
    exportPdf: "PDF出力",
    exporting: "出力中……",
    print: "印刷",

    fileFailed: "ファイルの出力に失敗しました：{reason}",
    statusFailed: "変更に失敗しました：{reason}",

    reviewedTitle: "行政書士確認済みにする",
    reviewedMessage: "この版を、行政書士が内容を確認した版として記録します。確認者の名前と確認日時が、書類に表示されます。",
    reviewedNote: "操作の記録（監査ログ）が残ります。",
    reviewedLabel: "確認済みにする",
    submittedTitle: "提出済みにする",
    submittedMessage: "この版を、入管へ提出した版として記録します。",
    submittedNote: "操作の記録（監査ログ）が残ります。",
    submittedLabel: "提出済みにする",
    archivedTitle: "書類を保管にする",
    archivedMessage: "この版を保管にします。書類の一覧では初期状態で非表示になります。",
    archivedNote: "「保管済みを表示」にすると見られます。画面から保管を取り消す操作はありません。操作の記録（監査ログ）が残ります。",
    archivedLabel: "保管にする",
  },
  en: {
    notFound: "Document not found.",
    back: "← Prepare application documents",
    stale:
      "The case information was updated after this version was generated. This version shows the content at the time of generation. To check against the latest content, generate it again.",
    outputNote: "This version was output and saved as {format}. Its content cannot be changed.",
    newerVersion: "A newer version (v{latest}) exists.",

    langNoticeJa:
      "Changing the screen language does not change the document. The content and the output (Word, PDF, Excel) stay in Japanese.",
    langNoticeGuide: "The language of the client guide is separate from the screen language. Choose it under \"Guide language\" below.",
    langNoticeSaved: "Changing the screen language does not change the language of a saved version.",

    guideLangLegend: "Guide language",
    guideLangHint: "Changing this changes the language of the guide shown and of the Word and PDF output. Saved content does not change.",
    guideLangNotice:
      "Have an administrative scrivener check the translation before giving it to the client. Document names are followed by the Japanese original. Items without a translation are marked with \"Not translated\" after the original. Remarks, addressee names and personal names are not translated.",

    markReviewed: "Mark as reviewed by scrivener",
    markSubmitted: "Mark as submitted",
    markArchived: "Archive",
    download: "Download {format}",
    exportXlsx: "Export to Excel",
    exportDocx: "Export to Word",
    exportPdf: "Export to PDF",
    exporting: "Exporting...",
    print: "Print",

    fileFailed: "Failed to output the file: {reason}",
    statusFailed: "Failed to change the status: {reason}",

    reviewedTitle: "Mark as reviewed by scrivener",
    reviewedMessage:
      "This version will be recorded as one whose content an administrative scrivener has reviewed. The reviewer's name and the review date and time will appear on the document.",
    reviewedNote: "An operation record (audit log) will be kept.",
    reviewedLabel: "Mark as reviewed",
    submittedTitle: "Mark as submitted",
    submittedMessage: "This version will be recorded as the one submitted to the Immigration Services Agency.",
    submittedNote: "An operation record (audit log) will be kept.",
    submittedLabel: "Mark as submitted",
    archivedTitle: "Archive this document",
    archivedMessage: "This version will be archived. Archived versions are hidden by default in the document list.",
    archivedNote:
      "You can see them by choosing \"Show archived\". Archiving cannot be undone from the screen. An operation record (audit log) will be kept.",
    archivedLabel: "Archive",
  },
  ko: {
    notFound: "문서를 찾을 수 없습니다.",
    back: "← 신청 서류 작성",
    stale:
      "생성 후 사건 정보가 갱신되었습니다. 이 버전은 생성 시점의 내용입니다. 최신 내용으로 확인하려면 다시 생성해 주십시오.",
    outputNote: "이 버전은 {format}(으)로 출력·저장된 버전입니다. 내용은 변경할 수 없습니다.",
    newerVersion: "이보다 새로운 버전(v{latest})이 있습니다.",

    langNoticeJa: "화면 언어를 바꿔도 서류는 바뀌지 않습니다. 서류의 내용과 출력(Word·PDF·엑셀)은 일본어 그대로입니다.",
    langNoticeGuide: "안내 서류의 언어는 화면 언어와 별개입니다. 아래의 \"안내서 언어\"에서 선택합니다.",
    langNoticeSaved: "화면 언어를 바꿔도 저장된 버전의 언어는 바뀌지 않습니다.",

    guideLangLegend: "안내서 언어",
    guideLangHint: "바꾸면 안내서의 표시와 Word·PDF 출력의 언어가 바뀝니다. 저장된 내용은 바뀌지 않습니다.",
    guideLangNotice:
      "번역문은 행정서사가 내용을 확인한 후 의뢰인에게 전달해 주십시오. 서류명은 번역문 뒤에 일본어 원문을 함께 적습니다. 번역이 없는 항목에는 원문 뒤에 \"Not translated\" 등의 표시를 붙였습니다. 비고·수신인·성명은 번역하지 않습니다.",

    markReviewed: "행정서사 확인 완료로 변경",
    markSubmitted: "제출 완료로 변경",
    markArchived: "보관",
    download: "{format} 다운로드",
    exportXlsx: "엑셀 출력",
    exportDocx: "Word 출력",
    exportPdf: "PDF 출력",
    exporting: "출력 중...",
    print: "인쇄",

    fileFailed: "파일 출력에 실패했습니다: {reason}",
    statusFailed: "변경에 실패했습니다: {reason}",

    reviewedTitle: "행정서사 확인 완료로 변경",
    reviewedMessage:
      "이 버전을 행정서사가 내용을 확인한 버전으로 기록합니다. 확인자의 이름과 확인 일시가 서류에 표시됩니다.",
    reviewedNote: "작업 기록(감사 로그)이 남습니다.",
    reviewedLabel: "확인 완료로 변경",
    submittedTitle: "제출 완료로 변경",
    submittedMessage: "이 버전을 출입국재류관리청에 제출한 버전으로 기록합니다.",
    submittedNote: "작업 기록(감사 로그)이 남습니다.",
    submittedLabel: "제출 완료로 변경",
    archivedTitle: "서류를 보관 처리",
    archivedMessage: "이 버전을 보관 처리합니다. 서류 목록에서는 기본적으로 표시되지 않습니다.",
    archivedNote:
      "\"보관된 버전 표시\"를 선택하면 볼 수 있습니다. 화면에서 보관을 취소하는 기능은 없습니다. 작업 기록(감사 로그)이 남습니다.",
    archivedLabel: "보관",
  },
});
