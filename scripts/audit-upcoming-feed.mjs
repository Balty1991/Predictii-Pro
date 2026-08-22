import { readFile } from "node:fs/promises";

const [predictionsRaw, eventsRaw] = await Promise.all([
  readFile("/tmp/audit-predictions.json", "utf8"),
  readFile("/tmp/audit-events.json", "utf8"),
]);

const predictions = JSON.parse(predictionsRaw).results ?? [];
const events = JSON.parse(eventsRaw).results ?? [];
const countBy = (items, mapper) => Object.fromEntries(Object.entries(items.reduce((result, item) => {
  const key = mapper(item) || "nespecificat";
  result[key] = (result[key] ?? 0) + 1;
  return result;
}, {})).sort(([, left], [, right]) => right - left));
const marketCoverage = countBy(predictions, prediction => Object.keys(prediction.markets ?? {}).filter(key => prediction.markets?.[key]).sort().join(" + "));
const competitions = countBy(predictions, prediction => prediction.event?.league_name);
const statuses = countBy(events, event => event.status);
const modelConfidence = predictions.filter(prediction => Number.isFinite(prediction.model?.confidence)).length;
const recommendationCount = predictions.filter(prediction => prediction.recommendations && Object.keys(prediction.recommendations).length > 0).length;

console.log(JSON.stringify({
  predictionsReturned: predictions.length,
  eventsReturned: events.length,
  eventStatuses: statuses,
  modelConfidenceCount: modelConfidence,
  recommendationCount,
  marketCoverage: Object.fromEntries(Object.entries(marketCoverage).slice(0, 8)),
  topCompetitions: Object.fromEntries(Object.entries(competitions).slice(0, 12)),
  firstUpcomingPredictions: predictions.slice(0, 12).map(prediction => ({
    id: prediction.event?.id,
    startsAt: prediction.event?.event_date,
    competition: prediction.event?.league_name,
    homeTeam: prediction.event?.home_team,
    awayTeam: prediction.event?.away_team,
    confidence: prediction.model?.confidence ?? null,
    markets: Object.keys(prediction.markets ?? {}).filter(key => prediction.markets?.[key]),
  })),
}, null, 2));
