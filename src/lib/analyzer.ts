import { getFoodById } from './foods';
import { mealTotals } from './nutrition';
import { buildItemsFromTemplate, MEAL_TEMPLATES, type MealTemplate } from './templates';
import type { MealItem, MealType, Nutrients } from './types';

/**
 * 写真解析の設計（docs/DESIGN.md 参照）
 *
 * 現時点で「写真から料理を自動判定するオンデバイス学習モデル」は本アプリに
 * 同梱していない。そのためデフォルトのプロバイダは、写真の内容を判定したとは
 * 主張せず、候補（料理テンプレート＋履歴の頻出食品）を提示してユーザーに
 * 選択・補正してもらう方式を採る。未実装のAIを実装済みと表示しないための設計。
 *
 * 将来、ライセンスが明確な食事分類モデル（Core ML等）を組み込む場合は
 * FoodAnalyzer を実装した別プロバイダに差し替える。
 */

export interface AnalysisCandidate {
  id: string;
  title: string;
  items: MealItem[];
  totals: Nutrients;
  /** 候補の由来。人手履歴ベースの提案であることをUIで明示するために使う */
  reason: 'history' | 'template' | 'popular';
  /** 分類モデル由来の信頼度（0-1）。候補提示方式では null（= 自動判定していない） */
  confidence: number | null;
}

export interface FoodAnalyzer {
  readonly kind: 'candidate-suggestion' | 'on-device-classifier';
  analyze(input: { photoUri: string; mealType: MealType; recentFoodIds: string[] }): Promise<AnalysisCandidate[]>;
}

function candidateFromTemplate(template: MealTemplate, reason: AnalysisCandidate['reason']): AnalysisCandidate {
  const items = buildItemsFromTemplate(template);
  return {
    id: `template-${template.id}`,
    title: template.title,
    items,
    totals: mealTotals({ items }),
    reason,
    confidence: null,
  };
}

export const candidateSuggestionAnalyzer: FoodAnalyzer = {
  kind: 'candidate-suggestion',
  async analyze({ mealType, recentFoodIds }) {
    const candidates: AnalysisCandidate[] = [];
    const seen = new Set<string>();

    // 1) その食事区分でよく使うテンプレートを優先
    for (const t of MEAL_TEMPLATES) {
      if (t.mealTypes.includes(mealType) && !seen.has(t.id)) {
        candidates.push(candidateFromTemplate(t, 'template'));
        seen.add(t.id);
      }
    }
    // 2) 履歴で頻出の食品を単品候補として追加
    const freq = new Map<string, number>();
    for (const id of recentFoodIds) freq.set(id, (freq.get(id) ?? 0) + 1);
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [foodId] of sorted) {
      const food = getFoodById(foodId);
      if (!food) continue;
      const items = buildItemsFromTemplate({ id: foodId, title: food.name, mealTypes: [], keywords: [], items: [[foodId, food.defaultGrams]] });
      candidates.push({ id: `history-${foodId}`, title: food.name, items, totals: mealTotals({ items }), reason: 'history', confidence: null });
    }
    // 3) 残りのテンプレート
    for (const t of MEAL_TEMPLATES) {
      if (!seen.has(t.id)) {
        candidates.push(candidateFromTemplate(t, 'popular'));
        seen.add(t.id);
      }
    }
    return candidates;
  },
};

/** 現在有効な解析プロバイダ。オンデバイスモデルは未搭載のため候補提示方式。 */
export const activeAnalyzer: FoodAnalyzer = candidateSuggestionAnalyzer;
