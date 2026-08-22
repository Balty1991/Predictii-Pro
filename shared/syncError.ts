export function getSafeSportsSyncError(message: string | null | undefined) {
  const normalized = String(message ?? "").toLowerCase();
  if (normalized.includes("invalid payload") || normalized.includes("expected object") || normalized.includes("received null") || normalized.includes("json")) {
    return "Furnizorul a trimis temporar un răspuns gol sau nevalid. Nu au fost salvate date incomplete; aplicația va reîncerca automat în siguranță.";
  }
  if (normalized.includes("taster_exhausted") || normalized.includes("limita zilnică")) {
    return "Cotele live sunt în pauză deoarece limita zilnică a furnizorului a fost atinsă. Aplicația va reîncerca automat după resetarea sursei.";
  }
  return "Sincronizarea nu este disponibilă momentan. Aplicația va reîncerca automat, fără a estima cote sau predicții.";
}
