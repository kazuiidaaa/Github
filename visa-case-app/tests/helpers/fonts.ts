import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { JAPANESE_FONT_URL, KOREAN_FONT_URL } from "../../lib/documents/pdf";

// フォントは同梱しないため、初回のみ配信元から取得して node_modules/.cache に保存し、以降は再利用する
async function load(url: string): Promise<Uint8Array> {
  const dir = "node_modules/.cache/fonts";
  const file = `${dir}/${url.slice(url.lastIndexOf("/") + 1)}`;
  if (!existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`フォントを取得できません: ${res.status} ${url}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, new Uint8Array(await res.arrayBuffer()));
  }
  return new Uint8Array(readFileSync(file));
}

export const loadJapaneseFontForTest = () => load(JAPANESE_FONT_URL);
export const loadKoreanFontForTest = () => load(KOREAN_FONT_URL);
