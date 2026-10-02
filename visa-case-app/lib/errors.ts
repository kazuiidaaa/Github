// 利用者に表示するエラー文の一般化。
// Supabase が返す内部メッセージ（テーブル名・制約名など）は画面へ出さず、コンソールにはコードのみ残す。

/** 画面へ表示してよい文言を持つエラー */
export class AppError extends Error {}

type RemoteError = { message?: string; code?: string; status?: number; statusCode?: string | number };

export function toAppError(e: RemoteError, fallback = "処理に失敗しました。時間をおいて再度お試しください。"): AppError {
  const code = String(e.code ?? e.statusCode ?? e.status ?? "");
  if (typeof console !== "undefined") console.error("[remote-error]", code || "unknown");
  if (code === "42501" || code === "403" || /row-level security/i.test(e.message ?? "")) {
    return new AppError("この操作を行う権限がありません。");
  }
  if (code === "PGRST301" || code === "401" || /jwt/i.test(e.message ?? "")) {
    return new AppError("ログインの有効期限が切れました。再度ログインしてください。");
  }
  if (code === "23505") return new AppError("同じ内容がすでに登録されています。");
  if (code === "413") return new AppError("ファイルサイズが上限を超えています。");
  return new AppError(fallback);
}

/** 画面表示用の文言を返す。AppError 以外は内部情報を含み得るため、一般的な文言に置き換える。 */
export function messageOf(e: unknown): string {
  return e instanceof AppError ? e.message : "不明なエラーが発生しました。";
}
