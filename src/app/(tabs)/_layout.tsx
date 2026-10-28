import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePalette } from '../../lib/theme';

const TABS = [
  { route: '/', label: 'ホーム', icon: '🏠' },
  { route: '/history', label: '記録', icon: '📅' },
  { route: '/camera', label: 'カメラ', icon: '📷' },
  { route: '/analytics', label: '分析', icon: '📊' },
  { route: '/settings', label: '設定', icon: '⚙️' },
] as const;

function CustomTabBar() {
  const palette = usePalette();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: palette.card,
        borderTopWidth: 1,
        borderTopColor: palette.border,
        paddingBottom: 18,
        paddingTop: 6,
        alignItems: 'flex-end',
      }}>
      {TABS.map((tab) => {
        const active = pathname === tab.route || (tab.route !== '/' && pathname.startsWith(tab.route));
        if (tab.route === '/camera') {
          return (
            <View key={tab.route} style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="カメラで食事を記録"
                onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/camera'); }}
                style={{
                  width: 56, height: 56, borderRadius: 28, marginTop: -24,
                  backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
                }}>
                <Text style={{ fontSize: 26 }}>📷</Text>
              </Pressable>
              <Text style={{ fontSize: 10, color: palette.accent, fontWeight: '700', marginTop: 2 }}>記録する</Text>
            </View>
          );
        }
        return (
          <Pressable
            key={tab.route}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => router.push(tab.route as never)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 21, opacity: active ? 1 : 0.45 }}>{tab.icon}</Text>
            <Text style={{ fontSize: 10, color: active ? palette.accent : palette.subText, fontWeight: active ? '700' : '400' }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={() => <CustomTabBar />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="camera" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
