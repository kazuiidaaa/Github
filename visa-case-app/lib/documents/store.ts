"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AppError, messageOf, toAppError } from "../errors";
import { logAudit, newId } from "../store";
import { isSupabaseEnabled, supabase } from "../supabase";
import type { CaseRecord } from "../types";
import { buildContent, titleOf } from "./snapshot";
import type {
  ContentJson,
  GeneratedDocument,
  GeneratedDocumentStatus,
  GeneratedDocumentType,
  InternalDocumentType,
} from "./types";

// 生成文書の保存。案件のストアとは独立させ、接続情報の有無で保存先だけを切り替える。

const KEY = "visa-case-app:generated-documents:v1";
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
  reviewed_at: string | null;
  reviewed_by_name: string | null;
}

function fromRow(r: Row): GeneratedDocument {
  return {
    id: r.id,
    caseId: r.case_id,
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

function sorted(list: GeneratedDocument[]): GeneratedDocument[] {
  return [...list].sort(
    (a, b) => a.documentType.localeCompare(b.documentType) || b.version - a.version,
  );
}

function readLocal(): GeneratedDocument[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GeneratedDocument[]) : [];
  } catch {
    return [];
  }
}
function writeLocal(all: GeneratedDocument[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
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
    if (isSupabaseEnabled) {
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

/** 選択した種類の文書を、現在の案件情報から新しい版として生成する。上書きはしない */
export async function generateDocuments(record: CaseRecord, types: InternalDocumentType[]): Promise<void> {
  const created: GeneratedDocument[] = [];
  for (const type of types) {
    const content = buildContent(record, type);
    const title = titleOf(record, type);
    let doc: GeneratedDocument;
    if (isSupabaseEnabled) {
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
    logAudit(record.id, "document_generated", { type, version: doc.version });
  }
  byCase = { ...byCase, [record.id]: sorted([...(byCase[record.id] ?? []), ...created]) };
  emit();
}

/** 状態を変更する。内容（content_json）は変更しない */
export async function changeStatus(
  doc: GeneratedDocument,
  status: GeneratedDocumentStatus,
  reviewerName: string,
): Promise<void> {
  const reviewing = status === "reviewed";
  let next: GeneratedDocument;
  if (isSupabaseEnabled) {
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
