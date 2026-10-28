import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ItemEditor } from '../components/item-editor';
import { Card, Disclaimer, PrimaryButton, SectionTitle } from '../components/ui';
import { activeAnalyzer, type AnalysisCandidate } from '../lib/analyzer';
import { mealTotals, roundNutrients } from '../lib/nutrition';
import { useAppStore } from '../lib/store';
import { usePalette } from '../lib/theme';
import { MEAL_TYPE_LABELS, type MealItem, type MealType } from '../lib/types';

export default function AnalyzeScreen() {
  const palette = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{ photoUri: string; date: string; mealType: MealType }>();
  const meals = useAppStore((s) => s.meals);
  const addMeal = useAppStore((s) => s.addMeal);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<AnalysisCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<MealItem[]>([]);
  const [saving, setSaving] = useState(false);

  const recentFoodIds = useMemo(() => meals.slice(0, 30).flatMap((m) => m.items.map((i) => i.foodId).filter((x): x is string => !!x)), [meals]);

  const takePendingItems = useAppStore((s) => s.takePendingItems);
  useFocusEffect(
    React.useCallback(() => {
      const pending = takePendingItems();
      if (pending.length > 0) setItems((prev) => [...prev, ...pending]);
    }, [takePendingItems]),
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await activeAnalyzer.analyze({ photoUri: params.photoUri, mealType: params.mealType, recentFoodIds });
        if (!mounted) return;
        setCandidates(result);
        if (result[0]) {
          setSelectedId(result[0].id);
          setTitle(result[0].title);
          setItems(result[0].items);
        }
      } catch {
        if (mounted) setError('候補の生成に失敗しました。手入力で記録できます。');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // paramsは初回のみ評価する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (candidate: AnalysisCandidate) => {
    setSelectedId(candidate.id);
    setTitle(candidate.title);
    setItems(candidate.items.map((i) => ({ ...i })));
  };

  const totals = roundNutrients(mealTotals({ items }));

  const save = async () => {
    if (items.length === 0) {
      Alert.alert('品目がありません', '候補を選ぶか、食品を追加してください。');
      return;
    }
    setSaving(true);
    try {
      await addMeal({
        date: params.date, mealType: params.mealType, title: title.trim() || '食事',
        photoUri: params.photoUri || null, note: null, source: 'photo', items, createdAt: Date.now(),
      });
      router.dismissTo('/');
    } catch {
      Alert.alert('保存に失敗しました', '記録を保存できませんでした。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      {params.photoUri ? <Image source={{ uri: params.photoUri }} style={{ width: '100%', height: 220, borderRadius: 16 }} accessibilityLabel="撮影した食事の写真" /> : null}
      <Text style={{ fontSize: 13, color: palette.subText }}>{params.date} ・ {MEAL_TYPE_LABELS[params.mealType]}</Text>

      <Card style={{ backgroundColor: palette.accentSoft, borderColor: palette.accentSoft }}>
        <Text style={{ fontSize: 12, color: palette.accentDark, lineHeight: 18 }}>
          これは候補の提示です。写真の内容をAIが自動判定した結果ではありません。実際に食べた内容に近い候補を選び、量を調整してください。数値はすべて推定値です。
        </Text>
      </Card>

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <ActivityIndicator color={palette.accent} size="large" />
          <Text style={{ marginTop: 8, color: palette.subText }}>候補を用意しています…</Text>
        </View>
      ) : error ? (
        <Text style={{ color: palette.danger, fontSize: 14 }}>{error}</Text>
      ) : (
        <View>
          <SectionTitle>候補から選ぶ</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {candidates.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedId === c.id }}
                onPress={() => choose(c)}
                style={{
                  borderRadius: 12, padding: 10, minWidth: 130,
                  backgroundColor: selectedId === c.id ? palette.accent : palette.card,
                  borderWidth: 1, borderColor: palette.border,
                }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: selectedId === c.id ? '#fff' : palette.text }}>{c.title}</Text>
                <Text style={{ fontSize: 11, color: selectedId === c.id ? '#E4F4EA' : palette.subText, marginTop: 2 }}>
                  {Math.round(c.totals.kcal)} kcal{c.reason === 'history' ? ' ・ よく食べる食品' : ''}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View>
        <SectionTitle>タイトル</SectionTitle>
        <TextInput
          accessibilityLabel="食事のタイトル"
          value={title}
          onChangeText={setTitle}
          placeholder="例: 唐揚げ定食"
          placeholderTextColor={palette.subText}
          style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: palette.text, fontSize: 15, backgroundColor: palette.card }}
        />
      </View>

      <View>
        <SectionTitle>内容（編集できます）</SectionTitle>
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
        <Text style={{ fontSize: 12, color: palette.subText }}>食物繊維 {totals.fiber}g ・ 塩分 {totals.salt}g</Text>
      </Card>

      <PrimaryButton title="この内容で記録する" onPress={() => void save()} loading={saving} />
      <Disclaimer text="候補に合う料理がない場合は、タイトルと内容を手入力に切り替えて記録してください。推定値は実際の栄養価と異なる場合があります。" />
    </ScrollView>
  );
}
