import { getFoodById } from './foods';
import { makeItemFromFood } from './nutrition';
import type { MealItem, MealType } from './types';

/**
 * 料理テンプレート。食品DBの食材と標準一人前で構成する定番メニュー。
 * 写真解析の「候補提示」と、手動記録の近道の両方に使う。
 */
export interface MealTemplate {
  id: string;
  title: string;
  mealTypes: MealType[];
  /** [foodId, grams] */
  items: [string, number][];
  keywords: string[];
}

export const MEAL_TEMPLATES: MealTemplate[] = [
  { id: 'karaage-teishoku', title: '唐揚げ定食', mealTypes: ['lunch', 'dinner'], keywords: ['唐揚げ', '定食'], items: [['rice', 250], ['karaage', 150], ['miso-soup', 180], ['cabbage', 50]] },
  { id: 'salmon-teishoku', title: '鮭の塩焼き定食', mealTypes: ['breakfast', 'lunch', 'dinner'], keywords: ['鮭', '定食', '魚'], items: [['rice', 200], ['salmon', 80], ['miso-soup', 160], ['tofu-silk', 80]] },
  { id: 'curry-rice', title: 'カレーライス', mealTypes: ['lunch', 'dinner'], keywords: ['カレー'], items: [['rice', 250], ['curry-roux', 200]] },
  { id: 'ramen-set', title: 'ラーメン', mealTypes: ['lunch', 'dinner'], keywords: ['ラーメン', '麺'], items: [['ramen-full', 600]] },
  { id: 'oyako-don-note', title: '親子丼風（卵と鶏肉の丼）', mealTypes: ['lunch', 'dinner'], keywords: ['丼', '卵'], items: [['rice', 250], ['chicken-thigh', 80], ['egg', 100], ['onion', 50]] },
  { id: 'hamburg-set', title: 'ハンバーグ定食', mealTypes: ['lunch', 'dinner'], keywords: ['ハンバーグ', '定食'], items: [['rice', 200], ['hamburg', 120], ['salad-bowl', 100], ['corn-soup', 180]] },
  { id: 'shogayaki-set', title: '生姜焼き定食', mealTypes: ['lunch', 'dinner'], keywords: ['生姜焼き', '定食'], items: [['rice', 220], ['shogayaki', 130], ['cabbage', 60], ['miso-soup', 160]] },
  { id: 'tonkatsu-set', title: 'とんかつ定食', mealTypes: ['lunch', 'dinner'], keywords: ['とんかつ', '定食'], items: [['rice', 220], ['tonkatsu', 120], ['cabbage', 60], ['miso-soup', 160]] },
  { id: 'japanese-breakfast', title: '和朝食（納豆・卵・ご飯）', mealTypes: ['breakfast'], keywords: ['朝食', '納豆'], items: [['rice', 150], ['natto', 45], ['egg', 50], ['miso-soup', 160]] },
  { id: 'toast-breakfast', title: 'トースト朝食', mealTypes: ['breakfast'], keywords: ['朝食', 'パン'], items: [['bread', 60], ['egg', 50], ['ham', 20], ['cafe-latte', 200]] },
  { id: 'salad-chicken-set', title: 'サラダチキンとサラダ', mealTypes: ['lunch', 'dinner'], keywords: ['サラダ', 'チキン', 'ダイエット'], items: [['salad-chicken', 110], ['salad-bowl', 150], ['broccoli', 60]] },
  { id: 'sushi-set', title: '寿司の盛り合わせ', mealTypes: ['lunch', 'dinner'], keywords: ['寿司'], items: [['sushi-set', 300], ['miso-soup', 160]] },
  { id: 'gyoza-set', title: '餃子定食', mealTypes: ['lunch', 'dinner'], keywords: ['餃子', '定食'], items: [['rice', 200], ['gyoza', 120], ['miso-soup', 160]] },
  { id: 'udon-set', title: 'うどん', mealTypes: ['lunch', 'dinner'], keywords: ['うどん', '麺'], items: [['udon', 250], ['egg', 50], ['spinach', 30]] },
  { id: 'sandwich-snack', title: 'サンドイッチ', mealTypes: ['breakfast', 'lunch', 'snack'], keywords: ['サンド', 'パン'], items: [['bread', 90], ['ham', 30], ['cheese', 20], ['lettuce', 20]] },
  { id: 'fruit-yogurt', title: 'ヨーグルトと果物', mealTypes: ['breakfast', 'snack'], keywords: ['ヨーグルト', 'フルーツ'], items: [['yogurt', 120], ['banana', 100], ['strawberry', 50]] },
];

export function buildItemsFromTemplate(template: MealTemplate): MealItem[] {
  const items: MealItem[] = [];
  for (const [foodId, grams] of template.items) {
    const food = getFoodById(foodId);
    if (food) items.push(makeItemFromFood(food, grams));
  }
  return items;
}

export function searchTemplates(query: string): MealTemplate[] {
  const q = query.trim();
  if (!q) return MEAL_TEMPLATES;
  return MEAL_TEMPLATES.filter((t) => t.title.includes(q) || t.keywords.some((k) => k.includes(q)));
}
