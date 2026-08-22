export type CandidateSelection = {
  id: number;
  eventId: number;
  competitionId?: number | null;
  odds: number;
  openingOdds?: number | null;
  probability: number;
  contextScore?: number | null;
  confidence?: number | null;
};

export type SelectionMetrics = {
  impliedProbability: number;
  fairOdds: number;
  edge: number;
  expectedValue: number;
  grade: "A_PLUS" | "A" | "B" | "C" | "D" | "WATCH";
};

const round = (value: number, decimals = 2) => Number(value.toFixed(decimals));

export function calculateFairOdds(probabilityPercent: number) {
  if (!Number.isFinite(probabilityPercent) || probabilityPercent <= 0 || probabilityPercent >= 100) return null;
  return round(100 / probabilityPercent, 3);
}

export function calculateClv(entryOdds: number, latestOdds: number | null | undefined) {
  if (!Number.isFinite(entryOdds) || entryOdds <= 1 || !latestOdds || !Number.isFinite(latestOdds) || latestOdds <= 1) return null;
  return round(((entryOdds / latestOdds) - 1) * 100);
}

export function calculateConsensusScore(modelProbability: number, impliedProbability: number | null | undefined, contextScore?: number | null, confidence?: number | null, recommended = false) {
  if (!Number.isFinite(modelProbability) || modelProbability <= 0 || modelProbability >= 100 || !impliedProbability || !Number.isFinite(impliedProbability)) return null;
  const marketAlignment = Math.max(0, 100 - Math.abs(modelProbability - impliedProbability) * 2);
  const normalizedConfidence = Math.max(0, Math.min(100, (confidence ?? 0.5) * 100));
  const normalizedContext = Math.max(0, Math.min(100, contextScore ?? 50));
  const providerScore = recommended ? 100 : 45;
  return round(marketAlignment * 0.45 + normalizedConfidence * 0.2 + normalizedContext * 0.2 + providerScore * 0.15);
}

export function calculateSelectionMetrics(
  probabilityPercent: number,
  odds: number | null | undefined,
  contextScore?: number | null,
  confidence?: number | null,
): SelectionMetrics | null {
  if (!Number.isFinite(probabilityPercent) || probabilityPercent <= 0 || probabilityPercent >= 100) return null;
  if (!odds || !Number.isFinite(odds) || odds <= 1) return null;

  const probability = probabilityPercent / 100;
  const impliedProbability = 100 / odds;
  const fairOdds = 1 / probability;
  const edge = probabilityPercent - impliedProbability;
  const expectedValue = (probability * odds - 1) * 100;
  const quality = edge + Math.max(0, (contextScore ?? 50) - 50) * 0.12 + Math.max(0, ((confidence ?? 0.5) * 100) - 50) * 0.08;

  const grade: SelectionMetrics["grade"] =
    expectedValue > 8 && quality >= 14 ? "A_PLUS" :
    expectedValue > 4 && quality >= 9 ? "A" :
    expectedValue > 1 && quality >= 4 ? "B" :
    expectedValue > 0 ? "C" :
    expectedValue > -3 ? "D" : "WATCH";

  return {
    impliedProbability: round(impliedProbability),
    fairOdds: round(fairOdds, 3),
    edge: round(edge),
    expectedValue: round(expectedValue),
    grade,
  };
}

export type AccumulatorPlan = {
  selections: CandidateSelection[];
  totalOdds: number;
  combinedProbability: number;
  expectedValue: number;
};

export const MIN_CONTEXT_SCORE_FOR_TICKET = 50;
export const MIN_CONFIDENCE_FOR_TICKET = 0.45;
export const MAX_ODDS_VOLATILITY_PERCENT = 12;

export function hasExcessiveOddsVolatility(currentOdds: number, openingOdds: number | null | undefined) {
  if (!openingOdds || !Number.isFinite(openingOdds) || openingOdds <= 1) return false;
  return Math.abs((currentOdds / openingOdds - 1) * 100) > MAX_ODDS_VOLATILITY_PERCENT;
}

