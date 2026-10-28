import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BarChart, LineChart, PfcBand } from '../../components/charts';
import { Card, SectionTitle } from '../../components/ui';
import { computeStreak, generateAdvice, type DaySummary } from '../../lib/advice';
import { formatShortDate, lastNDays } from '../../lib/dates';
import { mealTotals, pfcRatio } from '../../lib/nutrition';
import { useAppStore } from '../../lib/store';
import { usePalette } from '../../lib/theme';

export default function AnalyticsScreen() {
  const palette = usePalette();
  const profile = useAppStore((s) => s.profile);
  const meals = useAppStore((s) => s.meals);
  const weights = useAppStore((s) => s.weights);
  const kcalGoal = profile?.kcalGoalOverride ?? profile?.recommendedKcal ?? 2000;

  const daySummaries = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const m of meals) {
      const cur = map.get(m.date) ?? { date: m.date, totals: { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 }, mealCount: 0 };
      const t = mealTotals(m);
      cur.totals = { kcal: cur.totals.kcal + t.kcal, protein: cur.totals.protein + t.protein, fat: cur.totals.fat + t.fat, carbs: cur.totals.carbs + t.carbs, fiber: cur.totals.fiber + t.fiber, salt: cur.totals.salt + t.salt };
      cur.mealCount += 1;
      map.set(m.date, cur);
    }
    return map;
  }, [meals]);

  const build = (days: number): DaySummary[] =>
    lastNDays(days).map((key) => daySummaries.get(key) ?? { date: key, totals: { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 }, mealCount: 0 });

  const week = build(7);
  const month = build(30);
  const recordedWeek = week.filter((d) => d.mealCount > 0);
  const weeklyAvg = recordedWeek.length ? Math.round(recordedWeek.reduce((s, d) => s + d.totals.kcal, 0) / recordedWeek.length) : 0;
  const goalDays = week.filter((d) => d.mealCount > 0 && d.totals.kcal <= kcalGoal).length;
  const streak = computeStreak(new Set(meals.map((m) => m.date)));

  const weekTotals = recordedWeek.reduce((acc, d) => ({
    kcal: acc.kcal + d.totals.kcal, protein: acc.protein + d.totals.protein, fat: acc.fat + d.totals.fat,
    carbs: acc.carbs + d.totals.carbs, fiber: acc.fiber + d.totals.fiber, salt: acc.salt + d.totals.salt,
  }), { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 });
  const ratio = pfcRatio(weekTotals);

  const weightTrend = weights.length >= 2 ? Math.round((weights[weights.length - 1].weightKg - weights[0].weightKg) * 10) / 10 : null;
  const advice = generateAdvice({ days: week, kcalGoal, weightTrendKg: weightTrend, streakDays: streak });

  const label = (key: string) => formatShortDate(key).replace(/（.）/, '');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: palette.text, marginTop: 8 }}>分析</Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: palette.text }}>{weeklyAvg}</Text>
          <Text style={{ fontSize: 11, color: palette.subText, textAlign: 'center' }}>週間平均 kcal/日</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: palette.text }}>{goalDays}日</Text>
          <Text style={{ fontSize: 11, color: palette.subText, textAlign: 'center' }}>目標達成（直近7日）</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: palette.text }}>{streak}日</Text>
          <Text style={{ fontSize: 11, color: palette.subText, textAlign: 'center' }}>連続記録</Text>
        </Card>
      </View>

      <Card>
        <SectionTitle>7日間の摂取カロリー</SectionTitle>
        <BarChart goalLine={kcalGoal} points={week.map((d) => ({ label: label(d.date), value: d.totals.kcal }))} />
        <Text style={{ fontSize: 11, color: palette.subText, marginTop: 4 }}>赤い棒は目標（{Math.round(kcalGoal)}kcal）を超過した日です</Text>
      </Card>

      <Card>
        <SectionTitle>30日間の摂取カロリー推移</SectionTitle>
        <LineChart goalLine={kcalGoal} unit="kcal" points={month.filter((_, i) => i % 3 === 0 || i === 29).map((d) => ({ label: label(d.date), value: d.mealCount ? d.totals.kcal : null }))} />
      </Card>

      <Card>
        <SectionTitle>PFCバランス（直近7日の合計）</SectionTitle>
        <PfcBand protein={ratio.protein} fat={ratio.fat} carbs={ratio.carbs} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontSize: 12, color: palette.protein, fontWeight: '600' }}>タンパク質 {Math.round(ratio.protein)}%</Text>
          <Text style={{ fontSize: 12, color: palette.fat, fontWeight: '600' }}>脂質 {Math.round(ratio.fat)}%</Text>
          <Text style={{ fontSize: 12, color: palette.carbs, fontWeight: '600' }}>炭水化物 {Math.round(ratio.carbs)}%</Text>
        </View>
      </Card>

      <Card>
        <SectionTitle>体重の推移</SectionTitle>
        {weights.length === 0 ? (
          <Text style={{ color: palette.subText, fontSize: 13 }}>体重の記録がまだありません。ホーム画面から記録できます。</Text>
        ) : (
          <LineChart unit="kg" points={weights.slice(-14).map((w) => ({ label: label(w.date), value: w.weightKg }))} />
        )}
        {profile && <Text style={{ fontSize: 12, color: palette.subText }}>目標体重: {profile.targetWeightKg} kg</Text>}
      </Card>

      <Card>
        <SectionTitle>アドバイス</SectionTitle>
        {advice.map((a, i) => (
          <Text key={i} style={{ fontSize: 13, color: palette.text, lineHeight: 20, marginBottom: 6 }}>・{a}</Text>
        ))}
        <Text style={{ fontSize: 11, color: palette.subText }}>※記録データに基づくルールベースの自動アドバイスです。医療的な助言ではありません。</Text>
      </Card>
    </ScrollView>
  );
}
