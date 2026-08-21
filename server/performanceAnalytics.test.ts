import { describe, expect, it } from "vitest";
import { buildPerformanceAnalytics } from "./performanceAnalytics";

describe("analitica de performanță", () => {
  it("calculează ROI, rată, volatilitate și drawdown din rezultate confirmate", () => {
    const analytics = buildPerformanceAnalytics([
      { sport: "football", competition: "Liga A", market: "over_15", settlementStatus: "won", odds: 1.8 },
      { sport: "football", competition: "Liga A", market: "over_15", settlementStatus: "lost", odds: 1.8 },
      { sport: "football", competition: "Liga B", market: "1x2", settlementStatus: "won", odds: 2.2 },
    ]);

    expect(analytics.summary).toMatchObject({ total: 3, won: 2, lost: 1, roi: 33.33, winRate: 66.7, maxDrawdown: -100 });
    expect(analytics.summary.volatility).toBeGreaterThan(0);
    expect(analytics.segments).toHaveLength(2);
    expect(analytics.competitions.map(item => item.label)).toEqual(["Liga A", "Liga B"]);
    expect(analytics.oddsBuckets.map(item => item.label)).toEqual(["1.80–2.19", "2.20+"]);
  });

  it("ignoră rezultatele fără decontare decisă", () => {
    const analytics = buildPerformanceAnalytics([{ sport: "football", competition: null, market: "btts", settlementStatus: "void", odds: 1.9 }]);
    expect(analytics.summary.roi).toBeNull();
    expect(analytics.segments[0]?.total).toBe(0);
  });
});
