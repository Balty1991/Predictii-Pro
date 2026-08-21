import { describe, expect, it } from "vitest";
import { calculateOddsMovement } from "../shared/oddsMovement";

describe("mișcarea cotei", () => {
  it("identifică scăderea unei cote față de deschidere", () => {
    expect(calculateOddsMovement(1.76, 1.9)).toMatchObject({
      direction: "shortening",
      absoluteDelta: -0.14,
    });
  });

  it("identifică creșterea unei cote față de deschidere", () => {
    expect(calculateOddsMovement(2.08, 1.9)).toMatchObject({
      direction: "drifting",
      absoluteDelta: 0.18,
    });
  });

  it("tratează variațiile minore ca stabile și respinge datele incomplete", () => {
    expect(calculateOddsMovement(1.9005, 1.9)?.direction).toBe("flat");
    expect(calculateOddsMovement(null, 1.9)).toBeNull();
  });
});
