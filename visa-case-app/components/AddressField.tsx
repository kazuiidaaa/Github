"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, Field, inputClass, TONE_STYLES, ToneIcon, type Tone } from "@/components/ui";
import { decideFill, postalCodeState, toPostalDigits } from "@/lib/postalCode";
import { lookupPostalCode, type PostalLookupResult } from "@/lib/postalLookup";

type Notice = { tone: Tone; text: string } | null;

const NOTICES = {
  loading: { tone: "gray", text: "住所を検索しています。" },
  invalid: { tone: "yellow", text: "郵便番号は、7桁の数字で入力してください。" },
  notFound: { tone: "yellow", text: "該当が見つかりませんでした。住所は手入力してください。" },
  unavailable: { tone: "yellow", text: "住所を取得できませんでした。住所は手入力してください。" },
  unconfigured: { tone: "gray", text: "郵便番号からの自動入力は、設定されていません。住所は手入力できます。" },
  filled: { tone: "green", text: "住所の前半を入れました。番地以降を続けて入力してください。" },
  same: { tone: "green", text: "入力済みの住所に、すでに含まれています。" },
} satisfies Record<string, NonNullable<Notice>>;

/**
 * 郵便番号と住所を組にした入力部品。7桁になると、都道府県・市区町村・町域を住所の欄へ入れる。
 * 郵便番号は、この部品の中だけで扱い、保存しない（保存するのは、住所のみ）。
 * 入力済みの住所は、確認なしに上書きしない。通信の失敗・該当なしのときも、住所は手入力できる。
 *
 * normalize は、補った住所を保存する前に通す変換（全角変換 #223 などが使う）。省略時は、そのまま入れる。
 * id は、住所の入力欄の id（概要からのフォーカス移動などが使う）。
 */
export function AddressField({
  label,
  value,
  onChange,
  id,
  disabled,
  placeholder,
  hint,
  error,
  required,
  normalize,
  lookup = lookupPostalCode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  normalize?: (address: string) => string;
  lookup?: (zip: string) => Promise<PostalLookupResult>;
}) {
  const [zip, setZip] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState<string | null>(null);
  const requestId = useRef(0);
  const addressRef = useRef<HTMLInputElement>(null);
  const zipId = useId();
  const noticeId = useId();

  function apply(found: string) {
    onChange(normalize ? normalize(found) : found);
    setNotice(NOTICES.filled);
    // 番地以降を続けて入力できるよう、住所の欄の末尾へ移す
    requestAnimationFrame(() => {
      const el = addressRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  async function search(input: string) {
    const digits = toPostalDigits(input);
    if (!digits) {
      setNotice(NOTICES.invalid);
      return;
    }
    const mine = ++requestId.current;
    setNotice(NOTICES.loading);
    const result = await lookup(digits);
    if (mine !== requestId.current) return; // 入力が変わった後の古い結果は使わない
    if (result.status !== "found") {
      setNotice(NOTICES[result.status]);
      return;
    }
    const action = decideFill(value, result.address);
    if (action === "same") setNotice(NOTICES.same);
    else if (action === "confirm") {
      setNotice(null);
      setPending(result.address);
    } else apply(result.address);
  }

  function onZipChange(raw: string) {
    setZip(raw);
    requestId.current++; // 入力中の検索は、無効にする
    const state = postalCodeState(raw);
    if (state === "complete") void search(raw);
    else setNotice(state === "invalid" ? NOTICES.invalid : null);
  }

  let noticeView: ReactNode = null;
  if (notice) noticeView = (
      // 狭い画面で折り返せるよう、Badge ではなく、同じ配色の折り返せる表示にする（色だけでなく、図形と文字を併記）
      <span className={`inline-flex items-start gap-1 rounded-2xl px-2.5 py-0.5 text-xs font-bold ${TONE_STYLES[notice.tone]}`}>
        <span className="mt-0.5 shrink-0">
          <ToneIcon tone={notice.tone} />
        </span>
        {notice.text}
      </span>
    );

  return (
    <div>
      <div className="mb-3">
        <label htmlFor={zipId} className="mb-1 block text-sm font-bold">
          郵便番号
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={zipId}
            className={`${inputClass} !w-36`}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="例：1000001"
            maxLength={12}
            value={zip}
            disabled={disabled}
            aria-describedby={noticeId}
            onChange={(e) => onZipChange(e.target.value)}
          />
          <Button type="button" variant="secondary" disabled={disabled} onClick={() => void search(zip)}>
            住所を入れる
          </Button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          7桁の数字を入れると、住所の前半（都道府県・市区町村・町域）が入ります。郵便番号は保存しません。
        </p>
        <p id={noticeId} role="status" className="mt-1 min-h-6">
          {noticeView}
        </p>
      </div>
      <Field label={label} required={required} hint={hint} error={error}>
        <input
          ref={addressRef}
          id={id}
          className={inputClass}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
      {pending !== null && (
        <ConfirmDialog
          title="住所を置き換えますか"
          message={`入力済みの住所を、郵便番号から見つかった「${pending}」に置き換えます。`}
          note="置き換えた後も、住所の欄で編集できます。番地以降は、入力し直してください。"
          confirmLabel="置き換える"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const found = pending;
            setPending(null);
            apply(found);
          }}
        />
      )}
    </div>
  );
}

