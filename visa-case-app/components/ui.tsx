import type { ButtonHTMLAttributes, ReactNode } from "react";

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
      className={`rounded-full px-5 py-2 text-sm font-bold disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

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
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-bold text-red-700">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/40";

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
