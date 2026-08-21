import { describe, expect, it } from "vitest";
import { buildContextFactors } from "../shared/contextFactors";

describe("factorii contextuali", () => {
  it("traduce numai semnalele persistate în factori expliciți", () => {
    expect(buildContextFactors([
      "Probabilitate model: 72.5%",
      "Încredere model: 78%",
      "xG model: 1.84 – 0.92",
      "Fără semnal recent de mișcare a cotei",
    ])).toEqual([
      { label: "Model", value: "72.5%", tone: "positive" },
      { label: "Încredere", value: "78%", tone: "positive" },
      { label: "xG", value: "1.84 – 0.92", tone: "positive" },
      { label: "Piață", value: "Fără semnal", tone: "neutral" },
    ]);
  });

  it("mapează transparent toți factorii contextuali suplimentari", () => {
    expect(buildContextFactors([
      "Formă echipe: 80/100",
      "Confruntări directe: 65/100",
      "Lot și line-up: 74/100",
      "Antrenori: 70/100",
      "Arbitru: 75/100",
      "Deplasare: 62/100",
      "Condiții meci: 68/100",
    ])).toEqual([
      { label: "Formă echipe", value: "80/100", tone: "positive" },
      { label: "Confruntări directe", value: "65/100", tone: "positive" },
      { label: "Lot și line-up", value: "74/100", tone: "positive" },
      { label: "Antrenori", value: "70/100", tone: "positive" },
    ]);
  });
});
