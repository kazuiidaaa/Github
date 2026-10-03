"use client";

import { useEffect, useSyncExternalStore } from "react";
import { sanitizeAuditDetail, type AuditOutcome } from "./auditDetail";
import { messageOf } from "./errors";
import { usesSupabase } from "./supabase";
import { localKey } from "./demo";
import * as remote from "./supabaseBackend";
import { EMPTY_APPLICANT, EMPTY_EMPLOYMENT, type Applicant, type CaseRecord, type DocumentRecord } from "./types";

// 接続情報が設定されていれば Supabase、未設定ならブラウザ内の仮データを使う。
// 画面側は、どちらの場合も同じ関数・フックで読み書きする。

export const CASES_KEY = "visa-case-app:cases:v1";
const EMPTY: CaseRecord[] = [];

let cases: CaseRecord[] = EMPTY;
let loaded = false;
let loading: Promise<void> | null = null;
let error = "";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 旧形式（submitted）の記録を、状態（status）へ補正する */
function migrateStates(states: CaseRecord["requirementStates"] | undefined): CaseRecord["requirementStates"] {
  const out: CaseRecord["requirementStates"] = {};
  for (const [id, s] of Object.entries(states ?? {})) {
    const legacy = s as { submitted?: boolean };
    out[id] = { ...s, status: s.status ?? (legacy.submitted ? "received" : "not_received") };
  }
  return out;
}

type LegacyCase = Omit<CaseRecord, "workflowStatus" | "documents"> & {
  workflowStatus: string;
  documents: (Omit<DocumentRecord, "status"> & { status: string; extractions?: unknown })[];
};

function migrateLocal(c: LegacyCase): CaseRecord {
  const legacyApplicant = c.applicant as Omit<Applicant, "confirmationStatus"> & { confirmationStatus: string };
  return {
    ...c,
    workflowStatus: c.workflowStatus === "confirmed" || c.workflowStatus === "applicant_confirmed" ? "applicant_confirmed" : "preparing",
    applicant: {
      ...EMPTY_APPLICANT,
      ...legacyApplicant,
      confirmationStatus: legacyApplicant.confirmationStatus === "confirmed" ? "confirmed" : "draft",
    },
    employment: { ...EMPTY_EMPLOYMENT, ...c.employment },
    requirementStates: migrateStates(c.requirementStates),
    customRequirements: c.customRequirements ?? [],
    plannedApplicationDate: c.plannedApplicationDate ?? "",
    checkMemo: c.checkMemo ?? "",
    checks: c.checks ?? [],
    documents: c.documents.map((d) => {
      const rest = { ...d };
      delete rest.extractions; // OCR廃止前のデータに残る抽出結果は破棄する
      return { ...rest, status: "uploaded" as const };
    }),
  };
}

function readLocal(): CaseRecord[] {
  try {
    const raw = localStorage.getItem(localKey(CASES_KEY));
    if (!raw) return EMPTY;
    // 項目の追加・状態名の変更前に保存されたデータにも、現行の形式を補う
    return (JSON.parse(raw) as LegacyCase[]).map(migrateLocal);
  } catch {
    return EMPTY;
  }
}

function writeLocal(all: CaseRecord[]) {
  try {
    localStorage.setItem(localKey(CASES_KEY), JSON.stringify(all));
  } catch {
    // 容量超過時は添付画像を除いて保存する
    const slim = all.map((c) => ({
      ...c,
      documents: c.documents.map((d) => ({ ...d, dataUrl: undefined })),
    }));
    localStorage.setItem(localKey(CASES_KEY), JSON.stringify(slim));
  }
}

// Supabase への書き込みは、操作した順に1件ずつ実行する
let chain: Promise<void> = Promise.resolve();
function enqueue(task: () => Promise<void>) {
  chain = chain.then(task).catch((e) => {
    error = `保存に失敗しました：${messageOf(e)}`;
    emit();
  });
}

