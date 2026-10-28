import type { ActivityLevel, GoalPurpose, Nutrients, Sex } from './types';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'ほぼ運動しない（デスクワーク中心）',
  light: '軽い運動（週1〜3回）',
  moderate: '中程度の運動（週3〜5回）',
  active: '激しい運動（週6〜7回）',
  very_active: '肉体労働・アスリートレベル',
};

export const PURPOSE_LABELS: Record<GoalPurpose, string> = {
  lose: '減量',
  maintain: '維持',
  gain: '増量',
};

/** Mifflin-St Jeor式による基礎代謝量（kcal/日） */
export function basalMetabolicRate(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function totalDailyEnergyExpenditure(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activity];
}

export interface Recommendation {
  kcal: number;
  /** 安全下限で切り上げられた場合 true */
  clampedToSafetyFloor: boolean;
  /** 週あたりの体重変化ペース推定（kg、正=増加） */
  weeklyChangeKg: number;
}

export const SAFETY_FLOOR_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

/**
 * 推奨摂取カロリーを算出する。
 * - 減量: TDEEの-15%（ただし最大でも-500kcalまで）
 * - 増量: TDEEの+10%
 * - 安全設計: 推奨値が性別ごとの下限（男性1500/女性1200kcal）を下回る場合は下限に切り上げる。
 *   極端なカロリー制限を自動推奨しないためのガード。
 */
export function recommendIntake(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  purpose: GoalPurpose;
}): Recommendation {
  const bmr = basalMetabolicRate(input.sex, input.weightKg, input.heightCm, input.age);
  const tdee = totalDailyEnergyExpenditure(bmr, input.activityLevel);
  let target = tdee;
  if (input.purpose === 'lose') target = Math.max(tdee * 0.85, tdee - 500);
  if (input.purpose === 'gain') target = tdee * 1.1;

  const floor = SAFETY_FLOOR_KCAL[input.sex];
  const clamped = target < floor;
  if (clamped) target = floor;

  const weeklyChangeKg = ((target - tdee) * 7) / 7700;
  return { kcal: Math.round(target), clampedToSafetyFloor: clamped, weeklyChangeKg: Math.round(weeklyChangeKg * 100) / 100 };
}

/** 目標カロリーからPFC目標（g）を算出する。一般的な配分 P:20% F:25% C:55%（減量時はP:25%） */
export function pfcGoals(kcalGoal: number, purpose: GoalPurpose): Nutrients {
  const pRatio = purpose === 'lose' ? 0.25 : 0.2;
  const fRatio = 0.25;
  const cRatio = 1 - pRatio - fRatio;
  return {
    kcal: kcalGoal,
    protein: (kcalGoal * pRatio) / 4,
    fat: (kcalGoal * fRatio) / 9,
    carbs: (kcalGoal * cRatio) / 4,
    fiber: 20,
    salt: 0,
  };
}
