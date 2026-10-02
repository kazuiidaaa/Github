"use client";

import { useSyncExternalStore } from "react";
import type { CaseRecord } from "./types";

const KEY = "visa-case-app:cases:v1";
const EMPTY: CaseRecord[] = [];

let cache: { raw: string | null; value: CaseRecord[] } | null = null;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): CaseRecord[] {
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.value;
  let value = EMPTY;
  if (raw) {
    try {
      value = JSON.parse(raw) as CaseRecord[];
    } catch {
      value = EMPTY;
    }
  }
  cache = { raw, value };
  return value;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(cases: CaseRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cases));
  } catch {
    // 容量超過時は添付画像を除いて保存する
    const slim = cases.map((c) => ({
      ...c,
      documents: c.documents.map((d) => ({ ...d, dataUrl: undefined })),
    }));
    localStorage.setItem(KEY, JSON.stringify(slim));
  }
  listeners.forEach((l) => l());
}

export function useCases(): CaseRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function useCase(id: string): CaseRecord | undefined {
  return useCases().find((c) => c.id === id);
}

export function saveCase(record: CaseRecord) {
  const all = getSnapshot();
  const exists = all.some((c) => c.id === record.id);
  write(exists ? all.map((c) => (c.id === record.id ? record : c)) : [record, ...all]);
}

export function updateCase(id: string, fn: (c: CaseRecord) => CaseRecord) {
  const target = getSnapshot().find((c) => c.id === id);
  if (!target) return;
  saveCase({ ...fn(target), updatedAt: new Date().toISOString() });
}

export function deleteCase(id: string) {
  write(getSnapshot().filter((c) => c.id !== id));
}

export function newId(): string {
  return crypto.randomUUID();
}
