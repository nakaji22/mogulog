import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Chip, Disclaimer, PrimaryButton, SectionTitle } from '../components/ui';
import { currentTimestamp, dateKey } from '../lib/dates';
import { useAppStore } from '../lib/store';
import { ACTIVITY_LABELS, PURPOSE_LABELS, recommendIntake } from '../lib/targets';
import { usePalette } from '../lib/theme';
import type { ActivityLevel, GoalPurpose, Sex } from '../lib/types';

export default function OnboardingScreen() {
  const palette = usePalette();
  const router = useRouter();
  const saveProfile = useAppStore((s) => s.saveProfile);
  const saveWeightRecord = useAppStore((s) => s.setWeight);
  const [age, setAge] = useState('30');
  const [sex, setSex] = useState<Sex>('female');
  const [height, setHeight] = useState('160');
  const [weight, setWeight] = useState('55');
  const [targetWeight, setTargetWeight] = useState('52');
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [purpose, setPurpose] = useState<GoalPurpose>('lose');

  const parsed = useMemo(() => ({
    age: Number(age), heightCm: Number(height), weightKg: Number(weight), targetWeightKg: Number(targetWeight),
  }), [age, height, weight, targetWeight]);

  const valid =
    parsed.age >= 10 && parsed.age <= 100 &&
    parsed.heightCm >= 100 && parsed.heightCm <= 230 &&
    parsed.weightKg >= 25 && parsed.weightKg <= 300 &&
    parsed.targetWeightKg >= 25 && parsed.targetWeightKg <= 300;

  const recommendation = valid
    ? recommendIntake({ sex, age: parsed.age, heightCm: parsed.heightCm, weightKg: parsed.weightKg, activityLevel: activity, purpose })
    : null;

  const finish = async () => {
    if (!valid || !recommendation) {
      Alert.alert('入力を確認してください', '年齢・身長・体重の入力範囲が正しくありません。');
      return;
    }
    await saveProfile({
      age: parsed.age, sex, heightCm: parsed.heightCm, weightKg: parsed.weightKg,
      targetWeightKg: parsed.targetWeightKg, activityLevel: activity, purpose,
      recommendedKcal: recommendation.kcal, kcalGoalOverride: null, createdAt: currentTimestamp(),
    });
    await saveWeightRecord(dateKey(), parsed.weightKg);
    router.replace('/');
  };

  const inputStyle = {
    borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: palette.text, fontSize: 16, backgroundColor: palette.card,
  } as const;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: palette.text, marginTop: 24 }}>もぐログへようこそ</Text>
      <Text style={{ fontSize: 14, color: palette.subText, lineHeight: 21 }}>
        写真で記録する、完全無料の食事管理アプリです。まずはあなたの情報を教えてください。1日の推奨摂取カロリーを計算します。入力内容は端末内にのみ保存されます。
      </Text>

      <Card>
        <SectionTitle>基本情報</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Chip label="女性" selected={sex === 'female'} onPress={() => setSex('female')} />
          <Chip label="男性" selected={sex === 'male'} onPress={() => setSex('male')} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="年齢" value={age} onChange={setAge} unit="歳" palette={palette} inputStyle={inputStyle} />
          <Field label="身長" value={height} onChange={setHeight} unit="cm" palette={palette} inputStyle={inputStyle} />
        </View>
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="現在の体重" value={weight} onChange={setWeight} unit="kg" palette={palette} inputStyle={inputStyle} />
          <Field label="目標体重" value={targetWeight} onChange={setTargetWeight} unit="kg" palette={palette} inputStyle={inputStyle} />
        </View>
      </Card>

      <Card>
        <SectionTitle>活動レベル</SectionTitle>
        <View style={{ gap: 8 }}>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
            <Chip key={level} label={ACTIVITY_LABELS[level]} selected={activity === level} onPress={() => setActivity(level)} />
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>目的</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(Object.keys(PURPOSE_LABELS) as GoalPurpose[]).map((p) => (
            <Chip key={p} label={PURPOSE_LABELS[p]} selected={purpose === p} onPress={() => setPurpose(p)} />
          ))}
        </View>
      </Card>

      {recommendation && (
        <Card style={{ backgroundColor: palette.accentSoft, borderColor: palette.accentSoft }}>
          <Text style={{ fontSize: 13, color: palette.accentDark, fontWeight: '600' }}>推奨摂取カロリー（推定）</Text>
          <Text style={{ fontSize: 30, fontWeight: '800', color: palette.text }}>{recommendation.kcal} kcal / 日</Text>
          <Text style={{ fontSize: 12, color: palette.subText, lineHeight: 18 }}>
            Mifflin-St Jeor式による推定値です。あとから設定画面でいつでも変更できます。
            {recommendation.clampedToSafetyFloor ? '\n安全のため、これ以上低いカロリーは自動では推奨しないよう下限値に調整しています。' : ''}
            {Math.abs(recommendation.weeklyChangeKg) >= 1 ? '\nこのペースは週1kgを超える変化に相当します。無理のない範囲で様子を見てください。' : ''}
          </Text>
        </Card>
      )}

      <PrimaryButton title="はじめる" onPress={() => void finish()} disabled={!valid} />
      <Disclaimer text="本アプリは医療機器ではありません。摂取カロリーの推奨値は一般的な推定式に基づく目安であり、健康状態によっては適さない場合があります。" />
    </ScrollView>
  );
}

function Field({ label, value, onChange, unit, palette, inputStyle }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  palette: ReturnType<typeof usePalette>;
  inputStyle: object;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: palette.subText, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TextInput
          accessibilityLabel={label}
          keyboardType="numeric"
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ''))}
          style={[inputStyle, { flex: 1 }]}
        />
        <Text style={{ color: palette.subText, fontSize: 13 }}>{unit}</Text>
      </View>
    </View>
  );
}
