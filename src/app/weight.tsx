import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LineChart } from '../components/charts';
import { Card, PrimaryButton, SectionTitle } from '../components/ui';
import { addDays, dateKey, formatShortDate } from '../lib/dates';
import { useAppStore } from '../lib/store';
import { usePalette } from '../lib/theme';

export default function WeightScreen() {
  const palette = usePalette();
  const router = useRouter();
  const weights = useAppStore((s) => s.weights);
  const setWeight = useAppStore((s) => s.setWeight);
  const removeWeight = useAppStore((s) => s.removeWeight);
  const profile = useAppStore((s) => s.profile);
  const [date, setDate] = useState(dateKey());
  const latest = weights.length > 0 ? weights[weights.length - 1].weightKg : profile?.weightKg ?? 55;
  const [value, setValue] = useState(String(latest));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const kg = Number(value);
    if (!Number.isFinite(kg) || kg < 25 || kg > 300) {
      Alert.alert('入力エラー', '体重は25〜300kgの範囲で入力してください。');
      return;
    }
    setSaving(true);
    try {
      await setWeight(date, Math.round(kg * 10) / 10);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const existing = weights.find((w) => w.date === date);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Card>
        <SectionTitle>日付</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="前日" onPress={() => setDate(addDays(date, -1))} hitSlop={10}>
            <Text style={{ fontSize: 22, color: palette.subText }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 15, fontWeight: '600', color: palette.text }}>{formatShortDate(date)}{date === dateKey() ? '（今日）' : ''}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="翌日" onPress={() => setDate(addDays(date, 1))} hitSlop={10}>
            <Text style={{ fontSize: 22, color: palette.subText }}>›</Text>
          </Pressable>
        </View>
        <View style={{ height: 12 }} />
        <SectionTitle>体重（kg）</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="0.1キロ減らす" onPress={() => setValue(String(Math.round((Number(value || 0) - 0.1) * 10) / 10))} style={{ width: 44, height: 48, borderRadius: 10, backgroundColor: palette.track, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, color: palette.text }}>−</Text>
          </Pressable>
          <TextInput
            accessibilityLabel="体重キログラム"
            keyboardType="numeric"
            value={value}
            onChangeText={(t) => setValue(t.replace(/[^0-9.]/g, ''))}
            style={{ flex: 1, textAlign: 'center', fontSize: 26, fontWeight: '700', borderWidth: 1, borderColor: palette.border, borderRadius: 12, paddingVertical: 8, color: palette.text, backgroundColor: palette.card }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="0.1キロ増やす" onPress={() => setValue(String(Math.round((Number(value || 0) + 0.1) * 10) / 10))} style={{ width: 44, height: 48, borderRadius: 10, backgroundColor: palette.track, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, color: palette.text }}>＋</Text>
          </Pressable>
        </View>
        <View style={{ height: 14 }} />
        <PrimaryButton title={existing ? 'この日の体重を更新' : '記録する'} onPress={() => void save()} loading={saving} />
        {existing && (
          <Pressable accessibilityRole="button" onPress={() => { void removeWeight(date).then(() => router.back()); }} style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ color: palette.danger, fontWeight: '600', fontSize: 13 }}>この日の記録を削除</Text>
          </Pressable>
        )}
      </Card>

      <Card>
        <SectionTitle>体重の推移</SectionTitle>
        {weights.length === 0 ? (
          <Text style={{ color: palette.subText, fontSize: 13 }}>まだ記録がありません。</Text>
        ) : (
          <LineChart unit="kg" points={weights.slice(-14).map((w) => ({ label: formatShortDate(w.date).replace(/（.）/, ''), value: w.weightKg }))} />
        )}
        {profile && <Text style={{ fontSize: 12, color: palette.subText }}>目標体重: {profile.targetWeightKg} kg</Text>}
      </Card>

      <View>
        <SectionTitle>最近の記録</SectionTitle>
        {[...weights].reverse().slice(0, 10).map((w) => (
          <View key={w.date} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border }}>
            <Text style={{ color: palette.text, fontSize: 14 }}>{formatShortDate(w.date)}</Text>
            <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{w.weightKg} kg</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
