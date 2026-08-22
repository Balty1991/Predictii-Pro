import { describe, expect, it } from "vitest";
import { canResetActivePyramidStep } from "./pyramidStepReset";

describe("resetarea pasului activ de piramidă", () => {
  it("permite resetarea numai pentru pasul activ fără bilet real", () => {
    expect(canResetActivePyramidStep({ status: "active", ticketId: null })).toBe(true);
  });

  it("blochează pasul asociat unui bilet sau deja decontat", () => {
    expect(canResetActivePyramidStep({ status: "active", ticketId: 42 })).toBe(false);
    expect(canResetActivePyramidStep({ status: "won", ticketId: null })).toBe(false);
  });
});
