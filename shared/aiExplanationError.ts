export function getSafeAiExplanationError(message?: string | null) {
  if (typeof message === "string" && message.toLowerCase().includes("nu a fost găsită")) {
    return "Selecția nu mai este disponibilă. Reîncarcă lista și încearcă din nou.";
  }
  return "Explicația AI nu a putut fi generată momentan. Datele selecției rămân neschimbate; încearcă din nou peste câteva momente.";
}
