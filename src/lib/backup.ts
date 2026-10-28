import { MEAL_TYPES, type Meal, type Profile, type WeightRecord } from './types';

export interface BackupData {
  app: 'mogulog';
  version: 1;
  exportedAt: string;
  profile: Profile | null;
  meals: Meal[];
  weights: WeightRecord[];
}

export function buildBackup(profile: Profile | null, meals: Meal[], weights: WeightRecord[]): BackupData {
  return { app: 'mogulog', version: 1, exportedAt: new Date().toISOString(), profile, meals, weights };
}

export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2);
}

/** 復元データの検証。不正な形式なら例外を投げる（呼び出し側でユーザーに表示する） */
export function parseBackup(json: string): BackupData {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('バックアップファイルを読み取れませんでした（JSON形式ではありません）。');
  }
  const data = raw as Partial<BackupData>;
  if (data.app !== 'mogulog' || data.version !== 1 || !Array.isArray(data.meals) || !Array.isArray(data.weights)) {
    throw new Error('もぐログのバックアップ形式ではありません。');
  }
  for (const meal of data.meals as Meal[]) {
    if (typeof meal.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(meal.date) || !MEAL_TYPES.includes(meal.mealType) || !Array.isArray(meal.items)) {
      throw new Error('バックアップ内の食事データが不正です。');
    }
  }
  return data as BackupData;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function mealsToCsv(meals: Meal[]): string {
  const header = ['日付', '区分', '食事名', '品目', '重量g', '人前', 'kcal', 'タンパク質g', '脂質g', '炭水化物g', '食物繊維g', '塩分g'];
  const lines = [header.join(',')];
  const sorted = [...meals].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  for (const meal of sorted) {
    for (const item of meal.items) {
      lines.push(
        [
          meal.date, meal.mealType, meal.title, item.name, item.grams, item.servings,
          Math.round(item.nutrients.kcal), round1(item.nutrients.protein), round1(item.nutrients.fat),
          round1(item.nutrients.carbs), round1(item.nutrients.fiber), round1(item.nutrients.salt),
        ].map(csvCell).join(','),
      );
    }
  }
  return lines.join('\n');
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
