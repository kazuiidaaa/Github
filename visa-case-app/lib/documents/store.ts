"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AppError, messageOf, toAppError } from "../errors";
import { logAudit, newId } from "../store";
import { localKey } from "../demo";
import { supabase, usesSupabase } from "../supabase";
import type { CaseRecord } from "../types";
import { findEditableDraft, mergeCreated, sortDocuments } from "./merge";
import { buildContent, titleOf } from "./snapshot";
import { XLSX_MIME, requestOfficialXlsx } from "./officialFormClient";
import { officialFormInputOf } from "./officialForms";
import type {
  ContentJson,
  GeneratedDocument,
  GeneratedDocumentStatus,
  GeneratedDocumentType,
  InternalDocumentType,
  OutputFormat,
} from "./types";
import { isOfficialForm } from "./types";

// 生成文書の保存。案件のストアとは独立させ、接続情報の有無で保存先だけを切り替える。

export const DOCUMENTS_KEY = "visa-case-app:generated-documents:v1";
const EMPTY: GeneratedDocument[] = [];

let byCase: Record<string, GeneratedDocument[]> = {};
let loadedCases = new Set<string>();
let error = "";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
interface Row {
  id: string;
  case_id: string;
  document_type: GeneratedDocumentType;
  title: string;
  version: number;
  content_json: ContentJson;
  document_status: GeneratedDocumentStatus;
  created_at: string;
  created_by: string | null;
  organization_id: string;
  output_format: OutputFormat | null;
  storage_path: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
}

function fromRow(r: Row): GeneratedDocument {
  return {
    id: r.id,
    caseId: r.case_id,
    organizationId: r.organization_id,
    outputFormat: r.output_format ?? "html",
    storagePath: r.storage_path ?? undefined,
    documentType: r.document_type,
    title: r.title,
    version: r.version,
    content: r.content_json,
    status: r.document_status,
    createdAt: r.created_at,
    createdBy: r.created_by ?? undefined,
    reviewedAt: r.reviewed_at ?? undefined,
    reviewedByName: r.reviewed_by_name ?? undefined,
  };
}

const sorted = sortDocuments;

function readLocal(): GeneratedDocument[] {
  try {
    const raw = localStorage.getItem(localKey(DOCUMENTS_KEY));
    // 6-A の保存データには出力形式がないため、画面（html）として補う
    return raw ? (JSON.parse(raw) as GeneratedDocument[]).map((d) => ({ ...d, outputFormat: d.outputFormat ?? "html" })) : [];
  } catch {
    return [];
  }
}
function writeLocal(all: GeneratedDocument[]) {
  try {
    localStorage.setItem(localKey(DOCUMENTS_KEY), JSON.stringify(all));
  } catch {
    error = "このブラウザの保存容量が不足しています。";
  }
}

function db() {
  if (!supabase) throw new AppError("接続情報が設定されていません。管理者にご確認ください。");
  return supabase;
}

export async function loadDocuments(caseId: string): Promise<void> {
  try {
    if (usesSupabase()) {
      const { data, error: e } = await db()
        .from("generated_documents")
        .select("*")
        .eq("case_id", caseId);
      if (e) throw toAppError(e);
      byCase = { ...byCase, [caseId]: sorted((data as Row[]).map(fromRow)) };
    } else {
      byCase = { ...byCase, [caseId]: sorted(readLocal().filter((d) => d.caseId === caseId)) };
    }
    error = "";
  } catch (e) {
    error = `生成文書の読み込みに失敗しました：${messageOf(e)}`;
  }
  loadedCases = new Set(loadedCases).add(caseId);
  emit();
}

/** ログアウト時に、メモリ上の生成文書を破棄する */
export function resetDocuments() {
  byCase = {};
  loadedCases = new Set();
  error = "";
  emit();
}

/** 画面状態の現在値（テスト用。画面は useGeneratedDocuments を使う） */
export function getGeneratedDocuments(caseId: string): GeneratedDocument[] {
  return byCase[caseId] ?? EMPTY;
}

export function useGeneratedDocuments(caseId: string): {
  documents: GeneratedDocument[];
  loaded: boolean;
  error: string;
} {
  useEffect(() => {
    void loadDocuments(caseId);
  }, [caseId]);
  const documents = useSyncExternalStore(subscribe, () => byCase[caseId] ?? EMPTY, () => EMPTY);
  const loaded = useSyncExternalStore(subscribe, () => loadedCases.has(caseId), () => false);
  const err = useSyncExternalStore(subscribe, () => error, () => "");
  return { documents, loaded, error: err };
}

/**
 * 確認前（draft）の版を、同じ行（id）のまま更新する。版番号は同じ案件・同じ種類の最大値の次へ進める。
 * 確認済み以降の版は更新できない（DB の規則でも拒否される）。
 */
