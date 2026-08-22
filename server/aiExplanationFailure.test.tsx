import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiExplanationFailure } from "../client/src/components/PredictionCard";

describe("mesajul vizibil de eșec pentru explicația AI", () => {
  it("redă un alert cu instrucțiune de reîncercare și acțiune de ascundere", () => {
    const markup = renderToStaticMarkup(<AiExplanationFailure message="Explicația AI nu a putut fi generată momentan. Încearcă din nou." onDismiss={() => undefined} />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Explicația AI nu a putut fi generată momentan.");
    expect(markup).toContain("Ascunde mesajul");
  });
});
