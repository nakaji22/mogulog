import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePalette } from '../lib/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  return (
    <View style={[{ backgroundColor: palette.card, borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border }, style]}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const palette = usePalette();
  return <Text style={{ fontSize: 16, fontWeight: '700', color: palette.text, marginBottom: 8 }}>{children}</Text>;
}

export function PrimaryButton({ title, onPress, disabled, loading }: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean;
}) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={({ pressed }) => ({
        backgroundColor: palette.accent,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
      })}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{title}</Text>}
    </Pressable>
  );
}

export function GhostButton({ title, onPress, danger }: { title: string; onPress: () => void; danger?: boolean }) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: danger ? palette.danger : palette.border,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text style={{ color: danger ? palette.danger : palette.text, fontSize: 14, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => { void Haptics.selectionAsync(); onPress(); }}
      style={{
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
        backgroundColor: selected ? palette.accent : palette.card,
        borderWidth: 1, borderColor: selected ? palette.accent : palette.border,
      }}>
      <Text style={{ color: selected ? '#fff' : palette.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Disclaimer({ text }: { text: string }) {
  const palette = usePalette();
  return (
    <Text style={{ fontSize: 11, color: palette.subText, lineHeight: 16, marginTop: 8 }}>{text}</Text>
  );
}
