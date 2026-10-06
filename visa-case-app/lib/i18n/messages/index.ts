import { about } from "./about";
import { auth } from "./auth";
import { common } from "./common";
import { dialog } from "./dialog";
import { display } from "./display";
import { footer } from "./footer";
import { header } from "./header";
import { input } from "./input";
import { labels } from "./labels";

/**
 * 訳表の区分の一覧。区分を足すときは、ここへ1行足し、reviewStatus.ts にも同じ区分を足す。
 * 第2段階以降は、画面ごとに区分を足す（例：cases、account）。
 */
export const CATALOG = { common, header, footer, input, dialog, display, labels, auth, about } as const;

export type Catalog = typeof CATALOG;
export type Namespace = keyof Catalog & string;

/** "区分.キー" の形のキーの一覧。存在しないキーは、型検査で弾かれる */
export type MessageKey = {
  [N in Namespace]: `${N}.${keyof Catalog[N]["ja"] & string}`;
}[Namespace];
