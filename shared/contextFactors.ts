export type ContextFactor = { label: string; value: string; tone: "positive" | "neutral" };

export function buildContextFactors(reasons: string[]): ContextFactor[] {
  return reasons.map<ContextFactor>(reason => {
    if (reason.startsWith("Probabilitate model:")) return { label: "Model", value: reason.replace("Probabilitate model:", "").trim(), tone: "positive" };
    if (reason.startsWith("Încredere model:")) return { label: "Încredere", value: reason.replace("Încredere model:", "").trim(), tone: "positive" };
    if (reason.startsWith("xG model:")) return { label: "xG", value: reason.replace("xG model:", "").trim(), tone: "positive" };
    if (reason.startsWith("Cota este în mișcare:")) return { label: "Piață", value: reason.replace("Cota este în mișcare:", "").trim(), tone: "neutral" };
    const contextualMatch = reason.match(/^(Formă echipe|Confruntări directe|Lot și line-up|Antrenori|Arbitru|Deplasare|Condiții meci):\s*(.+)$/);
    if (contextualMatch) return { label: contextualMatch[1], value: contextualMatch[2], tone: "positive" };
    if (reason === "xG contextual indisponibil în feed") return { label: "xG", value: "Indisponibil", tone: "neutral" };
    if (reason === "Fără semnal recent de mișcare a cotei") return { label: "Piață", value: "Fără semnal", tone: "neutral" };
    return { label: "Context", value: reason, tone: "neutral" };
  }).slice(0, 4);
}
