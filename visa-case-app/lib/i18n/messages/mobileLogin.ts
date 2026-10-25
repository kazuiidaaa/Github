import { defineMessages } from "../define";

/**
 * iPhone 版のログイン画面（/m/login）だけの文言。
 * 見出し・項目名・エラー文・ボタンなどは、PC 版と共通のため auth 区分（と input 区分）を使う。ここには iPhone 版だけの読み上げ名・見出しを置く。
 * エラー文は PC 版と同じ（登録の有無が推測できない文言）。ここで独自の文を足さない。
 */
export const mobileLogin = defineMessages({
  ja: {
    loginFormAria: "ログイン",
    resetFormAria: "パスワードの再設定",
    passwordShowAria: "パスワードを表示する",
    passwordHideAria: "パスワードを隠す",
    demoHeader: "ログインせずに試す",
    typedLabel: "入力中:",
  },
  en: {
    loginFormAria: "Sign in",
    resetFormAria: "Reset password",
    passwordShowAria: "Show password",
    passwordHideAria: "Hide password",
    demoHeader: "Try without signing in",
    typedLabel: "Entered:",
  },
  ko: {
    loginFormAria: "로그인",
    resetFormAria: "비밀번호 재설정",
    passwordShowAria: "비밀번호 표시",
    passwordHideAria: "비밀번호 숨기기",
    demoHeader: "로그인 없이 체험",
    typedLabel: "입력 중:",
  },
});
