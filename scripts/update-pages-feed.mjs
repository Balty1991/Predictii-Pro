import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "docs/data/feed.json");
const baseUrl = "https://sports.bzzoiro.com/api/v2";
const apiKey = process.env.SPORTS_DATA_API_KEY;
const today = new Date();
const dateFrom = today.toISOString().slice(0, 10);
const dateTo = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);

if (!apiKey) {
  throw new Error("SPORTS_DATA_API_KEY lipsă. Configurează secretul repository-ului înainte de actualizarea feedului.");
}

let calls = 0;
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const asPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric <= 1 ? round(numeric * 100) : round(numeric);
};

async function request(path, params = {}, { paginated = true } = {}) {
  if (calls >= 5) throw new Error("Bugetul de 5 cereri externe ar fi depășit.");
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  calls += 1;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { headers: { Authorization: `Token ${apiKey}`, Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`Furnizorul a răspuns cu ${response.status}.`);
    const body = await response.json();
    if (!body || (paginated && !Array.isArray(body.results))) throw new Error("Furnizorul a transmis un payload gol sau nevalid.");
    return paginated ? body.results : body;
  } finally {
    clearTimeout(timeout);
  }
}

function oddsFieldFor({ market, outcome }) {
  const fields = {
    "1x2:HOME": "home_win",
    "1x2:DRAW": "draw",
    "1x2:AWAY": "away_win",
    "over_under_15:over": "over_15_goals",
    "over_under_25:over": "over_25_goals",
    "btts:yes": "btts_yes",
  };
  return fields[`${market}:${outcome}`] ?? null;
}

function selectionDefinitions(prediction) {
  const recommendations = prediction.recommendations ?? {};
  const match = prediction.markets?.match_result ?? {};
  const predicted = String(recommendations.favorite ?? match.predicted ?? "").toUpperCase();
  const favorite = { H: "HOME", HOME: "HOME", D: "DRAW", DRAW: "DRAW", A: "AWAY", AWAY: "AWAY" }[predicted];
  const definitions = [];
  if (favorite) {
    definitions.push({ market: "1x2", outcome: favorite, label: favorite === "HOME" ? "Victorie gazde" : favorite === "DRAW" ? "Egal" : "Victorie oaspeți", probability: favorite === "HOME" ? match.prob_home : favorite === "DRAW" ? match.prob_draw : match.prob_away, recommended: recommendations.bet_favorite === true || recommendations.winner === true });
  }
  definitions.push(
    { market: "over_under_15", outcome: "over", label: "Peste 1.5 goluri", probability: prediction.markets?.over_under?.prob_over_15, recommended: recommendations.over_15 === true },
    { market: "over_under_25", outcome: "over", label: "Peste 2.5 goluri", probability: prediction.markets?.over_under?.prob_over_25, recommended: recommendations.over_25 === true },
    { market: "btts", outcome: "yes", label: "Ambele echipe marchează", probability: prediction.markets?.btts?.prob_yes, recommended: recommendations.btts === true },
  );
  return definitions.map(item => ({ ...item, probability: asPercent(item.probability) })).filter(item => item.probability && item.probability < 100);
}

function providerSignals(prediction) {
  return selectionDefinitions(prediction)
    .sort((left, right) => Number(right.recommended) - Number(left.recommended) || right.probability - left.probability)
    .slice(0, 3)
    .map(signal => ({ label: signal.label, probability: signal.probability, recommended: signal.recommended }));
}

