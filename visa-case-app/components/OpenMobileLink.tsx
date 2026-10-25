"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { clearViewCookie, isIphoneUserAgent } from "@/lib/deviceRedirect";

const subscribe = () => () => {};
const isIphone = () => isIphoneUserAgent(navigator.userAgent);

/**
 * PC 版のフッターに出す、iPhone 版へ戻る小さなリンク。iPhone の User-Agent のときだけ出す（PC 版の見た目は変えない）。
 * 押すと「PC 版を選んだ」Cookie を消してから /m/cases へ移る。以後は、PC 版の主要画面を開くと再び自動で iPhone 版へ振り分けられる。
 * 通常の <a>（全読み込み）にして、Link の先読みで振り分け前の結果が残らないようにする。
 */
export function OpenMobileLink() {
  const t = useT();
  // サーバー側の描画とハイドレーションでは false（出さない）。クライアントで確定してから出す
  const show = useSyncExternalStore(subscribe, isIphone, () => false);
  if (!show) return null;
  return (
    // 先読みを避けるため、意図して <a> を使う（上の説明を参照）
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a
      href="/m/cases"
      onClick={() => {
        try {
          document.cookie = clearViewCookie(location.protocol === "https:");
        } catch {
          // Cookie が使えなくても、移動はそのまま行う
        }
      }}
      className="inline-flex min-h-[44px] items-center font-bold text-blue-700 underline-offset-2 hover:underline"
    >
      {t("mobile.openMobile")}
    </a>
  );
}
