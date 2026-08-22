export type SignalConsensus = {
  score: number;
  modelProbability: number;
  marketProbability: number;
  difference: number;
  marketAlignment: number;
  modelConfidence: number;
  contextScore: number;
  alignment: "puternic" | "moderat" | "redus";
  providerSignal: "recomandă" | "urmărește";
  externalMarketStatus: "neinterogată";
};

export const LOCAL_CONSENSUS_WEIGHTS = {
  marketAlignment: 0.45,
  modelConfidence: 0.2,
  context: 0.2,
  providerSignal: 0.15,
} as const;

function normalizedPercent(value: number | null | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  const normalized = Number(value) <= 1 ? Number(value) * 100 : Number(value);
  return Math.max(0, Math.min(100, normalized));
}

export function calculateLocalConsensusScore(input: { modelProbability: number; marketProbability: number | null; modelConfidence?: number | null; contextScore?: number | null; recommended: boolean }) {
  if (!Number.isFinite(input.modelProbability) || input.modelProbability <= 0 || input.modelProbability >= 100 || input.marketProbability === null || !Number.isFinite(input.marketProbability)) return null;
  const difference = Number((input.modelProbability - input.marketProbability).toFixed(1));
  const marketAlignment = Math.max(0, 100 - Math.abs(difference) * 2);
  const modelConfidence = normalizedPercent(input.modelConfidence, 50);
  const contextScore = normalizedPercent(input.contextScore, 50);
  const providerScore = input.recommended ? 100 : 45;
  const score = Number((
    marketAlignment * LOCAL_CONSENSUS_WEIGHTS.marketAlignment
    + modelConfidence * LOCAL_CONSENSUS_WEIGHTS.modelConfidence
    + contextScore * LOCAL_CONSENSUS_WEIGHTS.context
    + providerScore * LOCAL_CONSENSUS_WEIGHTS.providerSignal
  ).toFixed(1));
  return { score, difference, marketAlignment: Number(marketAlignment.toFixed(1)), modelConfidence: Number(modelConfidence.toFixed(1)), contextScore: Number(contextScore.toFixed(1)) };
}

export function buildSignalConsensus(input: { modelProbability: number; marketProbability: number | null; modelConfidence?: number | null; contextScore?: number | null; recommended: boolean }): SignalConsensus | null {
  if (input.marketProbability === null) return null;
  const local = calculateLocalConsensusScore(input);
  if (!local) return null;
  const absoluteDifference = Math.abs(local.difference);
  return {
    score: local.score,
    modelProbability: Number(input.modelProbability.toFixed(1)),
    marketProbability: Number(input.marketProbability.toFixed(1)),
    difference: local.difference,
    marketAlignment: local.marketAlignment,
    modelConfidence: local.modelConfidence,
    contextScore: local.contextScore,
    alignment: absoluteDifference <= 3 ? "puternic" : absoluteDifference <= 8 ? "moderat" : "redus",
    providerSignal: input.recommended ? "recomandă" : "urmărește",
    externalMarketStatus: "neinterogată",
  };
}
