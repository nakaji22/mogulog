import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { basalMetabolicRate, pfcGoals, recommendIntake, SAFETY_FLOOR_KCAL } from '../targets';

describe('basalMetabolicRate (Mifflin-St Jeor)', () => {
  test('既知の値と一致する', () => {
    // 男性 70kg 170cm 30歳: 10*70 + 6.25*170 - 5*30 + 5 = 1617.5
    assert.equal(basalMetabolicRate('male', 70, 170, 30), 1617.5);
    // 女性 55kg 160cm 30歳: 550 + 1000 - 150 - 161 = 1239
    assert.equal(basalMetabolicRate('female', 55, 160, 30), 1239);
  });
});

describe('recommendIntake の安全設計', () => {
  test('極端に低い推奨値を出さない（女性の下限1200kcal）', () => {
    const rec = recommendIntake({ sex: 'female', weightKg: 40, heightCm: 145, age: 60, activityLevel: 'sedentary', purpose: 'lose' });
    assert.ok(rec.kcal >= SAFETY_FLOOR_KCAL.female, `actual ${rec.kcal}`);
    assert.equal(rec.clampedToSafetyFloor, true);
  });
  test('減量でも切り下げは最大500kcalまで', () => {
    const rec = recommendIntake({ sex: 'male', weightKg: 120, heightCm: 180, age: 35, activityLevel: 'very_active', purpose: 'lose' });
    const bmr = basalMetabolicRate('male', 120, 180, 35);
    const tdee = bmr * 1.9;
    assert.ok(tdee - rec.kcal <= 500.5, `diff ${tdee - rec.kcal}`);
  });
  test('維持目的ではTDEEとほぼ一致する', () => {
    const rec = recommendIntake({ sex: 'male', weightKg: 70, heightCm: 170, age: 30, activityLevel: 'moderate', purpose: 'maintain' });
    const tdee = basalMetabolicRate('male', 70, 170, 30) * 1.55;
    assert.ok(Math.abs(rec.kcal - tdee) <= 1);
  });
});

describe('pfcGoals', () => {
  test('PFCのカロリー合計が目標とほぼ一致する', () => {
    const goals = pfcGoals(2000, 'maintain');
    const kcal = goals.protein * 4 + goals.fat * 9 + goals.carbs * 4;
    assert.ok(Math.abs(kcal - 2000) < 1);
  });
});
