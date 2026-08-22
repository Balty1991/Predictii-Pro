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
const record = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const clamp = value => Math.max(0, Math.min(100, round(value)));

function contextSignals(prediction) {
  const event = record(prediction.event);
  const sources = [record(prediction.context), record(prediction.contextual_factors), record(event.context), record(event.contextual_factors)];
  const definitions = [
    { label: "Formă echipe", keys: ["form_score", "team_form_score", "form"] },
    { label: "Confruntări directe", keys: ["h2h_score", "head_to_head_score"] },
    { label: "Lot și line-up", keys: ["squad_score", "lineup_score", "availability_score"] },
    { label: "Antrenori", keys: ["manager_score", "coach_score"] },
    { label: "Arbitru", keys: ["referee_score"] },
    { label: "Deplasare", keys: ["travel_score", "away_travel_score"] },
    { label: "Condiții meci", keys: ["conditions_score", "weather_score", "pitch_score"] },
  ];
  return definitions.flatMap(definition => {
    for (const source of sources) {
      for (const key of definition.keys) {
        const score = asPercent(source[key]);
        if (score !== null) return [{ label: definition.label, score }];
      }
    }
    return [];
  });
}

function buildContextScore(prediction, recommended) {
  const confidence = asPercent(prediction.model?.confidence) ?? 50;
  const xg = record(prediction.markets?.expected_goals);
  const home = Number(xg.home), away = Number(xg.away);
  const xgBalance = Number.isFinite(home) && Number.isFinite(away) ? Math.max(0, 10 - Math.abs(home - away) * 4) : 4;
  const contribution = contextSignals(prediction).reduce((total, signal) => total + (signal.score - 50) * 0.1, 0);
  return clamp(36 + confidence * 0.42 + xgBalance + (recommended ? 12 : 0) + Math.max(-10, Math.min(10, contribution)));
}

function modelMarkets(prediction) {
  const markets = record(prediction.markets);
  const match = record(markets.match_result);
  const overUnder = record(markets.over_under);
  const btts = record(markets.btts);
  const corners = record(markets.corners);
  return {
    matchResult: { home: asPercent(match.prob_home), draw: asPercent(match.prob_draw), away: asPercent(match.prob_away) },
    goals: { over15: asPercent(overUnder.prob_over_15), over25: asPercent(overUnder.prob_over_25), over35: asPercent(overUnder.prob_over_35) },
    btts: { yes: asPercent(btts.prob_yes) },
    corners: { over85: asPercent(corners.prob_over_85), over95: asPercent(corners.prob_over_95), over105: asPercent(corners.prob_over_105) },
  };
}

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
    "over_under_15:under": "under_15_goals",
    "over_under_25:over": "over_25_goals",
    "over_under_25:under": "under_25_goals",
    "over_under_35:over": "over_35_goals",
    "over_under_35:under": "under_35_goals",
    "btts:yes": "btts_yes",
    "btts:no": "btts_no",
  };
  return fields[`${market}:${outcome}`] ?? null;
}

