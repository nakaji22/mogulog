import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Card, Chip, Disclaimer, PrimaryButton } from '../../components/ui';
import { dateKey } from '../../lib/dates';
import { persistPhoto } from '../../lib/files';
import { useAppStore } from '../../lib/store';
import { usePalette } from '../../lib/theme';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from '../../lib/types';

function guessMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

export default function CameraScreen() {
  const palette = usePalette();
  const router = useRouter();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const [mealType, setMealType] = useState<MealType>(guessMealType());
  const [busy, setBusy] = useState(false);

  const goAnalyze = (photoUri: string) => {
    router.push({ pathname: '/analyze', params: { photoUri, date: selectedDate || dateKey(), mealType } });
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('カメラの許可が必要です', '食事の写真を撮影するには、設定アプリからカメラへのアクセスを許可してください。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      const saved = await persistPhoto(result.assets[0].uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goAnalyze(saved);
    } catch {
      Alert.alert('保存に失敗しました', '写真を保存できませんでした。端末の空き容量を確認してください。');
    } finally {
      setBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('写真へのアクセス許可が必要です', '写真ライブラリから選ぶには、設定アプリから写真へのアクセスを許可してください。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      const saved = await persistPhoto(result.assets[0].uri);
      goAnalyze(saved);
    } catch {
      Alert.alert('読み込みに失敗しました', '写真を読み込めませんでした。別の写真でお試しください。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: palette.text, marginTop: 8 }}>写真で記録</Text>

      <Text style={{ fontSize: 13, color: palette.subText }}>食事の区分</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {MEAL_TYPES.map((t) => (
          <Chip key={t} label={MEAL_TYPE_LABELS[t]} selected={mealType === t} onPress={() => setMealType(t)} />
        ))}
      </View>

      {busy ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          <ActivityIndicator color={palette.accent} size="large" />
          <Text style={{ marginTop: 10, color: palette.subText }}>写真を準備しています…</Text>
        </Card>
      ) : (
        <>
          <PrimaryButton title="📷 カメラで撮影する" onPress={() => void takePhoto()} />
          <PrimaryButton title="🖼️ 写真ライブラリから選ぶ" onPress={() => void pickFromLibrary()} />
        </>
      )}

      <Card>
        <Text style={{ fontSize: 14, fontWeight: '700', color: palette.text, marginBottom: 6 }}>写真解析について（正直な説明）</Text>
        <Text style={{ fontSize: 13, color: palette.subText, lineHeight: 19 }}>
          このアプリは外部の有料AIサービスを使わないため、写真から料理を自動で断定する判定は行いません。
          撮影後は、よくある料理の候補と、あなたの記録履歴からの候補を表示します。
          近いものを選んで、量を調整するだけで記録が完了します。表示される数値はすべて推定値です。
        </Text>
      </Card>

      <Card>
        <Text style={{ fontSize: 14, fontWeight: '700', color: palette.text, marginBottom: 6 }}>写真を使わない記録</Text>
        <Text style={{ fontSize: 13, color: palette.subText, marginBottom: 10 }}>食品データベースから検索して追加することもできます。</Text>
        <PrimaryButton
          title="食品を検索して記録"
          onPress={() => router.push({ pathname: '/food-search', params: { date: selectedDate || dateKey(), mealType } })}
        />
      </Card>

      <Disclaimer text="写真はあなたの端末内にのみ保存され、外部に送信されることはありません。" />
    </ScrollView>
  );
}
