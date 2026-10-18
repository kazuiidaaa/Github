"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui";
import { useT } from "@/lib/i18n/LanguageProvider";

/** パスワード欄。「表示する」ボタンで、入力内容の表示・非表示を切り替える。 */
export function PasswordField({
  label,
  hint,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
}) {
  const t = useT();
  const [shown, setShown] = useState(false);
  return (
    <div>
      <Field label={label} hint={hint}>
        <input
          type={shown ? "text" : "password"}
          required
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
      <button
        type="button"
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
        className="mt-1 inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-bold text-accent underline underline-offset-2"
      >
        {shown ? t("input.passwordField_hide") : t("input.passwordField_show")}
      </button>
    </div>
  );
}
