import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Chip, SectionTitle } from '../../components/ui';
import { dateKey, daysInMonth, firstWeekdayOfMonth, formatShortDate, lastNDays, monthKey } from '../../lib/dates';
import { mealTotals, roundNutrients } from '../../lib/nutrition';
import { useAppStore } from '../../lib/store';
import { usePalette } from '../../lib/theme';
import { MEAL_TYPE_LABELS } from '../../lib/types';

export default function HistoryScreen() {
  const palette = usePalette();
  const router = useRouter();
  const meals = useAppStore((s) => s.meals);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const [month, setMonth] = useState(monthKey(dateKey()));
  const [range, setRange] = useState<'day' | 'week' | 'month'>('day');

  const kcalByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of meals) {
      map.set(m.date, (map.get(m.date) ?? 0) + mealTotals(m).kcal);
    }
    return map;
  }, [meals]);

  const dayMeals = meals.filter((m) => m.date === selectedDate);
  const dayTotals = roundNutrients(dayMeals.reduce((acc, m) => {
    const t = mealTotals(m);
    return { kcal: acc.kcal + t.kcal, protein: acc.protein + t.protein, fat: acc.fat + t.fat, carbs: acc.carbs + t.carbs, fiber: acc.fiber + t.fiber, salt: acc.salt + t.salt };
  }, { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 }));

  const rangeStats = useMemo(() => {
    if (range === 'day') return null;
    const keys = range === 'week' ? lastNDays(7) : [...meals.map((m) => m.date)].filter((d) => monthKey(d) === monthKey(dateKey()));
    const uniq = [...new Set(keys)];
    const recorded = uniq.filter((k) => (kcalByDate.get(k) ?? 0) > 0);
    const total = recorded.reduce((s, k) => s + (kcalByDate.get(k) ?? 0), 0);
    return { days: recorded.length, avg: recorded.length ? Math.round(total / recorded.length) : 0, total: Math.round(total) };
  }, [range, kcalByDate, meals]);

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekdayOfMonth(month); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth(month); d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: palette.text, marginTop: 8 }}>記録</Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="日別" selected={range === 'day'} onPress={() => setRange('day')} />
        <Chip label="週別" selected={range === 'week'} onPress={() => setRange('week')} />
        <Chip label="月別" selected={range === 'month'} onPress={() => setRange('month')} />
      </View>
      {rangeStats && (
        <Card>
          <Text style={{ color: palette.text, fontSize: 14 }}>
            {range === 'week' ? '直近7日' : '今月'}: 記録 {rangeStats.days}日 ・ 合計 {rangeStats.total} kcal ・ 1日平均 {rangeStats.avg} kcal
          </Text>
        </Card>
      )}

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="前月" onPress={() => changeMonth(-1)} hitSlop={10}><Text style={{ fontSize: 20, color: palette.subText }}>‹</Text></Pressable>
          <Text style={{ fontSize: 15, fontWeight: '700', color: palette.text }}>{month.replace('-', '年')}月</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="翌月" onPress={() => changeMonth(1)} hitSlop={10}><Text style={{ fontSize: 20, color: palette.subText }}>›</Text></Pressable>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {['日', '月', '火', '水', '木', '金', '土'].map((w) => (
            <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: palette.subText }}>{w}</Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((key, i) => {
            if (!key) return <View key={`e-${i}`} style={{ width: '14.28%', aspectRatio: 0.85 }} />;
            const kcal = kcalByDate.get(key);
            const selected = key === selectedDate;
            const isToday = key === dateKey();
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${formatShortDate(key)}${kcal ? ` ${Math.round(kcal)}キロカロリー` : ''}`}
                onPress={() => setSelectedDate(key)}
                style={{
                  width: '14.28%', aspectRatio: 0.85, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: selected ? palette.accentSoft : 'transparent',
                  borderRadius: 10, borderWidth: isToday ? 1 : 0, borderColor: palette.accent,
                }}>
                <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '400', color: palette.text }}>{Number(key.slice(8))}</Text>
                <Text style={{ fontSize: 8, color: palette.subText }}>{kcal ? Math.round(kcal) : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View>
        <SectionTitle>{formatShortDate(selectedDate)} の記録</SectionTitle>
        <Text style={{ color: palette.subText, fontSize: 13, marginBottom: 8 }}>
          合計 {dayTotals.kcal} kcal ・ P {dayTotals.protein}g / F {dayTotals.fat}g / C {dayTotals.carbs}g
        </Text>
        {dayMeals.length === 0 ? (
          <View>
            <Text style={{ color: palette.subText, fontSize: 13 }}>この日の記録はありません。</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/food-search', params: { date: selectedDate, mealType: 'lunch' } })}
              style={{ marginTop: 10, backgroundColor: palette.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>この日に食事を追加</Text>
            </Pressable>
          </View>
        ) : (
          dayMeals.map((meal) => (
            <Pressable
              key={meal.id}
              accessibilityRole="button"
              onPress={() => router.push(`/meal/${meal.id}`)}
              style={{ flexDirection: 'row', backgroundColor: palette.card, borderRadius: 14, padding: 10, marginBottom: 8, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: palette.border }}>
              {meal.photoUri ? (
                <Image source={{ uri: meal.photoUri }} style={{ width: 52, height: 52, borderRadius: 10 }} accessibilityLabel="食事の写真" />
              ) : (
                <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 22 }}>🍽️</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: palette.accent, fontWeight: '700' }}>{MEAL_TYPE_LABELS[meal.mealType]}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text }}>{meal.title}</Text>
                <Text style={{ fontSize: 12, color: palette.subText }}>{meal.items.length}品目</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: palette.text }}>{Math.round(mealTotals(meal).kcal)} kcal</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}
