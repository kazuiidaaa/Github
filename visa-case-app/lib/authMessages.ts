/** 新しいパスワードの設定（updateUser）が失敗したときの、表示用の文言。Supabase のエラー種別（code）で出し分ける */
export function passwordUpdateErrorMessage(error: { code?: string }): string {
  switch (error.code) {
    case "same_password":
      return "現在のパスワードと同じです。現在のパスワードと異なるものを入力してください。";
    case "weak_password":
      return "パスワードが簡単すぎます。英数字を組み合わせて、もう少し長く、推測されにくいものにしてください。";
    case "session_expired":
    case "reauthentication_needed":
    case "reauthentication_not_valid":
    case "bad_jwt":
    case "no_authorization":
      return "リンクの有効期限が切れました。ログイン画面から、もう一度再設定のメールを送ってください。";
    default:
      return "パスワードを設定できませんでした。時間をおいて再度お試しください。改善しない場合は、ログイン画面から、もう一度再設定のメールを送ってください。";
  }
}
