import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { candidateSuggestionAnalyzer } from '../analyzer';
import { addDays, dateKey, daysInMonth, firstWeekdayOfMonth, lastNDays } from '../dates';
import { FOODS, searchFoods } from '../foods';
import { mealTotals } from '../nutrition';

describe('dates', () => {
  test('dateKeyはゼロ埋めされる', () => {
    assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
  });
  test('addDaysは月をまたぐ', () => {
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });
  test('lastNDaysは今日を含み古い順', () => {
    const days = lastNDays(7, '2026-10-28');
    assert.equal(days.length, 7);
    assert.equal(days[6], '2026-10-28');
    assert.equal(days[0], '2026-10-22');
  });
  test('カレンダー計算', () => {
    assert.equal(daysInMonth('2026-02'), 28);
    assert.equal(daysInMonth('2028-02'), 29);
    assert.ok(firstWeekdayOfMonth('2026-10') >= 0 && firstWeekdayOfMonth('2026-10') <= 6);
  });
});

describe('食品データベース', () => {
  test('100品目以上を収録する', () => {
    assert.ok(FOODS.length >= 100, `actual ${FOODS.length}`);
  });
  test('全品目の値が妥当な範囲', () => {
    for (const f of FOODS) {
      assert.ok(f.kcal >= 0 && f.kcal <= 1000, `${f.id} kcal ${f.kcal}`);
      assert.ok(f.protein >= 0 && f.fat >= 0 && f.carbs >= 0 && f.fiber >= 0 && f.salt >= 0, f.id);
      assert.ok(f.defaultGrams > 0, f.id);
    }
  });
  test('IDが一意', () => {
    assert.equal(new Set(FOODS.map((f) => f.id)).size, FOODS.length);
  });
  test('検索が名前と別名にヒットする', () => {
    assert.ok(searchFoods('唐揚げ').some((f) => f.id === 'karaage'));
    assert.ok(searchFoods('').length === FOODS.length);
  });
});

describe('candidateSuggestionAnalyzer', () => {
  test('候補は自動判定ではない（confidence は null）', async () => {
    const candidates = await candidateSuggestionAnalyzer.analyze({ photoUri: 'file:///x.jpg', mealType: 'lunch', recentFoodIds: [] });
    assert.ok(candidates.length > 0);
    for (const c of candidates) assert.equal(c.confidence, null);
  });
  test('候補の合計は品目の合計と一致する', async () => {
    const candidates = await candidateSuggestionAnalyzer.analyze({ photoUri: 'file:///x.jpg', mealType: 'dinner', recentFoodIds: [] });
    for (const c of candidates) {
      assert.deepEqual(c.totals, mealTotals({ items: c.items }));
    }
  });
  test('履歴の頻出食品が候補に入る', async () => {
    const candidates = await candidateSuggestionAnalyzer.analyze({ photoUri: 'file:///x.jpg', mealType: 'snack', recentFoodIds: ['banana', 'banana', 'apple'] });
    assert.ok(candidates.some((c) => c.id === 'history-banana'));
  });
});
