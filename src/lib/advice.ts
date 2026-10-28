import { addDays, dateKey, lastNDays } from './dates';
import { pfcRatio } from './nutrition';
import type { Nutrients } from './types';

export interface DaySummary {
  date: string;
  totals: Nutrients;
  mealCount: number;
}

export interface AdviceContext {
  days: DaySummary[]; // 直近7日（今日含む、古い順）
  kcalGoal: number;
  weightTrendKg: number | null; // 直近の体重変化（最初の記録との差）
  streakDays: number;
}

/** 連続記録日数（今日から遡って食事記録がある日数） */
export function computeStreak(datesWithMeals: Set<string>, today: string = dateKey()): number {
  let streak = 0;
  let cursor = today;
  // 今日まだ記録が無い場合は昨日から数える（継続を途切れ扱いしない）
  if (!datesWithMeals.has(cursor)) cursor = addDays(cursor, -1);
  while (datesWithMeals.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** ルールベースのアドバイス生成。外部LLMには依存しない。 */
export function generateAdvice(ctx: AdviceContext): string[] {
  const advice: string[] = [];
  const recorded = ctx.days.filter((d) => d.mealCount > 0);
  if (recorded.length === 0) {
    return ['まだ記録がありません。まずは今日の食事を1件記録してみましょう。写真からでも手入力でも記録できます。'];
  }

  const avgKcal = recorded.reduce((s, d) => s + d.totals.kcal, 0) / recorded.length;
  const diff = avgKcal - ctx.kcalGoal;
  if (Math.abs(diff) <= ctx.kcalGoal * 0.05) {
    advice.push(`直近の平均摂取カロリーは目標（${Math.round(ctx.kcalGoal)}kcal）とほぼ一致しています。この調子で続けましょう。`);
  } else if (diff > 0) {
    advice.push(`直近の平均摂取カロリーは目標より約${Math.round(diff)}kcal多めです。まずは間食や飲み物など、無理なく減らせる所から見直してみましょう。`);
  } else {
    advice.push(`直近の平均摂取カロリーは目標より約${Math.round(-diff)}kcal少なめです。極端な制限は続かないので、目標の範囲内できちんと食べることも大切です。`);
  }

  const totals = recorded.reduce<Nutrients>(
    (acc, d) => ({
      kcal: acc.kcal + d.totals.kcal,
      protein: acc.protein + d.totals.protein,
      fat: acc.fat + d.totals.fat,
      carbs: acc.carbs + d.totals.carbs,
      fiber: acc.fiber + d.totals.fiber,
      salt: acc.salt + d.totals.salt,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 },
  );
  const ratio = pfcRatio(totals);
  if (ratio.fat > 35) advice.push('脂質の割合が高めです。揚げ物を焼き物に変えるなど、調理法の工夫が効きます。');
  if (ratio.protein < 13) advice.push('たんぱく質の割合が低めです。卵・魚・大豆製品を1品足すとバランスが良くなります。');
  if (ratio.carbs > 65) advice.push('炭水化物の割合が高めです。主食の量はそのままに、主菜（たんぱく質）を増やすと整いやすいです。');

  const avgFiber = totals.fiber / recorded.length;
  if (avgFiber < 15) advice.push('食物繊維が不足気味です。野菜・きのこ・海藻を意識すると改善できます。');

  const avgSalt = totals.salt / recorded.length;
  if (avgSalt > 8) advice.push('塩分が多めの傾向です。汁物は具を中心に、麺のスープは残すだけでも塩分を抑えられます。');

  const missingMeals = ctx.days.filter((d) => d.mealCount > 0 && d.mealCount < 3).length;
  if (missingMeals >= 3) advice.push('1日1〜2食だけ記録されている日が目立ちます。間食も含めて記録すると傾向がつかみやすくなります。');

  if (ctx.streakDays >= 7) advice.push(`${ctx.streakDays}日連続で記録できています。記録の継続自体が一番の近道です。`);
  if (ctx.weightTrendKg !== null && Math.abs(ctx.weightTrendKg) >= 0.3) {
    advice.push(ctx.weightTrendKg < 0 ? '体重は緩やかに減少傾向です。急な変化でなければ順調なペースです。' : '体重は緩やかに増加傾向です。摂取量の平均と合わせて振り返ってみましょう。');
  }
  return advice.slice(0, 5);
}

export function summarizeRange(allDays: DaySummary[], days: number): DaySummary[] {
  const keys = new Set(lastNDays(days));
  return allDays.filter((d) => keys.has(d.date));
}
