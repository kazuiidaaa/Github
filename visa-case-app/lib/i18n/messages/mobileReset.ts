import { defineMessages } from "../define";

/**
 * iPhone 版の「新しいパスワードの設定」画面（/m/reset-password）だけの文言。
 * 見出し・項目名・ヒント・エラー文・ボタンは PC 版と共通のため auth 区分を使う。ここには iPhone 版だけの読み上げ名を置く。
 */
export const mobileReset = defineMessages({
  ja: {
    formAria: "新しいパスワードの設定",
    passwordShowAria: "新しいパスワードを表示する",
    passwordHideAria: "新しいパスワードを隠す",
  },
  en: {
    formAria: "Set a new password",
    passwordShowAria: "Show new password",
    passwordHideAria: "Hide new password",
  },
  ko: {
    formAria: "새 비밀번호 설정",
    passwordShowAria: "새 비밀번호 표시",
    passwordHideAria: "새 비밀번호 숨기기",
  },
});
