import { calculateConsensusScore, calculateFairOdds, calculateSelectionMetrics } from "./predictionMath";
import type { ApiOdds, ApiPrediction } from "./sportsApi";

export type NormalizedSelection = {
  market: string;
  outcome: string;
  label: string;
  probability: number;
  recommendationStatus: "recommended" | "watch";
  currentOdds: number | null;
  openingOdds: number | null;
  expectedValue: number | null;
  impliedProbability: number | null;
  fairOdds: number | null;
  consensusScore: number | null;
  edge: number | null;
  grade: "A_PLUS" | "A" | "B" | "C" | "D" | "WATCH" | null;
  contextScore: number;
  reasonCodes: string[];
};

const outcomeByFavorite: Record<string, "HOME" | "DRAW" | "AWAY"> = {
  H: "HOME",
  HOME: "HOME",
  D: "DRAW",
  DRAW: "DRAW",
  A: "AWAY",
  AWAY: "AWAY",
};

const marketLabels: Record<string, string> = {
  HOME: "Victorie gazde",
  DRAW: "Egal",
  AWAY: "Victorie oaspeți",
  OVER_15: "Peste 1.5 goluri",
  OVER_25: "Peste 2.5 goluri",
  OVER_35: "Peste 3.5 goluri",
  BTTS_YES: "Ambele echipe marchează",
};

function rounded(value: number) {
  return Number(value.toFixed(2));
}

export type ContextualSignal = { label: string; score: number; contribution: number };

function recordFrom(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizedContextScore(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  if (numeric <= 1) return numeric * 100;
  if (numeric <= 10) return numeric * 10;
  return Math.min(100, numeric);
}

function firstContextScore(sources: Record<string, unknown>[], keys: string[]) {
  for (const source of sources) {
    for (const key of keys) {
      const score = normalizedContextScore(source[key]);
      if (score !== null) return score;
    }
  }
  return null;
}

export function extractContextualSignals(prediction: ApiPrediction): ContextualSignal[] {
  const event = recordFrom(prediction.event);
  const sources = [recordFrom(prediction.context), recordFrom(prediction.contextual_factors), recordFrom(event?.context), recordFrom(event?.contextual_factors)].filter((source): source is Record<string, unknown> => source !== null);
  const definitions = [
    { label: "Formă echipe", keys: ["form_score", "team_form_score", "form"] },
    { label: "Confruntări directe", keys: ["h2h_score", "head_to_head_score"] },
    { label: "Lot și line-up", keys: ["squad_score", "lineup_score", "availability_score"] },
    { label: "Antrenori", keys: ["manager_score", "coach_score"] },
    { label: "Arbitru", keys: ["referee_score"] },
    { label: "Deplasare", keys: ["travel_score", "away_travel_score"] },
    { label: "Condiții meci", keys: ["conditions_score", "weather_score", "pitch_score"] },
  ];

  return definitions.flatMap(definition => {
    const score = firstContextScore(sources, definition.keys);
    if (score === null) return [];
    return [{ label: definition.label, score: rounded(score), contribution: rounded((score - 50) * 0.1) }];
  });
}

export function buildContextScore(prediction: ApiPrediction, isRecommended: boolean) {
  const confidence = (prediction.model?.confidence ?? 0.5) * 100;
  const xg = prediction.markets.expected_goals;
  const xgBalance = xg?.home !== undefined && xg?.away !== undefined ? Math.max(0, 10 - Math.abs(xg.home - xg.away) * 4) : 4;
  const contextualContribution = extractContextualSignals(prediction).reduce((total, signal) => total + signal.contribution, 0);
  return Math.max(0, Math.min(100, rounded(36 + confidence * 0.42 + xgBalance + (isRecommended ? 12 : 0) + Math.max(-10, Math.min(10, contextualContribution)))));
}

export function findOdds(odds: ApiOdds[], market: string, outcome: string) {
  const matching = odds.filter(item => item.market === market && item.outcome === outcome);
  if (!matching.length) return null;
  return matching.reduce((best, item) => Number(item.decimal_odds) > Number(best.decimal_odds) ? item : best);
}

export function normalizePredictionSelections(prediction: ApiPrediction, odds: ApiOdds[]): NormalizedSelection[] {
  const recommendations = prediction.recommendations ?? {};
  const favorite = outcomeByFavorite[String(recommendations.favorite ?? prediction.markets.match_result?.predicted ?? "").toUpperCase()];
  const marketDefinitions = [
    favorite ? {
      market: "1x2",
      outcome: favorite,
      key: favorite,
      probability: favorite === "HOME" ? prediction.markets.match_result?.prob_home : favorite === "DRAW" ? prediction.markets.match_result?.prob_draw : prediction.markets.match_result?.prob_away,
      recommended: recommendations.bet_favorite === true || recommendations.winner === true,
    } : null,
    { market: "over_under_15", outcome: "over", key: "OVER_15", probability: prediction.markets.over_under?.prob_over_15, recommended: recommendations.over_15 === true },
    { market: "over_under_25", outcome: "over", key: "OVER_25", probability: prediction.markets.over_under?.prob_over_25, recommended: recommendations.over_25 === true },
    { market: "over_under_35", outcome: "over", key: "OVER_35", probability: prediction.markets.over_under?.prob_over_35, recommended: recommendations.over_35 === true },
    { market: "btts", outcome: "yes", key: "BTTS_YES", probability: prediction.markets.btts?.prob_yes, recommended: recommendations.btts === true },
  ].filter((item): item is {
    market: string;
    outcome: string;
    key: string;
    probability: number;
    recommended: boolean;
  } => item !== null && typeof item.probability === "number" && item.probability > 0);

  return marketDefinitions.map(definition => {
    const price = findOdds(odds, definition.market, definition.outcome);
    const currentOdds = price ? Number(price.decimal_odds) : null;
    const contextualSignals = extractContextualSignals(prediction);
    const contextScore = buildContextScore(prediction, definition.recommended);
    const metrics = calculateSelectionMetrics(
      definition.probability,
      currentOdds,
      contextScore,
      prediction.model?.confidence,
    );
    const reasonCodes = [
      `Probabilitate model: ${definition.probability.toFixed(1)}%`,
      `Încredere model: ${Math.round((prediction.model?.confidence ?? 0) * 100)}%`,
      prediction.markets.expected_goals?.home !== undefined && prediction.markets.expected_goals?.away !== undefined
        ? `xG model: ${prediction.markets.expected_goals.home.toFixed(2)} – ${prediction.markets.expected_goals.away.toFixed(2)}`
        : "xG contextual indisponibil în feed",
      price?.movement ? `Cota este în mișcare: ${price.movement}` : "Fără semnal recent de mișcare a cotei",
      ...contextualSignals.map(signal => `${signal.label}: ${signal.score.toFixed(0)}/100`),
    ];

    return {
      market: definition.market,
      outcome: definition.outcome,
      label: marketLabels[definition.key],
      probability: definition.probability,
      recommendationStatus: definition.recommended ? "recommended" : "watch",
      currentOdds,
      openingOdds: price?.opening_decimal_odds ? Number(price.opening_decimal_odds) : null,
      expectedValue: metrics?.expectedValue ?? null,
      impliedProbability: metrics?.impliedProbability ?? null,
      fairOdds: metrics?.fairOdds ?? calculateFairOdds(definition.probability),
      consensusScore: calculateConsensusScore(definition.probability, metrics?.impliedProbability),
      edge: metrics?.edge ?? null,
      grade: metrics?.grade ?? null,
      contextScore,
      reasonCodes,
    };
  });
}
