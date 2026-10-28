import { create } from 'zustand';
import * as db from './db';
import { dateKey } from './dates';
import type { Meal, MealItem, Profile, WeightRecord } from './types';

interface AppState {
  ready: boolean;
  error: string | null;
  profile: Profile | null;
  meals: Meal[];
  weights: WeightRecord[];
  selectedDate: string;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  saveProfile: (profile: Profile) => Promise<void>;
  addMeal: (meal: Meal) => Promise<number>;
  updateMeal: (meal: Meal & { id: number }) => Promise<void>;
  removeMeal: (id: number) => Promise<void>;
  setWeight: (date: string, weightKg: number) => Promise<void>;
  removeWeight: (date: string) => Promise<void>;
  restoreBackup: (data: { profile: Profile | null; meals: Meal[]; weights: WeightRecord[] }) => Promise<void>;
  wipeAll: () => Promise<void>;
  /** 画面間で編集中の食事へ食品を渡すための一時キュー */
  pendingItems: MealItem[];
  queuePendingItem: (item: MealItem) => void;
  takePendingItems: () => MealItem[];
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  profile: null,
  meals: [],
  weights: [],
  selectedDate: dateKey(),

  bootstrap: async () => {
    try {
      const [profile, meals, weights] = await Promise.all([db.loadProfile(), db.listAllMeals(), db.listWeights()]);
      set({ profile, meals, weights, ready: true, error: null });
    } catch (e) {
      set({ ready: true, error: e instanceof Error ? e.message : 'データの読み込みに失敗しました' });
    }
  },

  refresh: async () => {
    const [profile, meals, weights] = await Promise.all([db.loadProfile(), db.listAllMeals(), db.listWeights()]);
    set({ profile, meals, weights });
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  saveProfile: async (profile) => {
    await db.saveProfile(profile);
    set({ profile });
  },

  addMeal: async (meal) => {
    const id = await db.insertMeal(meal);
    await get().refresh();
    return id;
  },

  updateMeal: async (meal) => {
    await db.updateMeal(meal);
    await get().refresh();
  },

  removeMeal: async (id) => {
    await db.deleteMeal(id);
    await get().refresh();
  },

  setWeight: async (date, weightKg) => {
    await db.upsertWeight(date, weightKg);
    await get().refresh();
  },

  removeWeight: async (date) => {
    await db.deleteWeight(date);
    await get().refresh();
  },

  restoreBackup: async (data) => {
    await db.replaceAllData(data);
    await get().refresh();
  },

  wipeAll: async () => {
    await db.deleteAllData();
    set({ profile: null, meals: [], weights: [] });
  },

  pendingItems: [],
  queuePendingItem: (item) => set((s) => ({ pendingItems: [...s.pendingItems, item] })),
  takePendingItems: () => {
    const items = get().pendingItems;
    if (items.length > 0) set({ pendingItems: [] });
    return items;
  },
}));

/** 指定日の食事一覧 */
export function mealsOnDate(meals: Meal[], date: string): Meal[] {
  return meals.filter((m) => m.date === date);
}
