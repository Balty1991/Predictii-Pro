import { describe, expect, it } from "vitest";
import { buildSignalConsensus } from "../shared/signalConsensus";

describe("consensul de semnale", () => {
  it("compară transparent modelul cu piața și semnalul furnizorului", () => {
    expect(buildSignalConsensus({ modelProbability: 62, marketProbability: 60, consensusScore: 96, recommended: true })).toEqual({ score: 96, modelProbability: 62, marketProbability: 60, difference: 2, alignment: "puternic", providerSignal: "recomandă" });
  });

  it("nu inventează consens când nu există probabilitate de piață", () => {
    expect(buildSignalConsensus({ modelProbability: 62, marketProbability: null, consensusScore: null, recommended: false })).toBeNull();
  });
});
