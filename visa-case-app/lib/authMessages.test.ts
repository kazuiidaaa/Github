import { describe, expect, it } from "vitest";
import { passwordUpdateErrorMessage } from "./authMessages";

describe("passwordUpdateErrorMessage", () => {
  it("現在と同じパスワードの場合は、リンクの期限切れではなく、同じであることを案内する", () => {
    const msg = passwordUpdateErrorMessage({ code: "same_password" });
    expect(msg).toContain("現在のパスワードと同じ");
    expect(msg).not.toContain("有効期限");
  });

  it("弱いパスワードの場合は、その旨を案内する", () => {
    expect(passwordUpdateErrorMessage({ code: "weak_password" })).toContain("簡単すぎ");
  });

  it("セッションの期限切れ等の場合は、再度メールを送るよう案内する", () => {
    for (const code of ["session_expired", "reauthentication_needed", "reauthentication_not_valid", "bad_jwt", "no_authorization"]) {
      expect(passwordUpdateErrorMessage({ code }), code).toContain("有効期限が切れました");
    }
  });

  it("種別が不明・なしの場合は、期限切れと決めつけない共通の文言にする", () => {
    for (const e of [{}, { code: "unexpected_failure" }]) {
      const msg = passwordUpdateErrorMessage(e);
      expect(msg).toContain("設定できませんでした");
      expect(msg).not.toContain("有効期限が切れました");
    }
  });
});
