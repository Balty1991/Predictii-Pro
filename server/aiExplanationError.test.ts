import { describe, expect, it } from "vitest";
import { getSafeAiExplanationError } from "../shared/aiExplanationError";

describe("feedback pentru explicațiile AI", () => {
  it("păstrează mesajul util și ascunde detaliile tehnice ale furnizorului AI", () => {
    expect(getSafeAiExplanationError("upstream model failed: token invalid")).toBe("Explicația AI nu a putut fi generată momentan. Datele selecției rămân neschimbate; încearcă din nou peste câteva momente.");
  });

  it("explică separat situația unei selecții care nu mai există", () => {
    expect(getSafeAiExplanationError("Selecția nu a fost găsită.")).toBe("Selecția nu mai este disponibilă. Reîncarcă lista și încearcă din nou.");
  });
});
