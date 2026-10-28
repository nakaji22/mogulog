import * as SQLite from 'expo-sqlite';
import type { Meal, MealItem, MealType, Nutrients, Profile, WeightRecord } from './types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('mogulog.db');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

const DATABASE_VERSION = 1;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      title TEXT NOT NULL,
      photo_uri TEXT,
      note TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
    CREATE TABLE IF NOT EXISTS meal_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      food_id TEXT,
      name TEXT NOT NULL,
      grams REAL NOT NULL,
      servings REAL NOT NULL DEFAULT 1,
      kcal REAL NOT NULL,
      protein REAL NOT NULL,
      fat REAL NOT NULL,
      carbs REAL NOT NULL,
      fiber REAL NOT NULL,
      salt REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_items_meal ON meal_items(meal_id);
    CREATE TABLE IF NOT EXISTS weights (
      date TEXT PRIMARY KEY,
      weight_kg REAL NOT NULL
    );
    PRAGMA user_version = ${DATABASE_VERSION};
  `);
}

// ---------- プロフィール ----------
export async function loadProfile(): Promise<Profile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ json: string }>('SELECT json FROM user_profile WHERE id = 1');
  return row ? (JSON.parse(row.json) as Profile) : null;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO user_profile (id, json) VALUES (1, ?)', JSON.stringify(profile));
}

// ---------- 食事 ----------
interface MealRow {
  id: number;
  date: string;
  meal_type: MealType;
  title: string;
  photo_uri: string | null;
  note: string | null;
  source: Meal['source'];
  created_at: number;
}
interface ItemRow {
  id: number;
  meal_id: number;
  food_id: string | null;
  name: string;
  grams: number;
  servings: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  salt: number;
}

function rowToItem(r: ItemRow): MealItem {
  const nutrients: Nutrients = { kcal: r.kcal, protein: r.protein, fat: r.fat, carbs: r.carbs, fiber: r.fiber, salt: r.salt };
  return { id: r.id, foodId: r.food_id, name: r.name, grams: r.grams, servings: r.servings, nutrients };
}

async function attachItems(db: SQLite.SQLiteDatabase, rows: MealRow[]): Promise<Meal[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const itemRows = await db.getAllAsync<ItemRow>(`SELECT * FROM meal_items WHERE meal_id IN (${placeholders}) ORDER BY id`, ids);
  const byMeal = new Map<number, MealItem[]>();
  for (const ir of itemRows) {
    const list = byMeal.get(ir.meal_id) ?? [];
    list.push(rowToItem(ir));
    byMeal.set(ir.meal_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    mealType: r.meal_type,
    title: r.title,
    photoUri: r.photo_uri,
    note: r.note,
    source: r.source,
    items: byMeal.get(r.id) ?? [],
    createdAt: r.created_at,
  }));
}

export async function listAllMeals(): Promise<Meal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MealRow>('SELECT * FROM meals ORDER BY date DESC, created_at DESC');
  return attachItems(db, rows);
}

export async function getMeal(id: number): Promise<Meal | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<MealRow>('SELECT * FROM meals WHERE id = ?', id);
  if (!row) return null;
  const [meal] = await attachItems(db, [row]);
  return meal ?? null;
}

async function insertItems(db: SQLite.SQLiteDatabase, mealId: number, items: MealItem[]): Promise<void> {
  for (const item of items) {
    await db.runAsync(
      'INSERT INTO meal_items (meal_id, food_id, name, grams, servings, kcal, protein, fat, carbs, fiber, salt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      mealId, item.foodId, item.name, item.grams, item.servings,
      item.nutrients.kcal, item.nutrients.protein, item.nutrients.fat, item.nutrients.carbs, item.nutrients.fiber, item.nutrients.salt,
    );
  }
}

export async function insertMeal(meal: Meal): Promise<number> {
  const db = await getDb();
  let newId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      'INSERT INTO meals (date, meal_type, title, photo_uri, note, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      meal.date, meal.mealType, meal.title, meal.photoUri, meal.note, meal.source, meal.createdAt,
    );
    newId = result.lastInsertRowId;
    await insertItems(db, newId, meal.items);
  });
  return newId;
}

export async function updateMeal(meal: Meal & { id: number }): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE meals SET date = ?, meal_type = ?, title = ?, photo_uri = ?, note = ? WHERE id = ?',
      meal.date, meal.mealType, meal.title, meal.photoUri, meal.note, meal.id,
    );
    await db.runAsync('DELETE FROM meal_items WHERE meal_id = ?', meal.id);
    await insertItems(db, meal.id, meal.items);
  });
}

export async function deleteMeal(id: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM meal_items WHERE meal_id = ?', id);
    await db.runAsync('DELETE FROM meals WHERE id = ?', id);
  });
}

// ---------- 体重 ----------
export async function listWeights(): Promise<WeightRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string; weight_kg: number }>('SELECT * FROM weights ORDER BY date ASC');
  return rows.map((r) => ({ date: r.date, weightKg: r.weight_kg }));
}

export async function upsertWeight(date: string, weightKg: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO weights (date, weight_kg) VALUES (?, ?)', date, weightKg);
}

export async function deleteWeight(date: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM weights WHERE date = ?', date);
}

// ---------- 一括操作（バックアップ/全削除） ----------
export async function replaceAllData(data: { profile: Profile | null; meals: Meal[]; weights: WeightRecord[] }): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM meal_items');
    await db.runAsync('DELETE FROM meals');
    await db.runAsync('DELETE FROM weights');
    await db.runAsync('DELETE FROM user_profile');
    if (data.profile) {
      await db.runAsync('INSERT INTO user_profile (id, json) VALUES (1, ?)', JSON.stringify(data.profile));
    }
    for (const w of data.weights) {
      await db.runAsync('INSERT INTO weights (date, weight_kg) VALUES (?, ?)', w.date, w.weightKg);
    }
    for (const meal of data.meals) {
      const result = await db.runAsync(
        'INSERT INTO meals (date, meal_type, title, photo_uri, note, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        meal.date, meal.mealType, meal.title, meal.photoUri, meal.note, meal.source, meal.createdAt,
      );
      await insertItems(db, result.lastInsertRowId, meal.items);
    }
  });
}

export async function deleteAllData(): Promise<void> {
  await replaceAllData({ profile: null, meals: [], weights: [] });
}
