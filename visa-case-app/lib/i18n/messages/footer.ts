import { defineMessages } from "../define";

/** フッターの文言。日本語は lib/notices.ts の定数と同じ内容にする */
export const footer = defineMessages({
  ja: {
    prototypeNotice: "試作版です。実在の個人情報を入力しないでください",
    reviewNotice: "書類は、行政書士が内容を確認してから使用してください",
    aboutLink: "ご利用にあたって",
  },
  en: {
    prototypeNotice: "This is a prototype. Do not enter real personal information.",
    reviewNotice: "Have an administrative scrivener review the content before using any document.",
    aboutLink: "About this service",
  },
  ko: {
    prototypeNotice: "시험판입니다. 실제 개인정보를 입력하지 마십시오.",
    reviewNotice: "서류는 행정서사가 내용을 확인한 후에 사용해 주십시오.",
    aboutLink: "이용 안내",
  },
});
