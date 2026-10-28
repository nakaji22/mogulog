/** 現在時刻のタイムスタンプ（ms）。イベントハンドラ等での時刻取得をここに集約する */
export function currentTimestamp(): number {
  return Date.now();
}

/** 日付キーは端末ローカル日付の YYYY-MM-DD 形式で統一する */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, delta: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

/** 直近n日分（今日を含む、古い順） */
export function lastNDays(n: number, endKey: string = dateKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(endKey, i - (n - 1)));
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function formatJapaneseDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`;
}

export function formatShortDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

/** YYYY-MM の月キー */
export function monthKey(key: string): string {
  return key.slice(0, 7);
}

/** 指定月の日数 */
export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** 指定月の1日目の曜日（0=日曜） */
export function firstWeekdayOfMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).getDay();
}
