import { describe, expect, it } from "vitest";
import { applyAdaptiveThreshold, buildAdaptiveThresholds, MINIMUM_ADAPTIVE_SAMPLE } from "./adaptiveThresholds";

const selection = { market: "over_under_15", outcome: "over", label: "Peste 1.5 goluri", probability: 62, recommendationStatus: "recommended" as const, currentOdds: 1.4, openingOdds: 1.4, expectedValue: 8, impliedProbability: 71.4, fairOdds: 1.61, consensusScore: 81, edge: 4, grade: "A" as const, contextScore: 70, reasonCodes: [] };

describe("praguri adaptive", () => {
  it("nu activează calibrarea înainte de eșantionul minim", () => {
    const threshold = buildAdaptiveThresholds([{ market: "over_under_15", total: MINIMUM_ADAPTIVE_SAMPLE - 1, won: 20, averageProbability: 72 }]).get("over_under_15");
    expect(threshold).toMatchObject({ enabled: false, minimumProbability: null });
    const applied = applyAdaptiveThreshold(selection, threshold);
    expect(applied.recommendationStatus).toBe("recommended");
    expect(applied.reasonCodes[0]).toContain("Prag adaptiv în așteptare");
  });

  it("ridică pragul când piața are rată de reușită sub țintă și retrogradează selecția sub prag", () => {
    const threshold = buildAdaptiveThresholds([{ market: "over_under_15", total: 40, won: 16, averageProbability: 70 }]).get("over_under_15");
    expect(threshold).toMatchObject({ enabled: true, minimumProbability: 75.3 });
    const applied = applyAdaptiveThreshold(selection, threshold);
    expect(applied.recommendationStatus).toBe("watch");
    expect(applied.reasonCodes[0]).toContain("sub minimul");
  });
});