export function isTicketCandidateEligible(selection: CandidateSelection) {
  const metrics = calculateSelectionMetrics(selection.probability, selection.odds, selection.contextScore, selection.confidence);
  const materiallyDegraded = selection.openingOdds !== null && selection.openingOdds !== undefined && selection.odds < selection.openingOdds * 0.95;
  const volatilePrice = hasExcessiveOddsVolatility(selection.odds, selection.openingOdds);
  const weakContext = selection.contextScore !== null && selection.contextScore !== undefined && selection.contextScore < MIN_CONTEXT_SCORE_FOR_TICKET;
  const weakConfidence = selection.confidence !== null && selection.confidence !== undefined && selection.confidence < MIN_CONFIDENCE_FOR_TICKET;
  return Boolean(metrics && metrics.expectedValue > 0 && selection.odds > 1 && !materiallyDegraded && !volatilePrice && !weakContext && !weakConfidence);
}

export function buildAccumulator(
  candidates: CandidateSelection[],
  targetOddsMin: number,
  targetOddsMax: number,
  maxSelections = 4,
): AccumulatorPlan | null {
  const eligible = candidates
    .filter(isTicketCandidateEligible)
    .sort((a, b) => {
      const aMetrics = calculateSelectionMetrics(a.probability, a.odds, a.contextScore, a.confidence)!;
      const bMetrics = calculateSelectionMetrics(b.probability, b.odds, b.contextScore, b.confidence)!;
      return bMetrics.expectedValue - aMetrics.expectedValue || b.probability - a.probability;
    })
    .slice(0, 18);

  let best: AccumulatorPlan | null = null;

  const scorePlan = (selections: CandidateSelection[]) => {
    const totalOdds = selections.reduce((total, selection) => total * selection.odds, 1);
    if (totalOdds < targetOddsMin || totalOdds > targetOddsMax) return;

    const combinedProbability = selections.reduce((total, selection) => total * (selection.probability / 100), 1);
    const expectedValue = (combinedProbability * totalOdds - 1) * 100;
    if (expectedValue <= 0) return;

    const plan = {
      selections,
      totalOdds: round(totalOdds, 3),
      combinedProbability: round(combinedProbability * 100),
      expectedValue: round(expectedValue),
    };
    if (!best || plan.expectedValue > best.expectedValue || (plan.expectedValue === best.expectedValue && plan.combinedProbability > best.combinedProbability)) {
      best = plan;
    }
  };

  const choose = (startIndex: number, current: CandidateSelection[]) => {
    scorePlan(current);
    if (current.length >= maxSelections) return;

    for (let index = startIndex; index < eligible.length; index += 1) {
      const candidate = eligible[index];
      const hasSameEvent = current.some(selection => selection.eventId === candidate.eventId);
      const inSameCompetition = current.some(selection => selection.competitionId && selection.competitionId === candidate.competitionId);
      if (hasSameEvent || inSameCompetition) continue;
      choose(index + 1, [...current, candidate]);
    }
  };

  choose(0, []);
  return best;
}

export type PyramidConfig = {
  baseStake: number;
  currentBankroll: number;
  initialBankroll: number;
  reinvestRate: number;
  profitLockRate: number;
  currentStep: number;
  maxSteps: number;
  targetOdds: number;
};

export type PyramidProjection = {
  stake: number;
  retainedProfit: number;
  projectedReturn: number;
  projectedBankroll: number;
  action: "start" | "continue" | "complete";
};

export function projectPyramidStep(config: PyramidConfig): PyramidProjection {
  const bankroll = Math.max(0, config.currentBankroll);
  const grossProfit = Math.max(0, bankroll - config.initialBankroll);
  const retainedProfit = config.currentStep > 1 ? grossProfit * Math.max(0, Math.min(1, config.profitLockRate)) : 0;
  const eligibleBankroll = Math.max(0, bankroll - retainedProfit);
  const proposedStake = config.currentStep === 1 ? config.baseStake : eligibleBankroll * config.reinvestRate;
  const stake = Math.min(Math.max(0, proposedStake), bankroll * 0.6);
  const projectedReturn = stake * config.targetOdds;
  const projectedBankroll = bankroll - stake + projectedReturn;

  return {
    stake: round(stake),
    retainedProfit: round(retainedProfit),
    projectedReturn: round(projectedReturn),
    projectedBankroll: round(projectedBankroll),
    action: config.currentStep === 1 ? "start" : config.currentStep >= config.maxSteps ? "complete" : "continue",
  };
}
