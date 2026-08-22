import type { NormalizedSelection } from "./predictionSync";

export type MarketSettlementSummary = { market: string; total: number; won: number; averageProbability: number };

export const MINIMUM_ADAPTIVE_SAMPLE = 30;
const TARGET_WIN_RATE = 55;

export type AdaptiveThreshold = { market: string; enabled: boolean; sampleSize: number; winRate: number | null; minimumProbability: number | null };

export function buildAdaptiveThresholds(summaries: MarketSettlementSummary[]) {
  const result = new Map<string, AdaptiveThreshold>();
  for (const summary of summaries) {
    const winRate = summary.total ? (summary.won / summary.total) * 100 : null;
    if (summary.total < MINIMUM_ADAPTIVE_SAMPLE || winRate === null) {
      result.set(summary.market, { market: summary.market, enabled: false, sampleSize: summary.total, winRate, minimumProbability: null });
      continue;
    }
    const adjustment = (TARGET_WIN_RATE - winRate) * 0.35;
    const minimumProbability = Math.max(45, Math.min(85, Number((summary.averageProbability + adjustment).toFixed(1))));
    result.set(summary.market, { market: summary.market, enabled: true, sampleSize: summary.total, winRate: Number(winRate.toFixed(1)), minimumProbability });
  }
  return result;
}

export function applyAdaptiveThreshold(selection: NormalizedSelection, threshold: AdaptiveThreshold | undefined): NormalizedSelection {
  if (selection.recommendationStatus !== "recommended") return selection;
  if (!threshold || !threshold.enabled) {
    const sampleSize = threshold?.sampleSize ?? 0;
    return { ...selection, reasonCodes: [...selection.reasonCodes, `Prag adaptiv în așteptare: ${sampleSize}/${MINIMUM_ADAPTIVE_SAMPLE} rezultate confirmate pentru piață`] };
  }
  if (selection.probability < (threshold.minimumProbability ?? 100)) {
    return { ...selection, recommendationStatus: "watch", reasonCodes: [...selection.reasonCodes, `Prag adaptiv: probabilitate ${selection.probability.toFixed(1)}% sub minimul ${threshold.minimumProbability?.toFixed(1)}% calibrat din ${threshold.sampleSize} rezultate`] };
  }
  return { ...selection, reasonCodes: [...selection.reasonCodes, `Prag adaptiv validat: minimum ${threshold.minimumProbability?.toFixed(1)}% din ${threshold.sampleSize} rezultate confirmate`] };
}
