"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, Field, inputClass, TONE_STYLES, ToneIcon, type Tone } from "@/components/ui";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { decideFill, postalCodeState, toPostalDigits } from "@/lib/postalCode";
import { lookupPostalCode, type PostalLookupResult } from "@/lib/postalLookup";
import { normalizeAddress, zenkakuHandlers } from "@/lib/zenkaku";

type Notice = { tone: Tone; key: MessageKey } | null;

const NOTICES = {
  loading: { tone: "gray", key: "input.addressField_loading" },
  invalid: { tone: "yellow", key: "input.addressField_invalid" },
  notFound: { tone: "yellow", key: "input.addressField_notFound" },
  unavailable: { tone: "yellow", key: "input.addressField_unavailable" },
  unconfigured: { tone: "gray", key: "input.addressField_unconfigured" },
  filled: { tone: "green", key: "input.addressField_filled" },
  same: { tone: "green", key: "input.addressField_same" },
} satisfies Record<string, NonNullable<Notice>>;

/**
 * 郵便番号と住所を組にした入力部品。7桁になると、都道府県・市区町村・町域を住所の欄へ入れる。
 * 郵便番号は、この部品の中だけで扱い、保存しない（保存するのは、住所のみ）。
 * 入力済みの住所は、確認なしに上書きしない。通信の失敗・該当なしのときも、住所は手入力できる。
 *
 * normalize は、住所を保存する前に通す変換。省略時は、半角を全角にする変換（lib/zenkaku.ts。Issue #223）。
 * 補った住所は、すぐに変換して入れる。手入力の住所は、入力の確定時（IME の確定・欄を離れたとき）に変換する。入力途中は書き換えない。
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
  normalize = normalizeAddress,
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
  const t = useT();
  const [zip, setZip] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState<string | null>(null);
  const requestId = useRef(0);
  const addressRef = useRef<HTMLInputElement>(null);
  const zipId = useId();
  const noticeId = useId();

  function apply(found: string) {
    onChange(normalize(found));
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
        {t(notice.key)}
      </span>
    );

  return (
    <div>
      <div className="mb-3">
        <label htmlFor={zipId} className="mb-1 block text-sm font-bold">
          {t("input.addressField_zipLabel")}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={zipId}
            className={`${inputClass} !w-36`}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder={t("input.addressField_zipPlaceholder")}
            maxLength={12}
            value={zip}
            disabled={disabled}
            aria-describedby={noticeId}
            onChange={(e) => onZipChange(e.target.value)}
          />
          <Button type="button" variant="secondary" disabled={disabled} onClick={() => void search(zip)}>
            {t("input.addressField_search")}
          </Button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {t("input.addressField_zipHelp")}
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
          {...zenkakuHandlers("full", (v) => onChange(normalize(v)))}
        />
      </Field>
      {pending !== null && (
        <ConfirmDialog
          title={t("input.addressField_replaceTitle")}
          message={t("input.addressField_replaceMessage", { address: pending })}
          note={t("input.addressField_replaceNote")}
          confirmLabel={t("input.addressField_replaceConfirm")}
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

