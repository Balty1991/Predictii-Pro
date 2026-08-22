import { describe, expect, it } from "vitest";
import { buildSignalConsensus } from "../shared/signalConsensus";

describe("consensul de semnale", () => {
  it("ponderază transparent alinierea pieței, încrederea, contextul și semnalul furnizorului", () => {
    expect(buildSignalConsensus({ modelProbability: 62, marketProbability: 60, modelConfidence: 0.8, contextScore: 70, recommended: true })).toEqual({ score: 88.2, modelProbability: 62, marketProbability: 60, difference: 2, marketAlignment: 96, modelConfidence: 80, contextScore: 70, alignment: "puternic", providerSignal: "recomandă", externalMarketStatus: "neinterogată" });
  });

  it("nu inventează consens când nu există probabilitate de piață", () => {
    expect(buildSignalConsensus({ modelProbability: 62, marketProbability: null, recommended: false })).toBeNull();
  });
});
