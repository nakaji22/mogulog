import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '../lib/store';
import { usePalette } from '../lib/theme';

export default function RootLayout() {
  const palette = usePalette();
  const ready = useAppStore((s) => s.ready);
  const error = useAppStore((s) => s.error);
  const profile = useAppStore((s) => s.profile);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const segments = useSegments();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.accent} size="large" />
        <Text style={{ marginTop: 12, color: palette.subText }}>読み込み中…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: palette.background }}>
        <Text style={{ color: palette.danger, fontSize: 15, textAlign: 'center' }}>
          データの読み込みに失敗しました。{'\n'}{error}
        </Text>
      </View>
    );
  }

  const inOnboarding = segments[0] === 'onboarding';
  if (!profile && !inOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="analyze" options={{ presentation: 'modal', headerShown: true, title: '記録内容の確認' }} />
        <Stack.Screen name="food-search" options={{ presentation: 'modal', headerShown: true, title: '食品を追加' }} />
        <Stack.Screen name="meal/[id]" options={{ headerShown: true, title: '食事の詳細' }} />
        <Stack.Screen name="weight" options={{ presentation: 'modal', headerShown: true, title: '体重を記録' }} />
      </Stack>
    </>
  );
}
