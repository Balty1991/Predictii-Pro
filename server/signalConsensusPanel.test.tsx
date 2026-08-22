import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignalConsensusPanel } from "../client/src/components/SignalConsensusPanel";

describe("SignalConsensusPanel", () => {
  it("redă componentele consensului în card", () => {
    const markup = renderToStaticMarkup(<SignalConsensusPanel modelProbability={62} marketProbability={60} modelConfidence={0.8} contextScore={70} recommended />);
    expect(markup).toContain("Consens semnale");
    expect(markup).toContain("62.0%");
    expect(markup).toContain("60.0%");
    expect(markup).toContain("Încredere");
    expect(markup).toContain("Context");
    expect(markup).toContain("recomandă");
    expect(markup).toContain("Piață externă");
    expect(markup).toContain("neinterogată");
  });
});
