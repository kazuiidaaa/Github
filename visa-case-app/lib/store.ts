"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isSupabaseEnabled } from "./supabase";
import * as remote from "./supabaseBackend";
import { EMPTY_EMPLOYMENT, type CaseRecord } from "./types";

// 接続情報が設定されていれば Supabase、未設定ならブラウザ内の仮データを使う。
// 画面側は、どちらの場合も同じ関数・フックで読み書きする。

const KEY = "visa-case-app:cases:v1";
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

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : "不明なエラーが発生しました。";
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

function readLocal(): CaseRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    // 雇用・必要書類の追加前に保存されたデータにも、既定値を補う
    return (JSON.parse(raw) as CaseRecord[]).map((c) => ({
      ...c,
      employment: { ...EMPTY_EMPLOYMENT, ...c.employment },
      requirementStates: migrateStates(c.requirementStates),
      customRequirements: c.customRequirements ?? [],
    }));
  } catch {
    return EMPTY;
  }
}

function writeLocal(all: CaseRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // 容量超過時は添付画像を除いて保存する
    const slim = all.map((c) => ({
      ...c,
      documents: c.documents.map((d) => ({ ...d, dataUrl: undefined })),
    }));
    localStorage.setItem(KEY, JSON.stringify(slim));
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
        cases = isSupabaseEnabled ? await remote.loadAll() : readLocal();
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
  if (isSupabaseEnabled) enqueue(() => remote.persistCase(record));
  else writeLocal(cases);
  emit();
}

export function updateCase(id: string, fn: (c: CaseRecord) => CaseRecord) {
  const target = cases.find((c) => c.id === id);
  if (!target) return;
  saveCase({ ...fn(target), updatedAt: new Date().toISOString() });
}

export function deleteCase(id: string) {
  cases = cases.filter((c) => c.id !== id);
  if (isSupabaseEnabled) {
    enqueue(() => remote.deleteCase(id));
    logAudit(id, "case_deleted");
  } else writeLocal(cases);
  emit();
}

/** 誰がいつ何をしたかを記録する（Supabase 利用時のみ） */
export function logAudit(caseId: string | null, action: string, detail?: Record<string, unknown>) {
  if (isSupabaseEnabled) enqueue(() => remote.audit(caseId, action, detail));
}

/** 非公開ストレージへ保存し、保存先を返す。仮データ方式では何もしない。 */
export async function uploadDocumentFile(caseId: string, docId: string, file: File): Promise<string | undefined> {
  if (!isSupabaseEnabled) return undefined;
  return remote.uploadFile(caseId, docId, file);
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
