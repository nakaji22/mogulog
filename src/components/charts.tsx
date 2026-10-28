import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { usePalette } from '../lib/theme';

/** 円形プログレス（カロリー進捗） */
export function RingProgress({ size = 180, stroke = 14, value, goal, centerLabel, subLabel }: {
  size?: number; stroke?: number; value: number; goal: number; centerLabel: string; subLabel: string;
}) {
  const palette = usePalette();
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const over = value > goal && goal > 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${subLabel}: ${centerLabel}`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={palette.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={over ? palette.danger : palette.accent}
          strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 30, fontWeight: '700', color: palette.text }}>{centerLabel}</Text>
        <Text style={{ fontSize: 12, color: palette.subText }}>{subLabel}</Text>
      </View>
    </View>
  );
}

/** 横棒グラフ（PFC達成率など） */
export function BarMeter({ label, value, goal, unit, color }: {
  label: string; value: number; goal: number; unit: string; color: string;
}) {
  const palette = usePalette();
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0;
  return (
    <View style={{ marginVertical: 5 }} accessibilityLabel={`${label} ${Math.round(value)}${unit} / 目標${Math.round(goal)}${unit}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, color: palette.text, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 13, color: palette.subText }}>{Math.round(value)} / {Math.round(goal)} {unit}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.track, overflow: 'hidden' }}>
        <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

/** 折れ線グラフ（カロリー推移・体重推移共用） */
export function LineChart({ points, height = 160, goalLine, unit, color }: {
  points: { label: string; value: number | null }[];
  height?: number;
  goalLine?: number;
  unit: string;
  color?: string;
}) {
  const palette = usePalette();
  const lineColor = color ?? palette.accent;
  const width = 320;
  const padding = 24;
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: palette.subText, fontSize: 13 }}>データがまだありません</Text>
      </View>
    );
  }
  const maxRaw = Math.max(...values, goalLine ?? 0);
  const minRaw = Math.min(...values, goalLine ?? Number.POSITIVE_INFINITY);
  const span = Math.max(1, maxRaw - minRaw);
  const max = maxRaw + span * 0.15;
  const min = Math.max(0, minRaw - span * 0.15);
  const x = (i: number) => padding + (i * (width - padding * 2)) / Math.max(1, points.length - 1);
  const y = (v: number) => height - padding - ((v - min) / (max - min)) * (height - padding * 2);
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((p, i) => {
    if (p.value === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
    } else {
      current.push(`${x(i)},${y(p.value)}`);
    }
  });
  if (current.length > 1) segments.push(current.join(' '));
  return (
    <View accessibilityLabel={`折れ線グラフ（単位: ${unit}）`}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {goalLine !== undefined && (
          <Line x1={padding} x2={width - padding} y1={y(goalLine)} y2={y(goalLine)} stroke={palette.danger} strokeWidth={1} strokeDasharray="4 4" />
        )}
        {segments.map((seg, i) => (
          <Polyline key={i} points={seg} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((p, i) =>
          p.value !== null ? <Circle key={i} cx={x(i)} cy={y(p.value)} r={3} fill={lineColor} /> : null,
        )}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 }}>
        {points.map((p, i) => (
          <Text key={i} style={{ fontSize: 9, color: palette.subText }}>{p.label}</Text>
        ))}
      </View>
    </View>
  );
}

/** 縦棒グラフ（週間カロリーなど） */
export function BarChart({ points, height = 140, goalLine }: {
  points: { label: string; value: number }[]; height?: number; goalLine?: number;
}) {
  const palette = usePalette();
  const max = Math.max(...points.map((p) => p.value), goalLine ?? 0, 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 6 }}>
        {points.map((p, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: palette.subText, marginBottom: 2 }}>{p.value > 0 ? Math.round(p.value) : ''}</Text>
            <View style={{
              width: '70%',
              height: Math.max(2, (p.value / max) * (height - 18)),
              backgroundColor: goalLine !== undefined && p.value > goalLine ? palette.danger : palette.accent,
              borderRadius: 4,
            }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
        {points.map((p, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: palette.subText }}>{p.label}</Text>
        ))}
      </View>
    </View>
  );
}

/** PFC比率の3色帯 */
export function PfcBand({ protein, fat, carbs }: { protein: number; fat: number; carbs: number }) {
  const palette = usePalette();
  const total = protein + fat + carbs;
  if (total <= 0) return <View style={{ height: 10, borderRadius: 5, backgroundColor: palette.track }} />;
  return (
    <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' }}>
      <View style={{ flex: protein, backgroundColor: palette.protein }} />
      <View style={{ flex: fat, backgroundColor: palette.fat }} />
      <View style={{ flex: carbs, backgroundColor: palette.carbs }} />
    </View>
  );
}
