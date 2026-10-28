import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, GhostButton, SectionTitle } from '../components/ui';
import { currentTimestamp, dateKey } from '../lib/dates';
import { searchFoods } from '../lib/foods';
import { makeItemFromFood, makeManualItem, mealTotals } from '../lib/nutrition';
import { useAppStore } from '../lib/store';
import { buildItemsFromTemplate, searchTemplates } from '../lib/templates';
import { usePalette } from '../lib/theme';
import type { MealType } from '../lib/types';

export default function FoodSearchScreen() {
  const palette = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; mealType?: MealType; mealId?: string; addToDraft?: string }>();
  const addMeal = useAppStore((s) => s.addMeal);
  const updateMeal = useAppStore((s) => s.updateMeal);
  const meals = useAppStore((s) => s.meals);
  const queuePendingItem = useAppStore((s) => s.queuePendingItem);
  const [query, setQuery] = useState('');
  const [manual, setManual] = useState({ name: '', kcal: '', protein: '', fat: '', carbs: '', grams: '100' });
  const [busy, setBusy] = useState(false);

  const foods = useMemo(() => searchFoods(query), [query]);
  const templates = useMemo(() => searchTemplates(query), [query]);

  const finish = () => {
    if (params.mealId || params.addToDraft) router.back();
    else router.dismissTo('/');
  };

  const handleItem = async (item: ReturnType<typeof makeItemFromFood>, fallbackTitle: string) => {
    if (busy) return;
    setBusy(true);
    try {
      if (params.addToDraft) {
        queuePendingItem(item);
      } else if (params.mealId) {
        const meal = meals.find((m) => m.id === Number(params.mealId));
        if (meal?.id) await updateMeal({ ...meal, id: meal.id, items: [...meal.items, item] });
      } else {
        await addMeal({
          date: params.date ?? dateKey(),
          mealType: params.mealType ?? 'lunch',
          title: fallbackTitle,
          photoUri: null, note: null, source: 'manual', items: [item], createdAt: currentTimestamp(),
        });
      }
      finish();
    } catch {
      Alert.alert('追加に失敗しました', 'もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  };

  const addManual = () => {
    const name = manual.name.trim();
    const kcal = Number(manual.kcal);
    if (!name || !Number.isFinite(kcal) || kcal < 0) {
      Alert.alert('入力エラー', '食品名とカロリー（0以上）を入力してください。');
      return;
    }
    const grams = Number(manual.grams) || 100;
    const item = makeManualItem(name, grams, {
      kcal, protein: Number(manual.protein) || 0, fat: Number(manual.fat) || 0,
      carbs: Number(manual.carbs) || 0, fiber: 0, salt: 0,
    });
    void handleItem(item, name);
  };

  const inputStyle = {
    borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: palette.text, fontSize: 15, backgroundColor: palette.card,
  } as const;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <TextInput
        accessibilityLabel="食品を検索"
        placeholder="食品名で検索（例: 唐揚げ、納豆）"
        placeholderTextColor={palette.subText}
        value={query}
        onChangeText={setQuery}
        style={inputStyle}
      />

      {templates.length > 0 && (
        <View>
          <SectionTitle>料理テンプレート</SectionTitle>
          {templates.slice(0, 6).map((t) => {
            const items = buildItemsFromTemplate(t);
            const totals = mealTotals({ items });
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                onPress={() => {
                  if (params.addToDraft) {
                    items.forEach((i) => queuePendingItem(i));
                    finish();
                  } else if (params.mealId) {
                    const meal = meals.find((m) => m.id === Number(params.mealId));
                    if (meal?.id) void updateMeal({ ...meal, id: meal.id, items: [...meal.items, ...items] }).then(finish);
                  } else {
                    void addMeal({
                      date: params.date ?? dateKey(), mealType: params.mealType ?? 'lunch',
                      title: t.title, photoUri: null, note: null, source: 'template', items, createdAt: currentTimestamp(),
                    }).then(finish);
                  }
                }}
                style={{ backgroundColor: palette.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: palette.border }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text }}>{t.title}</Text>
                <Text style={{ fontSize: 12, color: palette.subText }}>{Math.round(totals.kcal)} kcal ・ {items.length}品目</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View>
        <SectionTitle>食品データベース（{foods.length}件）</SectionTitle>
        {foods.slice(0, 40).map((food) => (
          <Pressable
            key={food.id}
            accessibilityRole="button"
            accessibilityLabel={`${food.name}を追加`}
            onPress={() => void handleItem(makeItemFromFood(food), food.name)}
            style={{ backgroundColor: palette.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: palette.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text }}>{food.name}</Text>
              <Text style={{ fontSize: 12, color: palette.subText }}>{food.category} ・ 標準 {food.defaultGrams}g</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: palette.accent }}>{Math.round((food.kcal * food.defaultGrams) / 100)} kcal</Text>
          </Pressable>
        ))}
        {foods.length > 40 && <Text style={{ fontSize: 12, color: palette.subText }}>上位40件を表示しています。検索で絞り込んでください。</Text>}
        {foods.length === 0 && <Text style={{ fontSize: 13, color: palette.subText }}>見つかりませんでした。下の手入力をお使いください。</Text>}
      </View>

      <Card>
        <SectionTitle>手入力で追加</SectionTitle>
        <View style={{ gap: 8 }}>
          <TextInput accessibilityLabel="食品名" placeholder="食品名" placeholderTextColor={palette.subText} value={manual.name} onChangeText={(v) => setManual({ ...manual, name: v })} style={inputStyle} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput accessibilityLabel="カロリー" placeholder="kcal" placeholderTextColor={palette.subText} keyboardType="numeric" value={manual.kcal} onChangeText={(v) => setManual({ ...manual, kcal: v })} style={{ ...inputStyle, flex: 1 }} />
            <TextInput accessibilityLabel="重量グラム" placeholder="g" placeholderTextColor={palette.subText} keyboardType="numeric" value={manual.grams} onChangeText={(v) => setManual({ ...manual, grams: v })} style={{ ...inputStyle, flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput accessibilityLabel="タンパク質グラム" placeholder="P (g)" placeholderTextColor={palette.subText} keyboardType="numeric" value={manual.protein} onChangeText={(v) => setManual({ ...manual, protein: v })} style={{ ...inputStyle, flex: 1 }} />
            <TextInput accessibilityLabel="脂質グラム" placeholder="F (g)" placeholderTextColor={palette.subText} keyboardType="numeric" value={manual.fat} onChangeText={(v) => setManual({ ...manual, fat: v })} style={{ ...inputStyle, flex: 1 }} />
            <TextInput accessibilityLabel="炭水化物グラム" placeholder="C (g)" placeholderTextColor={palette.subText} keyboardType="numeric" value={manual.carbs} onChangeText={(v) => setManual({ ...manual, carbs: v })} style={{ ...inputStyle, flex: 1 }} />
          </View>
          <GhostButton title="手入力の食品を追加" onPress={addManual} />
        </View>
      </Card>
      <Text style={{ fontSize: 11, color: palette.subText }}>栄養値は日本食品標準成分表の代表値をもとにした推定値です。</Text>
    </ScrollView>
  );
}
