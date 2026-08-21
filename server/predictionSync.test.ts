import { describe, expect, it } from "vitest";
import { buildContextScore, extractContextualSignals, normalizePredictionSelections } from "./predictionSync";
import { getManualRefreshCooldownSeconds, hasStrategyEligibleOdds, MAX_EXTERNAL_CALLS_PER_SYNC } from "./predictionSyncService";
import type { ApiPrediction } from "./sportsApi";

describe("prediction mapping", () => {
  it("limitează bugetul unei sincronizări complete la cinci cereri externe", () => {
    expect(MAX_EXTERNAL_CALLS_PER_SYNC).toBe(5);
  });

  it("blochează actualizarea manuală în primele 20 de minute după o sincronizare", () => {
    const completedAt = new Date("2026-08-22T00:00:00.000Z");
    expect(getManualRefreshCooldownSeconds(completedAt, Date.parse("2026-08-22T00:05:00.000Z"))).toBe(900);
    expect(getManualRefreshCooldownSeconds(completedAt, Date.parse("2026-08-22T00:20:00.000Z"))).toBe(0);
  });

  it("procesează numai evenimente cu cote reale utile pentru strategie", () => {
    expect(hasStrategyEligibleOdds([{ event_id: 1, market: "1x2", outcome: "HOME", decimal_odds: 1.35 }])).toBe(true);
    expect(hasStrategyEligibleOdds([{ event_id: 1, market: "1x2", outcome: "HOME", decimal_odds: 1.08 }])).toBe(false);
    expect(hasStrategyEligibleOdds([{ event_id: 1, market: "1x2", outcome: "HOME", decimal_odds: 2.8 }])).toBe(false);
  });

  it("include factorii contextuali disponibili în scor și explicațiile selecției", () => {
    const prediction: ApiPrediction = {
      id: 3,
      event: { id: 12, event_date: "2026-08-22T18:00:00Z", status: "upcoming", home_team: "Alpha", away_team: "Beta" },
      markets: { over_under: { prob_over_15: 74 }, expected_goals: { home: 1.8, away: 1.0 } },
      model: { confidence: 0.7 },
      recommendations: { over_15: true },
      contextual_factors: { form_score: 0.8, h2h_score: 65, referee_score: 7.5 },
    };
    const signals = extractContextualSignals(prediction);
    const selections = normalizePredictionSelections(prediction, [{ event_id: 12, market: "over_under_15", outcome: "over", decimal_odds: 1.5 }]);

    expect(signals.map(signal => signal.label)).toEqual(["Formă echipe", "Confruntări directe", "Arbitru"]);
    expect(buildContextScore(prediction, true)).toBeGreaterThan(80);
    expect(selections[0]?.reasonCodes).toContain("Formă echipe: 80/100");
  });

  it("maps predicted markets and best available odds without creating unsupported selections", () => {
    const prediction: ApiPrediction = {
      id: 1,
      event: { id: 10, event_date: "2026-08-21T18:00:00Z", status: "upcoming", home_team: "Alpha", away_team: "Beta" },
      markets: { match_result: { prob_home: 62, predicted: "H" }, over_under: { prob_over_15: 74 }, btts: { prob_yes: 49 } },
      recommendations: { favorite: "H", bet_favorite: true, over_15: true, btts: false },
      model: { confidence: 0.72, version: "test" },
    };
    const selections = normalizePredictionSelections(prediction, [
      { event_id: 10, market: "1x2", outcome: "HOME", decimal_odds: 1.85, bookmaker_slug: "consensus" },
      { event_id: 10, market: "over_under_15", outcome: "over", decimal_odds: 1.32, bookmaker_slug: "consensus" },
      { event_id: 10, market: "over_under_15", outcome: "over", decimal_odds: 1.38, bookmaker_slug: "alt" },
    ]);

    expect(selections).toHaveLength(3);
    expect(selections.find(selection => selection.label === "Peste 1.5 goluri")?.currentOdds).toBe(1.38);
    expect(selections.find(selection => selection.label === "Victorie gazde")?.recommendationStatus).toBe("recommended");
    expect(selections.find(selection => selection.label === "Ambele echipe marchează")?.recommendationStatus).toBe("watch");
  });
});
