import * as db from "./db";
import { generatePredictionExplanation } from "./predictionExplanation";
import { normalizePredictionSelections } from "./predictionSync";
import { fetchOdds, fetchPredictions, type ApiOdds } from "./sportsApi";

const toDateString = (date: Date) => date.toISOString().slice(0, 10);
const toDecimal = (value: number | null | undefined) => value === null || value === undefined ? null : value.toFixed(4);
const toDate = (value?: string | null) => value ? new Date(value) : null;

function normalizeEventStatus(status: string): "upcoming" | "live" | "finished" | "cancelled" | "postponed" | "unresolved" {
  const normalized = status.toLowerCase();
  if (["upcoming", "notstarted", "scheduled", "not_started"].includes(normalized)) return "upcoming";
  if (["live", "inplay", "in_play", "halftime", "extra_time", "penalties"].includes(normalized)) return "live";
  if (["finished", "ended", "complete", "completed"].includes(normalized)) return "finished";
  if (["cancelled", "canceled", "abandoned"].includes(normalized)) return "cancelled";
  if (["postponed", "delayed", "suspended"].includes(normalized)) return "postponed";
  return "unresolved";
}

export async function synchronizePredictions(from = new Date(), daysAhead = 3, maxEvents = 30, maxExplanations = 3) {
  const until = new Date(from);
  until.setUTCDate(until.getUTCDate() + daysAhead);
  const runId = await db.startSyncRun("daily_predictions");
  let savedPredictions = 0;
  let savedSelections = 0;
  let incompleteOdds = 0;
  let generatedExplanations = 0;

  try {
    const payload = await fetchPredictions(toDateString(from), toDateString(until));
    const eligiblePredictions = payload.results
      .filter(prediction => normalizeEventStatus(prediction.event.status) === "upcoming")
      .slice(0, maxEvents);
    for (const prediction of eligiblePredictions) {
      const event = prediction.event;
      const storedEvent = await db.upsertSportsEvent({
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
        status: normalizeEventStatus(event.status),
        homeScore: event.home_score ?? null,
        awayScore: event.away_score ?? null,
        halftimeHomeScore: event.home_score_ht ?? null,
        halftimeAwayScore: event.away_score_ht ?? null,
        hasXg: event.has_xg ?? false,
        rawPayload: event,
        sourceUpdatedAt: toDate(prediction.created_at),
      });

      const storedPrediction = await db.upsertProviderPrediction({
        providerPredictionId: prediction.id,
        eventId: storedEvent.id,
        modelVersion: prediction.model?.version ?? null,
        modelConfidence: toDecimal(prediction.model?.confidence),
        expectedHomeGoals: toDecimal(prediction.markets.expected_goals?.home),
        expectedAwayGoals: toDecimal(prediction.markets.expected_goals?.away),
        mostLikelyScore: prediction.markets.score?.most_likely ?? null,
        rawPayload: prediction,
        sourceUpdatedAt: toDate(prediction.created_at),
      });

      let odds: ApiOdds[] = [];
      try {
        odds = (await fetchOdds(event.id)).results;
      } catch {
        incompleteOdds += 1;
      }

      for (const item of odds) {
        await db.recordOddsSnapshot({
          eventId: storedEvent.id,
          market: item.market,
          outcome: item.outcome,
          bookmakerSlug: item.bookmaker_slug ?? "consensus",
          bookmakerName: item.bookmaker_name ?? "Consensus",
          decimalOdds: Number(item.decimal_odds).toFixed(3),
          previousDecimalOdds: item.previous_decimal_odds === null || item.previous_decimal_odds === undefined ? null : Number(item.previous_decimal_odds).toFixed(3),
          openingDecimalOdds: item.opening_decimal_odds === null || item.opening_decimal_odds === undefined ? null : Number(item.opening_decimal_odds).toFixed(3),
          movement: item.movement ?? null,
          observedAt: toDate(item.updated_at) ?? new Date(),
          openingAt: toDate(item.opening_at),
        });
      }

      for (const selection of normalizePredictionSelections(prediction, odds)) {
        const saved = await db.upsertPredictionSelection({
          eventId: storedEvent.id,
          providerPredictionId: storedPrediction.id,
          market: selection.market,
          outcome: selection.outcome,
          label: selection.label,
          predictedProbability: selection.probability.toFixed(2),
          modelConfidence: toDecimal(prediction.model?.confidence),
          impliedProbability: toDecimal(selection.impliedProbability),
          fairOdds: toDecimal(selection.fairOdds),
          currentOdds: toDecimal(selection.currentOdds),
          openingOdds: toDecimal(selection.openingOdds),
          expectedValue: toDecimal(selection.expectedValue),
          edge: toDecimal(selection.edge),
          contextScore: toDecimal(selection.contextScore),
          grade: selection.grade,
          valueStatus: selection.expectedValue === null ? "unavailable" : selection.expectedValue > 0 ? "positive" : selection.expectedValue === 0 ? "neutral" : "negative",
          recommendationStatus: selection.recommendationStatus,
          reasonCodes: selection.reasonCodes,
        });

        if (selection.recommendationStatus === "recommended" && !saved.aiExplanation && generatedExplanations < maxExplanations) {
          const explanation = await generatePredictionExplanation({
            fixture: `${event.home_team} – ${event.away_team}`,
            competition: event.league_name ?? null,
            marketLabel: selection.label,
            probability: selection.probability,
            confidence: prediction.model?.confidence ?? null,
            currentOdds: selection.currentOdds,
            fairOdds: selection.fairOdds,
            edge: selection.edge,
            expectedValue: selection.expectedValue,
            reasons: selection.reasonCodes,
          });
          if (explanation) {
            await db.updateSelectionExplanation(saved.id, explanation);
            generatedExplanations += 1;
          }
        }
        savedSelections += 1;
      }
      savedPredictions += 1;
    }

    const status = incompleteOdds ? "partial" : "completed";
    await db.completeSyncRun(runId, status, { savedPredictions, savedSelections, incompleteOdds, generatedExplanations, totalProviderPredictions: payload.count, processedEvents: eligiblePredictions.length });
    return { savedPredictions, savedSelections, incompleteOdds, generatedExplanations, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown synchronization error";
    await db.completeSyncRun(runId, "failed", { savedPredictions, savedSelections, incompleteOdds }, message);
    throw error;
  }
}
