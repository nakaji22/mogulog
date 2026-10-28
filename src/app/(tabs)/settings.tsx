import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { buildBackup, mealsToCsv, parseBackup, serializeBackup } from '../../lib/backup';
import { pickBackupFile, shareTextFile } from '../../lib/files';
import { useAppStore } from '../../lib/store';
import { recommendIntake } from '../../lib/targets';
import { usePalette } from '../../lib/theme';
import { Card, Disclaimer, GhostButton, SectionTitle } from '../../components/ui';

export default function SettingsScreen() {
  const palette = usePalette();
  const profile = useAppStore((s) => s.profile);
  const meals = useAppStore((s) => s.meals);
  const weights = useAppStore((s) => s.weights);
  const saveProfile = useAppStore((s) => s.saveProfile);
  const restoreBackup = useAppStore((s) => s.restoreBackup);
  const wipeAll = useAppStore((s) => s.wipeAll);
  const [goalInput, setGoalInput] = useState('');
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const currentGoal = profile.kcalGoalOverride ?? profile.recommendedKcal;

  const applyGoalOverride = async () => {
    const value = Number(goalInput);
    if (!Number.isFinite(value) || value < 500 || value > 6000) {
      Alert.alert('入力エラー', '目標カロリーは500〜6000kcalの範囲で入力してください。');
      return;
    }
    await saveProfile({ ...profile, kcalGoalOverride: Math.round(value) });
    setGoalInput('');
    Alert.alert('保存しました', `目標カロリーを ${Math.round(value)} kcal に設定しました。`);
  };

  const resetGoalToRecommended = async () => {
    const rec = recommendIntake(profile);
    await saveProfile({ ...profile, recommendedKcal: rec.kcal, kcalGoalOverride: null });
    Alert.alert('再計算しました', `推奨摂取カロリーは ${rec.kcal} kcal です${rec.clampedToSafetyFloor ? '（安全のため下限値に調整されています）' : ''}。`);
  };

  const exportCsv = async () => {
    setBusy(true);
    try {
      await shareTextFile('mogulog-meals.csv', mealsToCsv(meals), 'text/csv');
    } catch (e) {
      Alert.alert('エクスポート失敗', e instanceof Error ? e.message : 'CSVを書き出せませんでした');
    } finally { setBusy(false); }
  };

  const exportBackup = async () => {
    setBusy(true);
    try {
      await shareTextFile('mogulog-backup.json', serializeBackup(buildBackup(profile, meals, weights)), 'application/json');
    } catch (e) {
      Alert.alert('エクスポート失敗', e instanceof Error ? e.message : 'バックアップを書き出せませんでした');
    } finally { setBusy(false); }
  };

  const importBackup = async () => {
    try {
      const text = await pickBackupFile();
      if (!text) return;
      const data = parseBackup(text);
      Alert.alert('復元しますか？', '現在の記録はすべてバックアップの内容に置き換わります。', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '復元する', style: 'destructive',
          onPress: () => { void restoreBackup(data).then(() => Alert.alert('復元しました')); },
        },
      ]);
    } catch (e) {
      Alert.alert('復元できませんでした', e instanceof Error ? e.message : '不明なエラー');
    }
  };

  const confirmWipe = () => {
    Alert.alert('すべての記録を削除しますか？', '食事・体重・プロフィールがすべて削除され、元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: () => { void wipeAll(); } },
    ]);
  };

  const inputStyle = {
    borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: palette.text, fontSize: 15, backgroundColor: palette.card,
  } as const;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: palette.text, marginTop: 8 }}>設定</Text>

      <Card>
        <SectionTitle>プロフィール</SectionTitle>
        <Text style={{ color: palette.text, fontSize: 14, lineHeight: 22 }}>
          年齢 {profile.age}歳 ・ 身長 {profile.heightCm}cm ・ 体重 {profile.weightKg}kg{'\n'}
          目標体重 {profile.targetWeightKg}kg ・ 推奨摂取カロリー {profile.recommendedKcal}kcal{'\n'}
          現在の目標カロリー {Math.round(currentGoal)}kcal{profile.kcalGoalOverride ? '（手動設定）' : ''}
        </Text>
        <View style={{ height: 10 }} />
        <Text style={{ color: palette.subText, fontSize: 12, marginBottom: 6 }}>目標カロリーを手動で変更</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput accessibilityLabel="目標カロリー" keyboardType="numeric" placeholder="例: 2000" placeholderTextColor={palette.subText} value={goalInput} onChangeText={setGoalInput} style={{ ...inputStyle, flex: 1 }} />
          <View style={{ width: 110 }}><GhostButton title="設定する" onPress={() => void applyGoalOverride()} /></View>
        </View>
        <View style={{ height: 8 }} />
        <GhostButton title="推奨値を再計算して使う" onPress={() => void resetGoalToRecommended()} />
        <Disclaimer text="推奨値はMifflin-St Jeor式による推定です。極端なカロリー制限（男性1,500kcal / 女性1,200kcal未満）は自動では推奨しません。健康状態に不安がある場合は医療専門家にご相談ください。" />
      </Card>

      <Card>
        <SectionTitle>データ</SectionTitle>
        <View style={{ gap: 8 }}>
          <GhostButton title={busy ? '処理中…' : '食事記録をCSVでエクスポート'} onPress={() => void exportCsv()} />
          <GhostButton title={busy ? '処理中…' : 'バックアップを書き出す（JSON）'} onPress={() => void exportBackup()} />
          <GhostButton title="バックアップから復元する" onPress={() => void importBackup()} />
          <GhostButton title="すべての記録を削除" danger onPress={confirmWipe} />
        </View>
        <Disclaimer text="記録はすべてこの端末内に保存されます。アカウント登録は不要で、外部サーバーへの送信は行いません。" />
      </Card>

      <Card>
        <SectionTitle>このアプリについて</SectionTitle>
        <Text style={{ color: palette.text, fontSize: 13, lineHeight: 20 }}>
          もぐログは完全無料の食事管理アプリです。広告・課金・サブスクリプションはありません。{'\n\n'}
          写真記録では、外部の有料AIサービスを使わず、料理の候補提示と利用者による補正で記録します。写真から料理を自動断定する機能は搭載していないため、そのように表示することもありません。{'\n\n'}
          栄養素の値は日本食品標準成分表（文部科学省）の代表値をもとにした推定値です。実際の値とは差が生じます。
        </Text>
      </Card>

      <Card>
        <SectionTitle>プライバシーポリシー（要約）</SectionTitle>
        <Text style={{ color: palette.text, fontSize: 13, lineHeight: 20 }}>
          ・収集する情報: アプリ内で入力・撮影した食事記録、体重、プロフィールのみで、すべて端末内（SQLiteと端末内ファイル領域）に保存されます。{'\n'}
          ・外部送信: 行いません。解析・集計はすべて端末内で完結します。{'\n'}
          ・第三者提供・広告・トラッキング: 行いません。{'\n'}
          ・権限: カメラ・写真は食事写真の撮影と選択のためだけに使います。{'\n'}
          ・削除: 「すべての記録を削除」で端末内の全データを消去できます。{'\n'}
          全文はリポジトリの docs/PRIVACY_POLICY.md に掲載しています。
        </Text>
      </Card>
    </ScrollView>
  );
}
