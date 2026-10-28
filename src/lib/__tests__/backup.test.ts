import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildBackup, mealsToCsv, parseBackup, serializeBackup } from '../backup';
import { computeStreak } from '../advice';
import type { Meal } from '../types';

const sampleMeal: Meal = {
  date: '2026-10-28',
  mealType: 'lunch',
  title: 'カレー, 特盛',
  photoUri: null,
  note: null,
  source: 'manual',
  items: [{ foodId: 'rice', name: 'ご飯（白米）', grams: 250, servings: 1, nutrients: { kcal: 390, protein: 6.3, fat: 0.8, carbs: 92.8, fiber: 0.8, salt: 0 } }],
  createdAt: 1,
};

describe('mealsToCsv', () => {
  test('ヘッダーとデータ行が出力される', () => {
    const csv = mealsToCsv([sampleMeal]);
    const lines = csv.split('\n');
    assert.equal(lines.length, 2);
    assert.ok(lines[0].startsWith('日付,区分'));
  });
  test('カンマを含むタイトルはクォートされる', () => {
    const csv = mealsToCsv([sampleMeal]);
    assert.ok(csv.includes('"カレー, 特盛"'));
  });
});

describe('バックアップの往復', () => {
  test('serialize → parse で同じ内容に戻る', () => {
    const backup = buildBackup(null, [sampleMeal], [{ date: '2026-10-28', weightKg: 55 }]);
    const parsed = parseBackup(serializeBackup(backup));
    assert.equal(parsed.meals.length, 1);
    assert.equal(parsed.weights[0].weightKg, 55);
  });
  test('不正な形式は例外になる', () => {
    assert.throws(() => parseBackup('not json'));
    assert.throws(() => parseBackup('{"app":"other","version":1,"meals":[],"weights":[]}'));
  });
});

describe('computeStreak', () => {
  test('連続日数を数える', () => {
    const dates = new Set(['2026-10-28', '2026-10-27', '2026-10-26', '2026-10-24']);
    assert.equal(computeStreak(dates, '2026-10-28'), 3);
  });
  test('今日未記録でも昨日まで連続していれば数える', () => {
    const dates = new Set(['2026-10-27', '2026-10-26']);
    assert.equal(computeStreak(dates, '2026-10-28'), 2);
  });
  test('記録がなければ0', () => {
    assert.equal(computeStreak(new Set(), '2026-10-28'), 0);
  });
});
