import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getFoodById } from '../lib/foods';
import { nutrientsFor, roundNutrients } from '../lib/nutrition';
import { usePalette } from '../lib/theme';
import type { MealItem } from '../lib/types';

/**
 * 食事アイテムの編集リスト。重量・人前を変更すると、その場で栄養素を再計算する。
 * foodId を持つアイテムは食品DBの100g値から再計算し、手入力アイテムは
 * 入力された合計値を人前で按分する代わりに保持値を使う（grams変更時は比率で再計算）。
 */
export function ItemEditor({ items, onChange }: { items: MealItem[]; onChange: (items: MealItem[]) => void }) {
  const palette = usePalette();

  const update = (index: number, patch: Partial<MealItem>) => {
    const next = items.map((item, i) => {
      if (i !== index) return item;
      const merged = { ...item, ...patch };
      const food = merged.foodId ? getFoodById(merged.foodId) : undefined;
      if (food) {
        merged.nutrients = nutrientsFor(food, merged.grams, merged.servings);
      } else if (patch.grams !== undefined || patch.servings !== undefined) {
        const prevAmount = Math.max(1, item.grams * item.servings);
        const nextAmount = Math.max(0, merged.grams * merged.servings);
        const ratio = nextAmount / prevAmount;
        merged.nutrients = {
          kcal: item.nutrients.kcal * ratio,
          protein: item.nutrients.protein * ratio,
          fat: item.nutrients.fat * ratio,
          carbs: item.nutrients.carbs * ratio,
          fiber: item.nutrients.fiber * ratio,
          salt: item.nutrients.salt * ratio,
        };
      }
      return merged;
    });
    onChange(next);
  };

  const remove = (index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(items.filter((_, i) => i !== index));
  };

  if (items.length === 0) {
    return <Text style={{ color: palette.subText, fontSize: 13 }}>品目がありません。「食品を追加」から追加してください。</Text>;
  }

  return (
    <View style={{ gap: 10 }}>
      {items.map((item, index) => {
        const totals = roundNutrients(item.nutrients);
        return (
          <View key={index} style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border, borderRadius: 12, padding: 12, backgroundColor: palette.card }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text, flex: 1 }}>{item.name}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}を削除`} onPress={() => remove(index)} hitSlop={8}>
                <Text style={{ color: palette.danger, fontSize: 13, fontWeight: '600' }}>削除</Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: palette.subText, marginTop: 2 }}>
              {totals.kcal} kcal ・ P {totals.protein}g / F {totals.fat}g / C {totals.carbs}g
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: palette.subText, marginBottom: 4 }}>重量（g）</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <StepButton label="−" onPress={() => update(index, { grams: Math.max(0, item.grams - 10) })} />
                  <TextInput
                    accessibilityLabel="重量グラム"
                    keyboardType="numeric"
                    value={String(item.grams)}
                    onChangeText={(t) => update(index, { grams: Number(t.replace(/[^0-9.]/g, '')) || 0 })}
                    style={{ flex: 1, textAlign: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: 8, paddingVertical: 6, color: palette.text, fontSize: 14 }}
                  />
                  <StepButton label="＋" onPress={() => update(index, { grams: item.grams + 10 })} />
                </View>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: palette.subText, marginBottom: 4 }}>何人分</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[0.5, 1, 1.5, 2].map((s) => (
                    <Pressable
                      key={s}
                      accessibilityRole="button"
                      accessibilityState={{ selected: item.servings === s }}
                      onPress={() => update(index, { servings: s })}
                      style={{
                        paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8,
                        backgroundColor: item.servings === s ? palette.accent : palette.track,
                      }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: item.servings === s ? '#fff' : palette.text }}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '＋' ? '10グラム増やす' : '10グラム減らす'}
      onPress={onPress}
      style={{ width: 30, height: 34, borderRadius: 8, backgroundColor: palette.track, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, color: palette.text }}>{label}</Text>
    </Pressable>
  );
}
