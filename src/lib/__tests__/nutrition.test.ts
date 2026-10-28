import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getFoodById } from '../foods';
import { mealTotals, nutrientsFor, pfcRatio, roundNutrients, sumNutrients } from '../nutrition';
import { buildItemsFromTemplate, MEAL_TEMPLATES } from '../templates';

describe('nutrientsFor', () => {
  test('100gあたり値が量に比例する', () => {
    const rice = getFoodById('rice')!;
    const n = nutrientsFor(rice, 250);
    assert.equal(Math.round(n.kcal), 390); // 156 * 2.5
    assert.equal(n.protein, 6.25);
  });
  test('人前でスケールする', () => {
    const egg = getFoodById('egg')!;
    const half = nutrientsFor(egg, 50, 0.5);
    const full = nutrientsFor(egg, 50, 1);
    assert.equal(half.kcal, full.kcal / 2);
  });
  test('負の量は0として扱う', () => {
    const rice = getFoodById('rice')!;
    assert.equal(nutrientsFor(rice, -50).kcal, 0);
  });
});

describe('sumNutrients / mealTotals', () => {
  test('合計が一致する', () => {
    const total = sumNutrients([
      { kcal: 100, protein: 10, fat: 5, carbs: 20, fiber: 1, salt: 0.5 },
      { kcal: 50, protein: 5, fat: 2, carbs: 10, fiber: 2, salt: 0.2 },
    ]);
    assert.deepEqual(roundNutrients(total), { kcal: 150, protein: 15, fat: 7, carbs: 30, fiber: 3, salt: 0.7 });
  });
});

describe('pfcRatio', () => {
  test('比率の合計は100になる', () => {
    const r = pfcRatio({ kcal: 500, protein: 25, fat: 15, carbs: 60, fiber: 0, salt: 0 });
    assert.ok(Math.abs(r.protein + r.fat + r.carbs - 100) < 0.01);
  });
  test('空の栄養素では0を返す', () => {
    assert.deepEqual(pfcRatio({ kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 }), { protein: 0, fat: 0, carbs: 0 });
  });
});

describe('唐揚げ定食テンプレート', () => {
  test('仕様書の例（合計約892kcal）と大きく乖離しない', () => {
    const template = MEAL_TEMPLATES.find((t) => t.id === 'karaage-teishoku')!;
    const totals = mealTotals({ items: buildItemsFromTemplate(template) });
    assert.ok(totals.kcal > 800 && totals.kcal < 950, `actual ${totals.kcal}`);
    assert.equal(buildItemsFromTemplate(template).length, 4);
  });
});