async function updateDraft(existing: GeneratedDocument, title: string, content: ContentJson): Promise<GeneratedDocument> {
  if (existing.status !== "draft") throw new AppError("確認前の版のみ更新できます。");
  let updated: GeneratedDocument;
  if (usesSupabase()) {
    const { data, error: e } = await db().rpc("update_draft_generated_document", {
      p_id: existing.id,
      p_title: title,
      p_content: content,
    });
    if (e) throw toAppError(e);
    updated = fromRow(data as Row);
  } else {
    const all = readLocal();
    const version =
      Math.max(0, ...all.filter((d) => d.caseId === existing.caseId && d.documentType === existing.documentType).map((d) => d.version)) + 1;
    updated = { ...existing, title, content, version };
    writeLocal(all.map((d) => (d.id === existing.id ? updated : d)));
  }
  logAudit(existing.caseId, "document_updated", {
    type: existing.documentType,
    format: existing.outputFormat,
    fromVersion: existing.version,
    version: updated.version,
  });
  return updated;
}

/**
 * 選択した種類の文書を、現在の案件情報から生成する。
 * 同じ種類・同じ出力形式に確認前の最新の版があれば、その版を更新する。
 * なければ（確認済み以降が最新の場合を含む）、新しい版として追加する。確認済み以降の版は上書きしない。
 * 生成・更新した版を返す。
 */
export async function generateDocuments(record: CaseRecord, types: InternalDocumentType[]): Promise<GeneratedDocument[]> {
  const created: GeneratedDocument[] = [];
  try {
    for (const type of types) {
      // 公式様式（Excel）は、先にエクセルを作る（失敗した場合は、版を作らない）。
      // 差し込みの warnings は、生成時点の注意として content_json に保存する
      const official = isOfficialForm(type) ? await requestOfficialXlsx(record.procedureType, officialFormInputOf(record)) : undefined;
      const content = buildContent(record, type, new Date(), official?.warnings);
      const title = titleOf(record, type);
      let doc: GeneratedDocument;
      const draft = findEditableDraft(byCase[record.id] ?? [], record.id, type, "html");
      if (draft) {
        doc = await updateDraft(draft, title, content);
      } else if (usesSupabase()) {
        const { data, error: e } = await db().rpc("create_generated_document", {
          p_case_id: record.id,
          p_document_type: type,
          p_title: title,
          p_content: content,
        });
        if (e) throw toAppError(e);
        doc = fromRow(data as Row);
      } else {
        const all = readLocal();
        const version =
          Math.max(0, ...all.filter((d) => d.caseId === record.id && d.documentType === type).map((d) => d.version)) + 1;
        doc = {
          id: newId(),
          caseId: record.id,
          outputFormat: "html",
          documentType: type,
          title,
          version,
          content,
          status: "draft",
          createdAt: new Date().toISOString(),
        };
        writeLocal([...all, doc]);
      }
      created.push(doc);
      if (!draft) logAudit(record.id, "document_generated", { type, version: doc.version });
      if (official) {
        // 保存した版（画面）から、エクセルを新しい版として保存する。画面の版には、注意と出典が残る
        const xlsx = await exportFile(doc, "xlsx", official.blob);
        created.push(xlsx);
      }
    }
  } finally {
    // 途中で失敗しても、保存済みの版は画面へ反映する（例外はそのまま呼び出し元へ伝わる）
    if (created.length > 0) {
      byCase = { ...byCase, [record.id]: mergeCreated(byCase[record.id] ?? [], created) };
      emit();
    }
  }
  return created;
}

/** 状態を変更する。内容（content_json）は変更しない */
export async function changeStatus(
  doc: GeneratedDocument,
  status: GeneratedDocumentStatus,
  reviewerName: string,
): Promise<void> {
  const reviewing = status === "reviewed";
  let next: GeneratedDocument;
  if (usesSupabase()) {
    const patch: Record<string, unknown> = { document_status: status };
    if (reviewing) patch.reviewed_by_name = reviewerName;
    const { data, error: e } = await db().from("generated_documents").update(patch).eq("id", doc.id).select().single();
    if (e) throw toAppError(e);
    next = fromRow(data as Row);
  } else {
    next = {
      ...doc,
      status,
      ...(reviewing ? { reviewedAt: new Date().toISOString(), reviewedByName: reviewerName } : {}),
    };
    writeLocal(readLocal().map((d) => (d.id === doc.id ? next : d)));
  }
  byCase = {
    ...byCase,
    [doc.caseId]: sorted((byCase[doc.caseId] ?? []).map((d) => (d.id === doc.id ? next : d))),
  };
  logAudit(doc.caseId, `document_${status}`, { type: doc.documentType, version: doc.version });
  emit();
}

// ログアウト時に破棄する（lib/auth.ts を変更せずに済むよう、このモジュール内で購読する）
if (typeof window !== "undefined" && supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") resetDocuments();
  });
}

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  xlsx: XLSX_MIME,
} as const;
const FILE_BUCKET = "generated-documents";

