import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BarMeter, RingProgress } from '../../components/charts';
import { Card, SectionTitle } from '../../components/ui';
import { addDays, dateKey, formatJapaneseDate } from '../../lib/dates';
import { mealTotals, roundNutrients } from '../../lib/nutrition';
import { mealsOnDate, useAppStore } from '../../lib/store';
import { pfcGoals } from '../../lib/targets';
import { usePalette } from '../../lib/theme';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type Meal } from '../../lib/types';

export default function HomeScreen() {
  const palette = usePalette();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const meals = useAppStore((s) => s.meals);
  const weights = useAppStore((s) => s.weights);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);

  const today = dateKey();
  const dayMeals = mealsOnDate(meals, selectedDate);
  const totals = roundNutrients(
    dayMeals.reduce((acc, m) => {
      const t = mealTotals(m);
      return { kcal: acc.kcal + t.kcal, protein: acc.protein + t.protein, fat: acc.fat + t.fat, carbs: acc.carbs + t.carbs, fiber: acc.fiber + t.fiber, salt: acc.salt + t.salt };
    }, { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 }),
  );

  const kcalGoal = profile?.kcalGoalOverride ?? profile?.recommendedKcal ?? 2000;
  const goals = pfcGoals(kcalGoal, profile?.purpose ?? 'maintain');
  const remaining = Math.round(kcalGoal - totals.kcal);
  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="前日へ" onPress={() => setSelectedDate(addDays(selectedDate, -1))} hitSlop={10}>
          <Text style={{ fontSize: 22, color: palette.subText }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: palette.text }}>
          {selectedDate === today ? '今日' : ''} {formatJapaneseDate(selectedDate)}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="翌日へ" onPress={() => setSelectedDate(addDays(selectedDate, 1))} hitSlop={10}>
          <Text style={{ fontSize: 22, color: palette.subText }}>›</Text>
        </Pressable>
      </View>

      <Card style={{ alignItems: 'center' }}>
        <RingProgress
          value={totals.kcal}
          goal={kcalGoal}
          centerLabel={remaining >= 0 ? String(remaining) : `+${Math.abs(remaining)}`}
          subLabel={remaining >= 0 ? 'あと kcal' : '超過 kcal'}
        />
        <Text style={{ color: palette.subText, fontSize: 13, marginTop: 4 }}>
          摂取 {totals.kcal} kcal / 目標 {Math.round(kcalGoal)} kcal
        </Text>
        <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
          <BarMeter label="タンパク質" value={totals.protein} goal={goals.protein} unit="g" color={palette.protein} />
          <BarMeter label="脂質" value={totals.fat} goal={goals.fat} unit="g" color={palette.fat} />
          <BarMeter label="炭水化物" value={totals.carbs} goal={goals.carbs} unit="g" color={palette.carbs} />
        </View>
        <Text style={{ color: palette.subText, fontSize: 11, marginTop: 6 }}>
          食物繊維 {totals.fiber}g ・ 塩分 {totals.salt}g ※いずれも推定値です
        </Text>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/camera'); }}
        style={{ backgroundColor: palette.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>📷 写真で食事を記録</Text>
      </Pressable>

      {MEAL_TYPES.map((type) => {
        const list = dayMeals.filter((m) => m.mealType === type);
        return (
          <View key={type}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionTitle>{MEAL_TYPE_LABELS[type]}</SectionTitle>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${MEAL_TYPE_LABELS[type]}を追加`}
                onPress={() => router.push({ pathname: '/food-search', params: { date: selectedDate, mealType: type } })}>
                <Text style={{ color: palette.accent, fontSize: 20, fontWeight: '700' }}>＋</Text>
              </Pressable>
            </View>
            {list.length === 0 ? (
              <Text style={{ color: palette.subText, fontSize: 13, marginBottom: 4 }}>記録なし</Text>
            ) : (
              list.map((meal) => <MealRow key={meal.id} meal={meal} onPress={() => router.push(`/meal/${meal.id}`)} />)
            )}
          </View>
        );
      })}

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <SectionTitle>体重</SectionTitle>
            <Text style={{ color: palette.text, fontSize: 15 }}>
              {latestWeight ? `${latestWeight.weightKg} kg（${latestWeight.date}）` : 'まだ記録がありません'}
            </Text>
            {profile && <Text style={{ color: palette.subText, fontSize: 12 }}>目標 {profile.targetWeightKg} kg</Text>}
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/weight')} style={{ backgroundColor: palette.accentSoft, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }}>
            <Text style={{ color: palette.accentDark, fontWeight: '700', fontSize: 13 }}>記録する</Text>
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}

function MealRow({ meal, onPress }: { meal: Meal; onPress: () => void }) {
  const palette = usePalette();
  const totals = roundNutrients(mealTotals(meal));
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ flexDirection: 'row', backgroundColor: palette.card, borderRadius: 14, padding: 10, marginBottom: 8, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: palette.border }}>
      {meal.photoUri ? (
        <Image source={{ uri: meal.photoUri }} style={{ width: 52, height: 52, borderRadius: 10 }} accessibilityLabel="食事の写真" />
      ) : (
        <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>🍽️</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text }}>{meal.title}</Text>
        <Text style={{ fontSize: 12, color: palette.subText }}>
          {meal.items.map((i) => i.name).slice(0, 3).join('、')}{meal.items.length > 3 ? ' ほか' : ''}
        </Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: '700', color: palette.text }}>{totals.kcal} kcal</Text>
    </Pressable>
  );
}
