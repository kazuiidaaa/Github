import { EMPTY_EMPLOYMENT, type EmploymentInfo } from "./types";

/**
 * 新規案件作成画面の入力内容の保護（Issue #155）。
 * - 「まとめて登録」の入力を sessionStorage に一時保存する（同じタブの再読み込みで復元。タブを閉じると消える）。
 * - 一時保存の対象は、グループ名・案件名・雇用・会社情報・手続種別・在留資格の選択のみ。
 *   案件メモ（自由記述）は、個人情報が書かれる可能性があるため、一時保存しない。
 * - sessionStorage が使えない場合（例外）でも、画面は動作する（保存・復元が行われないだけ）。
 */

export const NEW_CASE_DRAFT_KEY = "newCaseBulkDraft:v1";

export interface NewCaseDraft {
  procedureType: string;
  currentStatus: string;
  targetStatus: string;
  groupName: string;
  names: string[];
  employment: EmploymentInfo;
}

export const INITIAL_BULK_NAMES = ["", "", ""];

/** 入力が1項目でも変更されているか（案件メモ・1件ずつ登録の案件名を含む） */
export function isNewCaseDirty(v: {
  caseName: string;
  procedureType: string;
  currentStatus: string;
  targetStatus: string;
  memo: string;
  groupName: string;
  names: string[];
  employment: EmploymentInfo;
}): boolean {
  if (v.caseName || v.procedureType || v.currentStatus || v.targetStatus || v.memo || v.groupName) return true;
  if (v.names.length !== INITIAL_BULK_NAMES.length || v.names.some((n) => n !== "")) return true;
  return (Object.keys(EMPTY_EMPLOYMENT) as (keyof EmploymentInfo)[]).some((k) => v.employment[k] !== EMPTY_EMPLOYMENT[k]);
}

/** 一時保存するに値する入力があるか（メモ・1件ずつ登録の案件名は対象外） */
export function hasDraftContent(d: NewCaseDraft): boolean {
  return isNewCaseDirty({ ...d, caseName: "", memo: "" });
}

function getStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" || !sessionStorage ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function saveNewCaseDraft(draft: NewCaseDraft): void {
  try {
    getStorage()?.setItem(NEW_CASE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // 保存できなくても、画面の動作は妨げない
  }
}

export function clearNewCaseDraft(): void {
  try {
    getStorage()?.removeItem(NEW_CASE_DRAFT_KEY);
  } catch {
    // 同上
  }
}

/** 保存された入力を読む。無い・壊れている・読めない場合は null */
export function loadNewCaseDraft(): NewCaseDraft | null {
  try {
    const raw = getStorage()?.getItem(NEW_CASE_DRAFT_KEY);
    if (!raw) return null;
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    const str = (x: unknown) => (typeof x === "string" ? x : "");
    const names = Array.isArray(o.names) && o.names.length > 0 ? o.names.map(str) : [...INITIAL_BULK_NAMES];
    const employment: EmploymentInfo = { ...EMPTY_EMPLOYMENT };
    const e = o.employment && typeof o.employment === "object" ? (o.employment as Record<string, unknown>) : {};
    const target = employment as unknown as Record<string, string | boolean>;
    for (const k of Object.keys(EMPTY_EMPLOYMENT) as (keyof EmploymentInfo)[]) {
      if (typeof EMPTY_EMPLOYMENT[k] === "boolean") target[k] = e[k] === true;
      else if (typeof e[k] === "string") target[k] = e[k] as string;
    }
    const draft: NewCaseDraft = {
      procedureType: str(o.procedureType),
      currentStatus: str(o.currentStatus),
      targetStatus: str(o.targetStatus),
      groupName: str(o.groupName),
      names,
      employment,
    };
    return hasDraftContent(draft) ? draft : null;
  } catch {
    return null;
  }
}
