import type { MessageKey } from "./messages";
import { translate, type MessageParams } from "./translate";

/** 翻訳関数の型。useT() の戻り値と同じ */
export type T = (key: MessageKey, params?: MessageParams) => string;

/**
 * 日本語（原文）の翻訳関数。lib/ の関数が、文言を作るとき、翻訳関数が渡されなければ、これを使う。
 * 日本語の出力は、書類の出力・監査記録・試験が使うため、元の文言と一致させる。
 */
export const jaT: T = (key, params) => translate("ja", key, params);
