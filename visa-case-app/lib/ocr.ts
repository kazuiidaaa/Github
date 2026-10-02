import type { Extraction } from "./types";

/**
 * 仮のOCR処理。本物のOCR・AI APIへ差し替える際は、この関数のみを置き換える。
 * 戻り値は「候補」であり、行政書士の確認前は正式なデータとして扱わない。
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function runMockOcr(_file: File): Promise<Extraction[]> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const rows: [Extraction["field"], string, number][] = [
    ["legalName", "LI MING", 0.98],
    ["nationality", "中国", 0.97],
    ["dateOfBirth", "1998-05-10", 0.82],
    ["residenceStatus", "技術・人文知識・国際業務", 0.95],
    ["residenceExpiryDate", "2027-06-30", 0.98],
  ];
  return rows.map(([field, value, confidence]) => ({
    field,
    extractedValue: value,
    value,
    confidence,
    reviewStatus: "pending",
  }));
}
