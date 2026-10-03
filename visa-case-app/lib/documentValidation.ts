export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** 許可するMIMEタイプと、保存時に使う拡張子（ファイル名は信用せず、MIMEタイプから決める） */
export const ALLOWED_TYPES: Record<string, { ext: string; extensions: string[] }> = {
  "image/jpeg": { ext: "jpg", extensions: ["jpg", "jpeg"] },
  "image/png": { ext: "png", extensions: ["png"] },
  "application/pdf": { ext: "pdf", extensions: ["pdf"] },
};

/** 書類種別ごとに受け付けるMIMEタイプ。証明写真は画像のみ（PDF不可） */
export const ALLOWED_MIME_BY_DOCUMENT_TYPE: Record<"residence_card" | "photo", string[]> = {
  residence_card: ["image/jpeg", "image/png", "application/pdf"],
  photo: ["image/jpeg", "image/png"],
};

export const FORMAT_LABEL_BY_DOCUMENT_TYPE: Record<"residence_card" | "photo", string> = {
  residence_card: "JPG / PNG / PDF",
  photo: "JPG / PNG",
};

export function validateDocumentFile(
  file: { name: string; type: string; size: number },
  documentType: "residence_card" | "photo" = "residence_card",
): string | null {
  const rule = ALLOWED_MIME_BY_DOCUMENT_TYPE[documentType].includes(file.type) ? ALLOWED_TYPES[file.type] : undefined;
  if (!rule) return `対応形式は ${FORMAT_LABEL_BY_DOCUMENT_TYPE[documentType]} です。`;
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!rule.extensions.includes(ext)) return "ファイルの拡張子と形式が一致しません。";
  if (file.size === 0) return "空のファイルは登録できません。";
  if (file.size > MAX_FILE_BYTES) return "ファイルサイズは20MB以下にしてください。";
  return null;
}

export function storageExtension(mimeType: string): string {
  return ALLOWED_TYPES[mimeType]?.ext ?? "bin";
}
