import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ItemEditor } from '../../components/item-editor';
import { Card, Chip, PrimaryButton, SectionTitle } from '../../components/ui';
import { deletePhotoIfLocal } from '../../lib/files';
import { mealTotals, roundNutrients } from '../../lib/nutrition';
import { useAppStore } from '../../lib/store';
import { usePalette } from '../../lib/theme';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealItem, type MealType } from '../../lib/types';

export default function MealDetailScreen() {
  const palette = usePalette();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const meals = useAppStore((s) => s.meals);
  const updateMeal = useAppStore((s) => s.updateMeal);
  const removeMeal = useAppStore((s) => s.removeMeal);
  const takePendingItems = useAppStore((s) => s.takePendingItems);
  const meal = meals.find((m) => m.id === Number(id));

  // ルートレイアウトがデータ読み込み完了まで画面表示を止めるため、初回レンダーで meal が取得できる
  const [title, setTitle] = useState(() => meal?.title ?? '');
  const [mealType, setMealType] = useState<MealType>(() => meal?.mealType ?? 'lunch');
  const [items, setItems] = useState<MealItem[]>(() => (meal ? meal.items.map((i) => ({ ...i })) : []));
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const pending = takePendingItems();
      if (pending.length > 0) setItems((prev) => [...prev, ...pending]);
    }, [takePendingItems]),
  );

  if (!meal) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background, padding: 24 }}>
        <Text style={{ color: palette.subText }}>この記録は削除されたか、見つかりませんでした。</Text>
      </View>
    );
  }

  const totals = roundNutrients(mealTotals({ items }));

  const save = async () => {
    setSaving(true);
    try {
      await updateMeal({ ...meal, id: meal.id!, title: title.trim() || meal.title, mealType, items });
      router.back();
    } catch {
      Alert.alert('保存に失敗しました', 'もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('この食事を削除しますか？', 'この操作は元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する', style: 'destructive',
        onPress: () => {
          void (async () => {
            await removeMeal(meal.id!);
            await deletePhotoIfLocal(meal.photoUri);
            router.back();
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      {meal.photoUri ? <Image source={{ uri: meal.photoUri }} style={{ width: '100%', height: 220, borderRadius: 16 }} accessibilityLabel="食事の写真" /> : null}
      <Text style={{ fontSize: 13, color: palette.subText }}>{meal.date}</Text>

      <View>
        <SectionTitle>タイトル</SectionTitle>
        <TextInput
          accessibilityLabel="食事のタイトル"
          value={title}
          onChangeText={setTitle}
          style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: palette.text, fontSize: 15, backgroundColor: palette.card }}
        />
      </View>

      <View>
        <SectionTitle>区分</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {MEAL_TYPES.map((t) => (
            <Chip key={t} label={MEAL_TYPE_LABELS[t]} selected={mealType === t} onPress={() => setMealType(t)} />
          ))}
        </View>
      </View>

      <View>
        <SectionTitle>内容</SectionTitle>
        <ItemEditor items={items} onChange={setItems} />
        <View style={{ height: 8 }} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/food-search', params: { addToDraft: '1' } })}
          style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: palette.accent }}>
          <Text style={{ color: palette.accent, fontWeight: '700', fontSize: 14 }}>＋ 食品を追加・検索</Text>
        </Pressable>
      </View>

      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: palette.text }}>
          合計 {totals.kcal} kcal ・ P {totals.protein}g / F {totals.fat}g / C {totals.carbs}g
        </Text>
        <Text style={{ fontSize: 12, color: palette.subText }}>食物繊維 {totals.fiber}g ・ 塩分 {totals.salt}g（推定値）</Text>
      </Card>

      <PrimaryButton title="変更を保存" onPress={() => void save()} loading={saving} />
      <Pressable accessibilityRole="button" onPress={confirmDelete} style={{ alignItems: 'center', paddingVertical: 12 }}>
        <Text style={{ color: palette.danger, fontWeight: '700', fontSize: 14 }}>この食事を削除</Text>
      </Pressable>
    </ScrollView>
  );
}