function normalizePrediction(prediction, oddsSnapshot) {
  const event = prediction.event;
  const confidence = Number(prediction.model?.confidence ?? 0.5);
  const selections = selectionDefinitions(prediction).flatMap(definition => {
    const field = oddsFieldFor(definition);
    const currentOdds = field ? Number(oddsSnapshot?.odds?.[field]) : null;
    if (!currentOdds || currentOdds < 1.2 || currentOdds > 2.1) return [];
    const impliedProbability = round(100 / currentOdds);
    const edge = round(definition.probability - impliedProbability);
    const expectedValue = round(((definition.probability / 100) * currentOdds - 1) * 100);
    const openingOdds = null;
    const providerRecommended = definition.recommended;
    const modelRecommended = definition.probability >= 62 && confidence >= 0.55 && edge >= 2 && expectedValue > 0;
    const eligible = expectedValue > 0 && confidence >= 0.45 && edge >= 1;
    return [{
      id: `${prediction.id}-${definition.market}-${definition.outcome}`,
      eventId: event.id,
      market: definition.market,
      outcome: definition.outcome,
      label: definition.label,
      probability: definition.probability,
      odds: round(currentOdds),
      openingOdds: openingOdds ? round(openingOdds) : null,
      impliedProbability,
      fairOdds: round(100 / definition.probability, 3),
      edge,
      expectedValue,
      confidence: round(confidence * 100),
      recommendation: providerRecommended ? "provider" : modelRecommended ? "model" : "watch",
      eligible,
      movement: null,
      bookmaker: "Consens BSD",
      oddsUpdatedAt: oddsSnapshot?.last_update_at ?? null,
      oddsNextUpdateAt: oddsSnapshot?.next_update_at ?? null,
    }];
  });
  return {
    id: event.id,
    startsAt: event.event_date,
    sport: "Fotbal",
    competition: event.league_name ?? "Competiție neprecizată",
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    providerConfidence: asPercent(confidence),
    providerSignals: providerSignals(prediction),
    providerRecommended: Object.entries(prediction.recommendations ?? {}).some(([key, value]) => ["bet_favorite", "over_15", "over_25", "over_35", "btts", "winner"].includes(key) && value === true),
    oddsStatus: oddsSnapshot?.odds ? "live" : "pending",
    oddsUpdatedAt: oddsSnapshot?.last_update_at ?? null,
    oddsNextUpdateAt: oddsSnapshot?.next_update_at ?? null,
    selections,
  };
}

async function readPrevious() {
  try { return JSON.parse(await readFile(outputPath, "utf8")); } catch { return { events: [] }; }
}

async function main() {
  const previous = await readPrevious();
  const now = new Date().toISOString();
  try {
    const predictions = await request("/predictions/", { date_from: dateFrom, date_to: dateTo, limit: 200 });
    if (!predictions.length) {
      const fallbackEvents = await request("/events/", { status: "notstarted", date_from: dateFrom, date_to: dateTo, limit: 60 });
      const events = fallbackEvents.slice(0, 60).map(event => ({ id: event.id, startsAt: event.event_date, sport: "Fotbal", competition: event.league_name ?? "Competiție neprecizată", homeTeam: event.home_team, awayTeam: event.away_team, providerConfidence: null, providerSignals: [], selections: [] }));
      await writeFile(outputPath, JSON.stringify({ version: 1, updatedAt: now, status: "partial", message: "Furnizorul nu a livrat predicții pentru fereastra curentă. Sunt afișate doar evenimente reale, fără cote sau bilete inventate.", calls, events }, null, 2) + "\n");
      return;
    }
    const upcomingPredictions = predictions.filter(prediction => new Date(prediction.event.event_date).getTime() > Date.now()).slice(0, 60);
    const oddsResponses = await Promise.allSettled(upcomingPredictions.slice(0, 4).map(prediction => request(`/events/${prediction.event.id}/odds/`, {}, { paginated: false })));
    const oddsByEvent = new Map(oddsResponses.flatMap(result => result.status === "fulfilled" && result.value?.event_id ? [[result.value.event_id, result.value]] : []));
    const oddsUnavailable = oddsResponses.some(result => result.status === "rejected");
    const normalizedEvents = upcomingPredictions.map(prediction => normalizePrediction(prediction, oddsByEvent.get(prediction.event.id)));
    const events = normalizedEvents;
    const selectionCount = events.reduce((total, event) => total + event.selections.length, 0);
    const message = selectionCount
      ? `${selectionCount} selecții reale au trecut validarea pentru intervalul curent.`
      : oddsUnavailable
        ? "Furnizorul a livrat evenimente și predicții, dar a refuzat temporar cotele. Sunt afișate numai evenimentele reale; biletele rămân blocate fără prețuri verificabile."
        : oddsByEvent.size === 0
          ? `${events.length} evenimente și semnale reale sunt disponibile, dar cotele nu sunt disponibile momentan pentru evenimentele verificate. Biletele rămân blocate fără prețuri verificabile.`
        : "Predicțiile au fost primite, dar nu există cote reale eligibile pentru strategii.";
    await writeFile(outputPath, JSON.stringify({ version: 1, updatedAt: now, status: selectionCount ? "ready" : "partial", message, calls, events }, null, 2) + "\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută la sincronizare.";
    await writeFile(outputPath, JSON.stringify({ version: 1, updatedAt: previous.updatedAt ?? null, status: "unavailable", message: `Feedul nu a putut fi actualizat: ${message}`, calls, events: previous.events ?? [] }, null, 2) + "\n");
    console.warn(`Feed static indisponibil: ${message}`);
  }
}

await mkdir(dirname(outputPath), { recursive: true });
await main();
