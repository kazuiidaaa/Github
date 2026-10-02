export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** 許可するMIMEタイプと、保存時に使う拡張子（ファイル名は信用せず、MIMEタイプから決める） */
export const ALLOWED_TYPES: Record<string, { ext: string; extensions: string[] }> = {
  "image/jpeg": { ext: "jpg", extensions: ["jpg", "jpeg"] },
  "image/png": { ext: "png", extensions: ["png"] },
  "application/pdf": { ext: "pdf", extensions: ["pdf"] },
};

export function validateDocumentFile(file: { name: string; type: string; size: number }): string | null {
  const rule = ALLOWED_TYPES[file.type];
  if (!rule) return "対応形式は JPG / PNG / PDF です。";
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!rule.extensions.includes(ext)) return "ファイルの拡張子と形式が一致しません。";
  if (file.size === 0) return "空のファイルは登録できません。";
  if (file.size > MAX_FILE_BYTES) return "ファイルサイズは20MB以下にしてください。";
  return null;
}

export function storageExtension(mimeType: string): string {
  return ALLOWED_TYPES[mimeType]?.ext ?? "bin";
}
