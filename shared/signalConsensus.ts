export type SignalConsensus = {
  score: number;
  modelProbability: number;
  marketProbability: number;
  difference: number;
  alignment: "puternic" | "moderat" | "redus";
  providerSignal: "recomandă" | "urmărește";
  externalMarketStatus: "neinterogată";
};

export function buildSignalConsensus(input: { modelProbability: number; marketProbability: number | null; consensusScore: number | null; recommended: boolean }): SignalConsensus | null {
  if (!Number.isFinite(input.modelProbability) || input.modelProbability <= 0 || input.modelProbability >= 100 || input.marketProbability === null || !Number.isFinite(input.marketProbability)) return null;
  const difference = Number((input.modelProbability - input.marketProbability).toFixed(1));
  const score = input.consensusScore ?? Number(Math.max(0, 100 - Math.abs(difference) * 2).toFixed(0));
  const absoluteDifference = Math.abs(difference);
  return {
    score,
    modelProbability: Number(input.modelProbability.toFixed(1)),
    marketProbability: Number(input.marketProbability.toFixed(1)),
    difference,
    alignment: absoluteDifference <= 3 ? "puternic" : absoluteDifference <= 8 ? "moderat" : "redus",
    providerSignal: input.recommended ? "recomandă" : "urmărește",
    externalMarketStatus: "neinterogată",
  };
}
