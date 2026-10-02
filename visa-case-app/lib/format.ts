export function daysUntil(date: string): number | null {
  if (!date) return null;
  const target = new Date(date + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatDate(date: string): string {
  return date ? date.replaceAll("-", "/") : "未入力";
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  // 2月30日のような、存在しない日付を除く
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** 端末の現地日付を YYYY-MM-DD で返す */
export function todayString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
