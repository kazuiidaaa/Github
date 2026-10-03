import type { DocumentRecord } from "./types";

/** 案件に登録する書類（アップロードされた原本）の種別。生成文書の種別とは別物 */
export type UploadedDocumentType = DocumentRecord["documentType"];

export const UPLOADED_DOCUMENT_LABELS: Record<UploadedDocumentType, string> = {
  residence_card: "在留カード",
  photo: "証明写真",
};

/** 同じ種別の既存レコードだけを新しいレコードに置き換え、他の種別は保持する */
export function replaceDocumentOfType(documents: DocumentRecord[], record: DocumentRecord): DocumentRecord[] {
  return [...documents.filter((d) => d.documentType !== record.documentType), record];
}

/** 指定した種別だけを取り除き、他の種別は保持する */
export function removeDocumentOfType(documents: DocumentRecord[], type: UploadedDocumentType): DocumentRecord[] {
  return documents.filter((d) => d.documentType !== type);
}

export function findDocumentOfType(documents: DocumentRecord[], type: UploadedDocumentType): DocumentRecord | undefined {
  return documents.find((d) => d.documentType === type);
}

/** 証明写真アップロードUIに表示する規格の案内（必要書類の photo 項目の note と整合） */
export const PHOTO_GUIDANCE =
  "規格：縦4cm×横3cm。申請前6か月以内に正面から撮影された、無帽・無背景で鮮明なものを登録してください。";

export function hasResidenceCard(c: { documents: DocumentRecord[] }): boolean {
  return findDocumentOfType(c.documents, "residence_card") !== undefined;
}