export type FileFormat = keyof typeof MIME;

export function fileNameOf(doc: GeneratedDocument): string {
  const ext = doc.outputFormat === "pdf" ? "pdf" : doc.outputFormat === "xlsx" ? "xlsx" : "docx";
  return `${doc.title}_v${doc.version}.${ext}`.replace(/[\\/:*?"<>|]/g, "_");
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** 保存済みの内容から、出力形式に応じたファイルを作る。現在の案件情報は参照しない */
async function buildFile(doc: GeneratedDocument): Promise<Blob> {
  if (doc.outputFormat === "xlsx") {
    // 保存した入力値の写しから作る（現在の案件情報は参照しない）
    const o = doc.content.officialForm;
    if (!o) throw new AppError("この版には、エクセルを作るための情報がありません。");
    return (await requestOfficialXlsx(doc.content.case.procedureType, o.input)).blob;
  }
  if (doc.outputFormat === "pdf") {
    const { buildPdf, loadJapaneseFont } = await import("./pdf");
    return buildPdf(doc, await loadJapaneseFont());
  }
  const { buildDocx } = await import("./docx");
  return buildDocx(doc);
}

/**
 * 保存済みの内容（content_json）から、Word・PDF・エクセルを出力する。元の版は変更しない。
 * 同じ種類・同じ形式に確認前の最新の版があれば、その版（行・保管庫のファイル）を更新する。
 * なければ新しい版として追加する。出力した版は「行政書士確認前」から始まる。
 */
export async function exportFile(
  source: GeneratedDocument,
  format: FileFormat,
  /** すでに作ったファイルがあれば渡す（エクセルを二重に作らないため） */
  prebuilt?: Blob,
): Promise<GeneratedDocument> {
  const draft = findEditableDraft(byCase[source.caseId] ?? [], source.caseId, source.documentType, format);
  const id = draft?.id ?? newId();
  const fresh: GeneratedDocument = {
    ...source,
    id,
    outputFormat: format,
    storagePath: draft?.storagePath,
    status: "draft",
    reviewedAt: undefined,
    reviewedByName: undefined,
  };
  let created: GeneratedDocument;
  if (usesSupabase()) {
    if (!source.organizationId) throw new AppError("文書の情報が不足しています。画面を読み込み直してください。");
    const path = draft?.storagePath ?? `${source.organizationId}/${source.caseId}/${id}.${format}`;
    const blob = prebuilt ?? (await buildFile(fresh));
    // 確認前の版の更新では、同じ保存先へ上書きする（上書きは、確認前の版のファイルのみ許可される）
    const up = await db().storage.from(FILE_BUCKET).upload(path, blob, { contentType: MIME[format], upsert: !!draft });
    if (up.error) throw toAppError(up.error);
    if (draft) {
      const { data, error: e } = await db().rpc("update_draft_generated_document", {
        p_id: draft.id,
        p_title: source.title,
        p_content: source.content,
      });
      if (e) throw toAppError(e);
      created = fromRow(data as Row);
      logAudit(source.caseId, "document_updated", {
        type: draft.documentType,
        format,
        fromVersion: draft.version,
        version: created.version,
      });
    } else {
      const { data, error: e } = await db().rpc("register_generated_file", {
        p_source_id: source.id,
        p_new_id: id,
        p_output_format: format,
        p_storage_path: path,
      });
      if (e) throw toAppError(e);
      created = fromRow(data as Row);
    }
  } else if (draft) {
    created = await updateDraft(draft, source.title, source.content);
  } else {
    const all = readLocal();
    const version =
      Math.max(0, ...all.filter((d) => d.caseId === source.caseId && d.documentType === source.documentType).map((d) => d.version)) + 1;
    created = { ...fresh, version, createdAt: new Date().toISOString() };
    writeLocal([...all, created]);
  }
  byCase = {
    ...byCase,
    [source.caseId]: mergeCreated(byCase[source.caseId] ?? [], [created]),
  };
  logAudit(source.caseId, `document_${format}_exported`, { type: source.documentType, version: created.version, updated: !!draft });
  emit();
  return created;
}

/** ファイルをダウンロードする。Supabase 利用時は短時間有効な署名付きURLを使う */
export async function downloadFile(doc: GeneratedDocument): Promise<void> {
  if (usesSupabase()) {
    if (!doc.storagePath) throw new AppError("ファイルの保存先が見つかりません。");
    const { data, error: e } = await db()
      .storage.from(FILE_BUCKET)
      .createSignedUrl(doc.storagePath, 60, { download: fileNameOf(doc) });
    if (e || !data) throw toAppError(e ?? {});
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    saveBlob(await buildFile(doc), fileNameOf(doc));
  }
  logAudit(doc.caseId, `document_${doc.outputFormat}_downloaded`, { type: doc.documentType, version: doc.version });
}