function selectionDefinitions(prediction) {
  const recommendations = prediction.recommendations ?? {};
  const match = prediction.markets?.match_result ?? {};
  const predicted = String(recommendations.favorite ?? match.predicted ?? "").toUpperCase();
  const favorite = { H: "HOME", HOME: "HOME", D: "DRAW", DRAW: "DRAW", A: "AWAY", AWAY: "AWAY" }[predicted];
  const overUnder = prediction.markets?.over_under ?? {};
  const btts = prediction.markets?.btts ?? {};
  const complement = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    const normalized = numeric <= 1 ? numeric : numeric / 100;
    return normalized < 1 ? 1 - normalized : null;
  };
  const directOrComplement = (direct, inverse) => asPercent(direct) ? direct : complement(inverse);
  const definitions = [
    { market: "1x2", outcome: "HOME", label: "Victorie gazde", probability: match.prob_home, recommended: favorite === "HOME" && (recommendations.bet_favorite === true || recommendations.winner === true) },
    { market: "1x2", outcome: "DRAW", label: "Egal", probability: match.prob_draw, recommended: favorite === "DRAW" && (recommendations.bet_favorite === true || recommendations.winner === true) },
    { market: "1x2", outcome: "AWAY", label: "Victorie oaspeți", probability: match.prob_away, recommended: favorite === "AWAY" && (recommendations.bet_favorite === true || recommendations.winner === true) },
  ];
  definitions.push(
    { market: "over_under_15", outcome: "over", label: "Peste 1.5 goluri", probability: overUnder.prob_over_15, recommended: recommendations.over_15 === true },
    { market: "over_under_15", outcome: "under", label: "Sub 1.5 goluri", probability: directOrComplement(overUnder.prob_under_15, overUnder.prob_over_15), recommended: recommendations.under_15 === true },
    { market: "over_under_25", outcome: "over", label: "Peste 2.5 goluri", probability: overUnder.prob_over_25, recommended: recommendations.over_25 === true },
    { market: "over_under_25", outcome: "under", label: "Sub 2.5 goluri", probability: directOrComplement(overUnder.prob_under_25, overUnder.prob_over_25), recommended: recommendations.under_25 === true },
    { market: "over_under_35", outcome: "over", label: "Peste 3.5 goluri", probability: overUnder.prob_over_35, recommended: recommendations.over_35 === true },
    { market: "over_under_35", outcome: "under", label: "Sub 3.5 goluri", probability: directOrComplement(overUnder.prob_under_35, overUnder.prob_over_35), recommended: recommendations.under_35 === true },
    { market: "btts", outcome: "yes", label: "Ambele echipe marchează", probability: btts.prob_yes, recommended: recommendations.btts === true },
    { market: "btts", outcome: "no", label: "Nu marchează ambele", probability: directOrComplement(btts.prob_no, btts.prob_yes), recommended: recommendations.btts_no === true },
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
  const expectedGoals = prediction.markets?.expected_goals ?? {};
  const score = prediction.markets?.score ?? {};
  const signals = contextSignals(prediction);
  const contextScore = buildContextScore(prediction, false);
  const markets = modelMarkets(prediction);
  const contextLabels = ["Formă echipe", "Confruntări directe", "Lot și line-up", "Antrenori", "Arbitru", "Deplasare", "Condiții meci"];
  const missingContext = contextLabels.filter(label => !signals.some(signal => signal.label === label));
  const selections = selectionDefinitions(prediction).flatMap(definition => {
    const field = oddsFieldFor(definition);
    const currentOdds = field ? Number(oddsSnapshot?.odds?.[field]) : null;
    if (!currentOdds || currentOdds < 1.01 || currentOdds > 25) return [];
    const impliedProbability = round(100 / currentOdds);
    const edge = round(definition.probability - impliedProbability);
    const expectedValue = round(((definition.probability / 100) * currentOdds - 1) * 100);
    const openingOdds = null;
    const providerRecommended = definition.recommended;
    const selectionContextScore = buildContextScore(prediction, providerRecommended);
    const modelRecommended = definition.probability >= 62 && confidence >= 0.55 && selectionContextScore >= 50 && edge >= 2 && expectedValue > 0;
    const eligible = currentOdds >= 1.2 && currentOdds <= 2.1 && expectedValue > 0 && confidence >= 0.45 && selectionContextScore >= 40 && edge >= 1;
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
      contextScore: selectionContextScore,
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
    contextScore,
    contextSignals: signals,
    contextMissing: missingContext,
    modelMarkets: markets,
    oddsStatus: oddsSnapshot?.odds ? "live" : "pending",
    oddsUpdatedAt: oddsSnapshot?.last_update_at ?? null,
    oddsNextUpdateAt: oddsSnapshot?.next_update_at ?? null,
    oddsRefreshSeconds: Number(oddsSnapshot?.update_interval_seconds) || null,
    oddsUpdateReason: oddsSnapshot?.update_reason ?? null,
    selections,
    expectedGoals: {
      home: Number.isFinite(Number(expectedGoals.home)) ? round(expectedGoals.home) : null,
      away: Number.isFinite(Number(expectedGoals.away)) ? round(expectedGoals.away) : null,
    },
    mostLikelyScore: typeof score.most_likely === "string" ? score.most_likely : null,
  };
}

async function readPrevious() {
  try { return JSON.parse(await readFile(outputPath, "utf8")); } catch { return { events: [] }; }
}

function diversifiedOddsTargets(predictions, previous) {
  const previouslyPriced = new Set((previous.events ?? []).filter(event => (event.selections ?? []).length > 0).map(event => event.id));
  const confidence = prediction => asPercent(prediction.model?.confidence) ?? 0;
  const ordered = [...predictions].sort((left, right) => confidence(right) - confidence(left) || Number(previouslyPriced.has(right.event.id)) - Number(previouslyPriced.has(left.event.id)) || String(left.event.event_date).localeCompare(String(right.event.event_date)));
  const picked = [], pickedIds = new Set(), competitions = new Set();
  const add = prediction => { if (!prediction || pickedIds.has(prediction.event.id) || picked.length >= 4) return; picked.push(prediction); pickedIds.add(prediction.event.id); competitions.add(prediction.event.league_name ?? ""); };
  for (const prediction of ordered) if (!competitions.has(prediction.event.league_name ?? "")) add(prediction);
  for (const prediction of ordered) add(prediction);
  return picked;
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
    const oddsTargets = diversifiedOddsTargets(upcomingPredictions, previous);
    const oddsResponses = await Promise.allSettled(oddsTargets.map(prediction => request(`/events/${prediction.event.id}/odds/`, {}, { paginated: false })));
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
