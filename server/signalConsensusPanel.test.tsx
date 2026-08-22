import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignalConsensusPanel } from "../client/src/components/SignalConsensusPanel";

describe("SignalConsensusPanel", () => {
  it("redă componentele consensului în card", () => {
    const markup = renderToStaticMarkup(<SignalConsensusPanel modelProbability={62} marketProbability={60} consensusScore={96} recommended />);
    expect(markup).toContain("Consens semnale");
    expect(markup).toContain("62.0%");
    expect(markup).toContain("60.0%");
    expect(markup).toContain("recomandă");
  });
});
