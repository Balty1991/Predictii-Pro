import * as db from "./db";
import { fetchEvents, type ApiEvent } from "./sportsApi";

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

export function evaluateSelection(market: string, outcome: string, homeScore: number, awayScore: number): "won" | "lost" | "void" {
  const total = homeScore + awayScore;
  if (market === "1x2") {
    const result = homeScore > awayScore ? "HOME" : homeScore === awayScore ? "DRAW" : "AWAY";
    return outcome === result ? "won" : "lost";
  }
  if (market === "btts") {
    const result = homeScore > 0 && awayScore > 0 ? "yes" : "no";
    return outcome === result ? "won" : "lost";
  }
  const limits: Record<string, number> = { over_under_15: 1.5, over_under_25: 2.5, over_under_35: 3.5 };
  const limit = limits[market];
  if (limit === undefined) return "void";
  const result = total > limit ? "over" : "under";
  return outcome === result ? "won" : "lost";
}

function mapEvent(event: ApiEvent) {
  return {
    providerEventId: event.id,
    sport: "football",
    competitionId: event.league_id ?? null,
    competitionName: event.league_name ?? null,
    seasonId: event.season_id ?? null,
    homeTeamId: event.home_team_id ?? null,
    homeTeamName: event.home_team,
    awayTeamId: event.away_team_id ?? null,
    awayTeamName: event.away_team,
    startsAt: new Date(event.event_date),
    status: "finished" as const,
    homeScore: event.home_score ?? null,
    awayScore: event.away_score ?? null,
    halftimeHomeScore: event.home_score_ht ?? null,
    halftimeAwayScore: event.away_score_ht ?? null,
    hasXg: event.has_xg ?? false,
    rawPayload: event,
  };
}

export async function synchronizeResults(from = new Date(), daysBack = 2) {
  const start = new Date(from);
  start.setUTCDate(start.getUTCDate() - daysBack);
  const events = await fetchEvents("finished", toDateString(start), toDateString(from));
  let settled = 0;

  for (const event of events.results) {
    if (event.home_score === null || event.home_score === undefined || event.away_score === null || event.away_score === undefined) continue;
    const storedEvent = await db.upsertSportsEvent(mapEvent(event));
    const pending = await db.listPendingSelectionsForEvent(storedEvent.id);
    for (const selection of pending) {
      const status = evaluateSelection(selection.market, selection.outcome, event.home_score, event.away_score);
      await db.settlePredictionSelection(selection.id, status);
      settled += 1;
    }
  }
  return { processedEvents: events.results.length, settled };
}
