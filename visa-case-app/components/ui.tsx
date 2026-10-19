import { Children, cloneElement, isValidElement, useId, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

/** 押しやすさのため、最小の高さは 44px（人の決定。Issue #392）。画面ごとの min-h-[44px] は不要 */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-accent text-accent-text hover:bg-accent-hover disabled:bg-slate-200 disabled:text-slate-500",
    secondary: "border border-line-strong bg-white text-slate-800 hover:bg-slate-100 disabled:text-slate-500",
    danger: "border border-red-400 bg-white text-red-700 hover:bg-red-50",
  }[variant];
  return (
    <button
      {...props}
      className={`min-h-[44px] rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

type FieldControlProps = { id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean | "true" | "false" };

/**
 * Field が説明・誤りの文の id を aria-describedby で渡してよい、独自の部品の印（DateField など）。
 * 印のある部品は、受け取った aria-describedby を入力欄に付け、自分の誤りの文の id と合わせる（mergeDescribedBy）。
 */
export type FieldLinkableComponent = { acceptsFieldDescribedBy?: true };

/** 説明・誤りの id を、既存の aria-describedby の後ろにつなげる（重複は除く） */
export function mergeDescribedBy(...ids: (string | undefined)[]): string | undefined {
  const list = ids.flatMap((v) => (v ? v.split(/\s+/) : [])).filter(Boolean);
  const unique = [...new Set(list)];
  return unique.length > 0 ? unique.join(" ") : undefined;
}

const LINKABLE_CONTROLS = ["input", "select", "textarea"];

/**
 * 入力欄の見出し・説明・誤りをまとめる共通部品。
 * - 必須は、色や「*」だけに頼らず「必須」の文字で示す（人の決定。Issue #392）。
 * - 子が input・select・textarea の1要素なら、説明・誤りの文を aria-describedby で結び付け、誤りがあれば aria-invalid を付ける。
 *   子が自分の id・aria-describedby を持つ場合は、それを残して後ろに加える（上書きしない）。
 *   DateField など印（acceptsFieldDescribedBy）のある独自の部品には、説明・誤りの文の id を aria-describedby で渡す。
 *   誤りの判定と aria-invalid は、部品が自分で行う。印の無い独自の部品には触らない。
 */
export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const t = useT();
  const autoId = useId();
  const only = Children.count(children) === 1 ? Children.toArray(children)[0] : null;
  const control =
    isValidElement<FieldControlProps>(only) && typeof only.type === "string" && LINKABLE_CONTROLS.includes(only.type)
      ? (only as ReactElement<FieldControlProps>)
      : null;
  const linkable =
    !control && isValidElement<FieldControlProps>(only) && typeof only.type === "function" && (only.type as FieldLinkableComponent).acceptsFieldDescribedBy
      ? (only as ReactElement<FieldControlProps>)
      : null;
  const base = (control ?? linkable)?.props.id ?? `field-${autoId.replace(/[^A-Za-z0-9_-]/g, "")}`;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  const showHint = Boolean(hint) && !error;
  const content = control
    ? cloneElement(control, {
        "aria-describedby": mergeDescribedBy(control.props["aria-describedby"], showHint ? hintId : undefined, error ? errorId : undefined),
        "aria-invalid": error ? true : control.props["aria-invalid"],
      })
    : linkable
      ? cloneElement(linkable, {
          "aria-describedby": mergeDescribedBy(linkable.props["aria-describedby"], showHint ? hintId : undefined, error ? errorId : undefined),
        })
      : children;
  return (
    <label className="block">
      <span className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold">
        {label}
        {required && (
          <Badge tone="red" icon={false}>
            {t("input.field_required")}
          </Badge>
        )}
      </span>
      {content}
      {showHint && (
        <span id={hintId} className="mt-1 block text-xs text-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="mt-1 block text-xs font-bold text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

export const inputClass =
  // 16px 未満だと iOS Safari がフォーカス時に拡大するため text-base。高さは押しやすさのため 44px 以上（Issue #392）
  "min-h-[44px] w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/40";

export type Tone = "green" | "yellow" | "red" | "gray" | "blue";

export const TONE_STYLES: Record<Tone, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-800",
};

/** 色だけに頼らないよう、状態ごとに形の違う図形を併記する（完了＝丸に印、注意＝三角、要対応＝ひし形、未了＝破線の丸、情報＝丸に点）。 */
export function ToneIcon({ tone }: { tone: Tone }) {
  const common = { "aria-hidden": true, viewBox: "0 0 12 12", width: 12, height: 12, fill: "none", stroke: "currentColor", strokeWidth: 1.6 } as const;
  switch (tone) {
    case "green":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="5" />
          <path d="m3.5 6.2 1.7 1.7 3.3-3.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "yellow":
      return (
        <svg {...common}>
          <path d="M6 1.2 11 10.5H1z" strokeLinejoin="round" />
          <path d="M6 4.6v2.6M6 8.7v.1" strokeLinecap="round" />
        </svg>
      );
    case "red":
      return (
        <svg {...common}>
          <path d="M6 .8 11.2 6 6 11.2.8 6z" strokeLinejoin="round" />
          <path d="M6 3.6v2.8M6 8.2v.1" strokeLinecap="round" />
        </svg>
      );
    case "blue":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="5" />
          <path d="M6 5.4v3M6 3.5v.1" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="5" strokeDasharray="2 1.8" />
        </svg>
      );
  }
}

export function Badge({ tone, icon = true, children }: { tone: Tone; icon?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE_STYLES[tone]}`}>
      {icon && <ToneIcon tone={tone} />}
      {children}
    </span>
  );
}
