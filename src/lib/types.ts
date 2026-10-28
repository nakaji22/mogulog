export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface Nutrients {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  salt: number;
}

export const EMPTY_NUTRIENTS: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 };

export interface MealItem {
  id?: number;
  foodId: string | null;
  name: string;
  grams: number;
  /** 何人分か（0.5 = 半人前） */
  servings: number;
  nutrients: Nutrients;
}

export interface Meal {
  id?: number;
  /** YYYY-MM-DD */
  date: string;
  mealType: MealType;
  title: string;
  photoUri: string | null;
  note: string | null;
  source: 'photo' | 'manual' | 'template';
  items: MealItem[];
  createdAt: number;
}

export type Sex = 'male' | 'female';
export type GoalPurpose = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface Profile {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  purpose: GoalPurpose;
  /** 推奨摂取カロリー（自動算出値） */
  recommendedKcal: number;
  /** ユーザーが手動で上書きした目標カロリー。nullなら推奨値を使う */
  kcalGoalOverride: number | null;
  createdAt: number;
}

export interface WeightRecord {
  date: string;
  weightKg: number;
}
