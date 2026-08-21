import * as db from "./db";
import { generatePredictionExplanationsBatch, type ExplanationInput } from "./predictionExplanation";
import { normalizePredictionSelections } from "./predictionSync";
import { fetchBestOddsForWindow, fetchPredictions, ODDS_SYNC_MARKETS, type ApiOdds } from "./sportsApi";

export const MAX_EXTERNAL_CALLS_PER_SYNC = 1 + ODDS_SYNC_MARKETS.length;
export const MANUAL_SYNC_COOLDOWN_MS = 20 * 60 * 1000;

export function getManualRefreshCooldownSeconds(completedAt: Date | null | undefined, now = Date.now()) {
  if (!completedAt) return 0;
  return Math.max(0, Math.ceil((MANUAL_SYNC_COOLDOWN_MS - (now - completedAt.getTime())) / 1000));
}

export function hasStrategyEligibleOdds(odds: ApiOdds[]) {
  return odds.some(item => {
    const price = Number(item.decimal_odds);
    return Number.isFinite(price) && price >= 1.2 && price <= 2.1;
  });
}

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

export async function synchronizePredictions(from = new Date(), daysAhead = 2, maxEvents = 8, scheduleCronTaskUid?: string) {
  const until = new Date(from);
  until.setUTCDate(until.getUTCDate() + daysAhead);
  const runId = await db.startSyncRun("daily_predictions", scheduleCronTaskUid);
  let savedPredictions = 0;
  let savedSelections = 0;
  let incompleteOdds = 0;
  let generatedExplanations = 0;
  let externalCalls = 0;
  const explanationQueue: Array<ExplanationInput & { selectionId: number }> = [];

  try {
    externalCalls += 1;
    const payload = await fetchPredictions(toDateString(from), toDateString(until));
    const upcomingPredictions = payload.results
      .filter(prediction => normalizeEventStatus(prediction.event.status) === "upcoming");
    const oddsByProviderEvent = new Map<number, ApiOdds[]>();
    let bulkOddsAvailable = true;
    for (const market of ODDS_SYNC_MARKETS) {
      try {
        externalCalls += 1;
        const response = await fetchBestOddsForWindow(market, toDateString(from), toDateString(until));
        for (const item of response.results) {
          const current = oddsByProviderEvent.get(item.event_id) ?? [];
          current.push(item);
          oddsByProviderEvent.set(item.event_id, current);
        }
      } catch {
        bulkOddsAvailable = false;
        break;
      }
    }
    const eligiblePredictions = upcomingPredictions
      .filter(prediction => hasStrategyEligibleOdds(oddsByProviderEvent.get(prediction.event.id) ?? []))
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

      const odds = oddsByProviderEvent.get(event.id) ?? [];
      if (!bulkOddsAvailable) incompleteOdds += 1;

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
          consensusScore: toDecimal(selection.consensusScore),
          grade: selection.grade,
          valueStatus: selection.expectedValue === null ? "unavailable" : selection.expectedValue > 0 ? "positive" : selection.expectedValue === 0 ? "neutral" : "negative",
          recommendationStatus: selection.recommendationStatus,
          reasonCodes: selection.reasonCodes,
        });

        if (!saved.aiExplanation && selection.recommendationStatus === "recommended") {
          explanationQueue.push({
            selectionId: saved.id,
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
        }
        savedSelections += 1;
      }
      savedPredictions += 1;
    }

    const generated = await generatePredictionExplanationsBatch(explanationQueue.slice(0, 8));
    for (const item of generated) {
      await db.updateSelectionExplanation(item.selectionId, item.explanation);
      generatedExplanations += 1;
    }

    const status = incompleteOdds ? "partial" : "completed";
    await db.completeSyncRun(runId, status, { savedPredictions, savedSelections, incompleteOdds, generatedExplanations, externalCalls, externalCallBudget: MAX_EXTERNAL_CALLS_PER_SYNC, totalProviderPredictions: payload.count, processedEvents: eligiblePredictions.length });
    return { savedPredictions, savedSelections, incompleteOdds, generatedExplanations, externalCalls, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown synchronization error";
    await db.completeSyncRun(runId, "failed", { savedPredictions, savedSelections, incompleteOdds, externalCalls }, message);
    throw error;
  }
}
