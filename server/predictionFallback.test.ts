import { describe, expect, it } from "vitest";
import { SportsApiError } from "./sportsApi";
import { shouldUseUpcomingEventsFallback } from "./predictionFallback";

describe("fallback pentru evenimente viitoare", () => {
  it("pornește doar când furnizorul trimite un payload nevalid", () => {
    expect(shouldUseUpcomingEventsFallback(new SportsApiError("payload gol", 502))).toBe(true);
    expect(shouldUseUpcomingEventsFallback(new SportsApiError("limită", 429))).toBe(false);
  });
});