export function ensureLoaded(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (!loading) {
    loading = (async () => {
      try {
        cases = usesSupabase() ? await remote.loadAll() : readLocal();
        loaded = true;
        error = "";
      } catch (e) {
        error = `読み込みに失敗しました：${messageOf(e)}`;
      } finally {
        loading = null;
        emit();
      }
    })();
  }
  return loading;
}

/** ログアウト時に、メモリ上の案件データを破棄する */
export function resetStore() {
  cases = EMPTY;
  loaded = false;
  loading = null;
  error = "";
  remote.reset();
  emit();
}

export function useCases(): CaseRecord[] {
  useEffect(() => {
    void ensureLoaded();
  }, []);
  return useSyncExternalStore(subscribe, () => cases, () => EMPTY);
}

export function useStoreLoaded(): boolean {
  return useSyncExternalStore(subscribe, () => loaded, () => false);
}

export function useStoreError(): string {
  return useSyncExternalStore(subscribe, () => error, () => "");
}

export function useCase(id: string): CaseRecord | undefined {
  return useCases().find((c) => c.id === id);
}

export function saveCase(record: CaseRecord) {
  const exists = cases.some((c) => c.id === record.id);
  cases = exists ? cases.map((c) => (c.id === record.id ? record : c)) : [record, ...cases];
  if (usesSupabase()) enqueue(() => remote.persistCase(record));
  else writeLocal(cases);
  emit();
}

export function updateCase(id: string, fn: (c: CaseRecord) => CaseRecord) {
  const target = cases.find((c) => c.id === id);
  if (!target) return;
  saveCase({ ...fn(target), updatedAt: new Date().toISOString() });
}

/**
 * 案件と関連ファイルを削除する。削除に失敗した場合は案件を残し、false を返す。
 * 監査ログは案件への外部キーを持たないため、削除後も残る。
 */
export async function deleteCase(id: string): Promise<boolean> {
  if (!usesSupabase()) {
    cases = cases.filter((c) => c.id !== id);
    writeLocal(cases);
    emit();
    return true;
  }
  let done = false;
  // 直前までの保存が終わってから、操作した順に実行する
  chain = chain
    .then(async () => {
      try {
        await remote.deleteCase(id);
        cases = cases.filter((c) => c.id !== id);
        done = true;
        error = "";
      } catch (e) {
        error = `削除に失敗しました。案件は残っています：${messageOf(e)}`;
      }
      emit();
    })
    .catch(() => {});
  await chain;
  if (done) logAudit(id, "case_deleted");
  return done;
}

/** 誰がいつ何をしたかを記録する（Supabase 利用時のみ） */
// detail は sanitizeAuditDetail で、項目名・ID・列挙値のみに絞る（氏名・住所・メモ本文などを残さない）
export function logAudit(
  caseId: string | null,
  action: string,
  detail?: Record<string, unknown>,
  outcome: AuditOutcome = "success",
) {
  if (usesSupabase()) enqueue(() => remote.audit(caseId, action, sanitizeAuditDetail(detail), outcome));
}

/** 非公開ストレージへ保存し、保存先を返す。仮データ方式では何もしない。 */
export async function uploadDocumentFile(caseId: string, docId: string, file: File): Promise<string | undefined> {
  if (!usesSupabase()) return undefined;
  return remote.uploadFile(caseId, docId, file);
}

/** 確認者の表示名。仮データ方式ではログインがないため「自分」とする。 */
export async function getConfirmerName(): Promise<string> {
  if (!usesSupabase()) return "自分";
  return (await remote.currentUserEmail()) || "自分";
}

export const getAccount = remote.getAccount;
export const listAudit = remote.listAudit;

export async function renameOrganization(name: string): Promise<void> {
  await chain; // 直前の保存を待ってから実行する
  await remote.renameOrganization(name);
  logAudit(null, "organization_renamed");
}

export async function getDocumentSignedUrl(path: string): Promise<string> {
  return remote.signedUrl(path);
}

export function newId(): string {
  return crypto.randomUUID();
}
