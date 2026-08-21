import { describe, expect, it } from "vitest";
import { evaluateSelection } from "./resultSettlement";

describe("result settlement", () => {
  it("settles match-result, goals and BTTS selections from final scores", () => {
    expect(evaluateSelection("1x2", "HOME", 2, 1)).toBe("won");
    expect(evaluateSelection("over_under_25", "over", 2, 1)).toBe("won");
    expect(evaluateSelection("over_under_35", "under", 2, 1)).toBe("won");
    expect(evaluateSelection("btts", "yes", 2, 1)).toBe("won");
    expect(evaluateSelection("btts", "no", 2, 1)).toBe("lost");
  });

  it("voids unsupported markets instead of inventing a settlement", () => {
    expect(evaluateSelection("total_corners", "over", 2, 1)).toBe("void");
  });
});
