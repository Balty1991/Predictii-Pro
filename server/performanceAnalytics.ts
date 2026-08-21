export type SettledPerformanceRecord = {
  sport: string;
  competition: string | null;
  market: string;
  settlementStatus: string;
  odds: number | null;
};

type PerformanceSummary = {
  total: number;
  won: number;
  lost: number;
  roi: number | null;
  winRate: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
};

function round(value: number, precision = 2) {
  return Number(value.toFixed(precision));
}

function summarize(records: SettledPerformanceRecord[]): PerformanceSummary {
  const decided = records.filter(record => record.settlementStatus === "won" || record.settlementStatus === "lost");
  const returns = decided.map(record => record.settlementStatus === "won" ? Math.max(-1, (record.odds ?? 1) - 1) : -1);
  const won = decided.filter(record => record.settlementStatus === "won").length;
  const lost = decided.length - won;
  const mean = returns.length ? returns.reduce((total, value) => total + value, 0) / returns.length : null;
  const variance = mean === null ? null : returns.reduce((total, value) => total + Math.pow(value - mean, 2), 0) / returns.length;
  let equity = 0;
  let peak = 0;
  let drawdown = 0;
  for (const result of returns) {
    equity += result;
    peak = Math.max(peak, equity);
    drawdown = Math.min(drawdown, equity - peak);
  }

  return {
    total: decided.length,
    won,
    lost,
    roi: mean === null ? null : round(mean * 100),
    winRate: decided.length ? round((won / decided.length) * 100, 1) : null,
    volatility: variance === null ? null : round(Math.sqrt(variance) * 100),
    maxDrawdown: returns.length ? round(drawdown * 100) : null,
  };
}

function oddsBucket(odds: number | null) {
  if (odds === null || !Number.isFinite(odds)) return "Fără cotă";
  if (odds < 1.4) return "1.01–1.39";
  if (odds < 1.8) return "1.40–1.79";
  if (odds < 2.2) return "1.80–2.19";
  return "2.20+";
}

function groupDimension(records: SettledPerformanceRecord[], keyOf: (record: SettledPerformanceRecord) => string, kind: "market" | "competition" | "odds") {
  const grouped = new Map<string, SettledPerformanceRecord[]>();
  for (const record of records) {
    const key = keyOf(record);
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }
  return Array.from(grouped.entries()).map(([label, entries]) => ({ label, kind, ...summarize(entries) }))
    .sort((a, b) => b.total - a.total || (b.roi ?? -Infinity) - (a.roi ?? -Infinity));
}

export function buildPerformanceAnalytics(records: SettledPerformanceRecord[]) {
  const grouped = new Map<string, SettledPerformanceRecord[]>();
  for (const record of records) {
    const key = `${record.sport}::${record.market}`;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }
  const segments = Array.from(grouped.entries()).map(([key, entries]) => {
    const [sport, market] = key.split("::");
    return { sport, market, ...summarize(entries) };
  }).sort((a, b) => b.total - a.total || (b.roi ?? -Infinity) - (a.roi ?? -Infinity));

  return {
    summary: summarize(records),
    segments,
    competitions: groupDimension(records, record => record.competition?.trim() || "Competiție necunoscută", "competition"),
    oddsBuckets: groupDimension(records, record => oddsBucket(record.odds), "odds"),
  };
}
