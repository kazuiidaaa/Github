import path from "node:path";
import type { FormDetails } from "../../formDetails";
import type { Applicant } from "../../types";
import { ACQUISITION_FILL_ITEMS, ACQUISITION_PICK_ITEMS, MAX_RELATIVES, type AcquisitionCtx } from "./acquisitionMapping";
import { fillWorkbook } from "./fillWorkbook";

/** 差し込み元テンプレート（リポジトリ同梱。Node.js ランタイムで、ファイルシステム経由で読み込む） */
export const ACQUISITION_TEMPLATE_PATH = path.join(process.cwd(), "docs", "official", "acquisition-application-form_930004121.xlsx");

/**
 * 案件情報を、公式の在留資格取得許可申請書（Excel）の対応欄へ差し込み、ワークブックをバッファで返す。
 * 雇用情報は使わない。targetStatus（案件の希望する在留資格）は、様式の4つのチェックボックスのいずれかに
 * 一致すれば該当の□を、一致しなければ「その他（ ）」の□と自由記入欄を使う（ACQUISITION_PICK_ITEMS）。
 * 入力のない項目は、テンプレートの元の状態（空欄）のまま変更しない。
 * 注意：Edge ランタイムでは使えない（node:fs を使う）。
 */
export async function fillAcquisitionExcel(
  a: Applicant,
  f: FormDetails,
  targetStatus = "",
): Promise<{ buffer: Buffer; warnings: string[] }> {
  const ctx: AcquisitionCtx = { a, f, targetStatus };
  const buffer = await fillWorkbook(ACQUISITION_TEMPLATE_PATH, ctx, ACQUISITION_FILL_ITEMS, ACQUISITION_PICK_ITEMS);
  return { buffer, warnings: buildWarnings(ctx) };
}

function buildWarnings(c: AcquisitionCtx): string[] {
  const w: string[] = [];
  if (c.a.confirmationStatus !== "confirmed") {
    w.push("申請人情報が確定していません。すべての項目を、原本と照合してから使用してください。");
  }
  if (c.f.relativesPresent === "yes" && c.f.relatives.length > MAX_RELATIVES) {
    w.push(`在日親族は、様式の欄（${MAX_RELATIVES}人分）に入らない分を差し込んでいません。別紙に記載してください。`);
  }
  return w;
}
