import type { Food } from './foods';
import { EMPTY_NUTRIENTS, type Meal, type MealItem, type Nutrients } from './types';

/** 100gあたり値 × 実際の量(g) × 人前 から栄養素を計算 */
export function nutrientsFor(food: Pick<Food, 'kcal' | 'protein' | 'fat' | 'carbs' | 'fiber' | 'salt'>, grams: number, servings = 1): Nutrients {
  const ratio = (Math.max(0, grams) / 100) * Math.max(0, servings);
  return {
    kcal: food.kcal * ratio,
    protein: food.protein * ratio,
    fat: food.fat * ratio,
    carbs: food.carbs * ratio,
    fiber: food.fiber * ratio,
    salt: food.salt * ratio,
  };
}

export function makeItemFromFood(food: Food, grams: number = food.defaultGrams, servings = 1): MealItem {
  return {
    foodId: food.id,
    name: food.name,
    grams,
    servings,
    nutrients: nutrientsFor(food, grams, servings),
  };
}

/** 手入力アイテム（100g値が不明な単品） */
export function makeManualItem(name: string, grams: number, nutrients: Nutrients): MealItem {
  return { foodId: null, name, grams, servings: 1, nutrients: { ...nutrients } };
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  return list.reduce<Nutrients>(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      protein: acc.protein + n.protein,
      fat: acc.fat + n.fat,
      carbs: acc.carbs + n.carbs,
      fiber: acc.fiber + n.fiber,
      salt: acc.salt + n.salt,
    }),
    { ...EMPTY_NUTRIENTS },
  );
}

export function mealTotals(meal: Pick<Meal, 'items'>): Nutrients {
  return sumNutrients(meal.items.map((i) => i.nutrients));
}

/** 表示用の丸め（kcalは整数、その他は小数1桁） */
export function roundNutrients(n: Nutrients): Nutrients {
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    kcal: Math.round(n.kcal),
    protein: r1(n.protein),
    fat: r1(n.fat),
    carbs: r1(n.carbs),
    fiber: r1(n.fiber),
    salt: r1(n.salt),
  };
}

/** PFCのエネルギー比率（%）。たんぱく質4kcal/g, 脂質9kcal/g, 炭水化物4kcal/g */
export function pfcRatio(n: Nutrients): { protein: number; fat: number; carbs: number } {
  const p = n.protein * 4;
  const f = n.fat * 9;
  const c = n.carbs * 4;
  const total = p + f + c;
  if (total <= 0) return { protein: 0, fat: 0, carbs: 0 };
  return { protein: (p / total) * 100, fat: (f / total) * 100, carbs: (c / total) * 100 };
}
