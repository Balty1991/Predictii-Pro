import { describe, expect, it } from "vitest";
import { buildAccumulator, calculateClv, calculateConsensusScore, calculateFairOdds, calculateSelectionMetrics, projectPyramidStep } from "./predictionMath";

describe("prediction math", () => {
  it("calculates implied probability, fair odds and positive value", () => {
    expect(calculateSelectionMetrics(60, 2, 80, 0.8)).toMatchObject({
      impliedProbability: 50,
      fairOdds: 1.667,
      edge: 10,
      expectedValue: 20,
      grade: "A_PLUS",
    });
  });

  it("calculates fair odds from the model probability even when a market price is unavailable", () => {
    expect(calculateFairOdds(62)).toBe(1.613);
    expect(calculateSelectionMetrics(62, null)).toBeNull();
  });

  it("measures positive CLV when the selected price is higher than the latest available price", () => {
    expect(calculateClv(1.8, 1.65)).toBe(9.09);
    expect(calculateClv(1.8, null)).toBeNull();
  });

  it("scores alignment between the model probability and the market implied probability", () => {
    expect(calculateConsensusScore(62, 60)).toBe(96);
    expect(calculateConsensusScore(62, null)).toBeNull();
  });

  it("does not construct tickets from correlated selections or negative-value prices", () => {
    const plan = buildAccumulator(
      [
        { id: 1, eventId: 11, competitionId: 1, odds: 1.35, probability: 80, contextScore: 78, confidence: 0.8 },
        { id: 2, eventId: 12, competitionId: 2, odds: 1.4, probability: 78, contextScore: 71, confidence: 0.76 },
        { id: 3, eventId: 11, competitionId: 1, odds: 1.5, probability: 75, contextScore: 72, confidence: 0.74 },
        { id: 4, eventId: 13, competitionId: 3, odds: 1.7, probability: 48, contextScore: 55, confidence: 0.55 },
      ],
      1.7,
      2.2,
    );

    expect(plan).not.toBeNull();
    expect(plan?.totalOdds).toBeCloseTo(2.1, 2);
    expect(new Set(plan?.selections.map(selection => selection.eventId)).size).toBe(plan?.selections.length);
  });

  it("caps pyramid exposure and preserves locked profit", () => {
    const projection = projectPyramidStep({
      baseStake: 10,
      currentBankroll: 100,
      initialBankroll: 50,
      reinvestRate: 0.9,
      profitLockRate: 0.4,
      currentStep: 3,
      maxSteps: 5,
      targetOdds: 1.4,
    });

    expect(projection.retainedProfit).toBe(20);
    expect(projection.stake).toBe(60);
    expect(projection.projectedReturn).toBe(84);
    expect(projection.action).toBe("continue");
  });

  it("excludes a selection when its current price has materially degraded from opening", () => {
    const plan = buildAccumulator([
      { id: 10, eventId: 101, odds: 1.7, openingOdds: 2, probability: 70, contextScore: 80, confidence: 0.8 },
      { id: 11, eventId: 102, odds: 1.4, openingOdds: 1.4, probability: 79, contextScore: 70, confidence: 0.75 },
      { id: 12, eventId: 103, odds: 1.5, openingOdds: 1.52, probability: 76, contextScore: 72, confidence: 0.76 },
    ], 1.8, 2.3);

    expect(plan?.selections.some(selection => selection.id === 10)).toBe(false);
  });
});
