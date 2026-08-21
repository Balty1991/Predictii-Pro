import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { ContextFactorGrid } from "../client/src/components/ContextFactorGrid";

describe("ContextFactorGrid", () => {
  it("afișează în card factorii contextuali suplimentari persistați", () => {
    const markup = renderToStaticMarkup(<ContextFactorGrid reasonCodes={[
      "Formă echipe: 80/100",
      "Confruntări directe: 65/100",
      "Arbitru: 75/100",
    ]} />);

    expect(markup).toContain("Factori contextuali");
    expect(markup).toContain("Formă echipe");
    expect(markup).toContain("80/100");
    expect(markup).toContain("Confruntări directe");
    expect(markup).toContain("Arbitru");
  });
});
