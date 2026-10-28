import { useColorScheme } from 'react-native';

export interface Palette {
  background: string;
  card: string;
  text: string;
  subText: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  border: string;
  protein: string;
  fat: string;
  carbs: string;
  danger: string;
  track: string;
}

const light: Palette = {
  background: '#F7F8F7',
  card: '#FFFFFF',
  text: '#1C2521',
  subText: '#6B7A72',
  accent: '#2F9E63',
  accentDark: '#22734A',
  accentSoft: '#E4F4EA',
  border: '#E3E9E5',
  protein: '#E4572E',
  fat: '#F2B035',
  carbs: '#3E7CB1',
  danger: '#D64545',
  track: '#E7EDE9',
};

const dark: Palette = {
  background: '#101613',
  card: '#1B221E',
  text: '#EDF3EF',
  subText: '#93A69B',
  accent: '#3CB371',
  accentDark: '#5CC98A',
  accentSoft: '#1E3328',
  border: '#2A332E',
  protein: '#FF7B4D',
  fat: '#FFC75C',
  carbs: '#6FA8D8',
  danger: '#FF7070',
  track: '#27302B',
};

export function usePalette(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
