import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const staticPage = readFileSync(resolve(root, "docs/index.html"), "utf8");
const feedGenerator = readFileSync(resolve(root, "scripts/update-pages-feed.mjs"), "utf8");
const research = readFileSync(resolve(root, "docs/competitive-mobile-research-2026-08-22.md"), "utf8");
const productSpec = readFileSync(resolve(root, "docs/major-redesign-spec-2026-08-22.md"), "utf8");
const highTargetSpec = readFileSync(resolve(root, "docs/high-target-strategy-spec-2026-08-22.md"), "utf8");
const statisticsInventory = readFileSync(resolve(root, "docs/api-statistics-inventory-2026-08-22.md"), "utf8");
const staticFeed = JSON.parse(readFileSync(resolve(root, "docs/data/feed.json"), "utf8"));
const staticScript = staticPage.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? "";

describe("aplicația statică GitHub Pages", () => {
  it("are un script static care se poate compila înainte de livrare", () => {
    expect(staticScript).not.toBe("");
    try {
      new Function(staticScript);
    } catch (error) {
      throw new Error(error instanceof Error ? error.stack : String(error));
    }
  });

  it("folosește patru piețe prudente în lot și păstrează plafonul de cinci apeluri", () => {
    expect(feedGenerator).toContain("if (calls >= 5)");
    expect(feedGenerator).toContain("slice(0, 60)");
    expect(feedGenerator).toContain('const prudentMarkets = ["over_under_15", "double_chance", "1x2", "btts"]');
    expect(feedGenerator).toContain('request("/odds/", { market, min_decimal_odds: 1.2, max_decimal_odds: 1.7, limit: 200 })');
    expect(feedGenerator).toContain("Promise.allSettled(prudentMarkets.map");
  });

  it("mapează toate piețele gratuite de consens disponibile fără apeluri suplimentare", () => {
    expect(feedGenerator).toContain('"over_under_15:under": "under_15_goals"');
    expect(feedGenerator).toContain('"over_under_25:under": "under_25_goals"');
    expect(feedGenerator).toContain('"over_under_35:over": "over_35_goals"');
    expect(feedGenerator).toContain('"over_under_35:under": "under_35_goals"');
    expect(feedGenerator).toContain('"btts:no": "btts_no"');
    expect(feedGenerator).toContain('const complement = (value) =>');
    expect(feedGenerator).toContain('const directOrComplement = (direct, inverse) => asPercent(direct) ? direct : complement(inverse);');
    expect(feedGenerator).toContain('currentOdds < 1.01 || currentOdds > 25');
    expect(feedGenerator).toContain('currentOdds >= 1.2 && currentOdds <= 2.1 && expectedValue > 0');
  });

  it("păstrează în feed contextul și probabilitățile modelului deja primite fără apeluri suplimentare", () => {
    const event = staticFeed.events.find((item: { selections?: unknown[] }) => Array.isArray(item.selections) && item.selections.length > 0) as {
      contextScore?: unknown; contextSignals?: unknown; contextMissing?: unknown; modelMarkets?: { matchResult?: unknown; goals?: unknown; btts?: unknown; corners?: unknown };
    } | undefined;
    expect(staticFeed.calls).toBeLessThanOrEqual(5);
    expect(event).toBeDefined();
    expect(typeof event?.contextScore).toBe("number");
    expect(Array.isArray(event?.contextSignals)).toBe(true);
    expect(Array.isArray(event?.contextMissing)).toBe(true);
    expect(event?.modelMarkets?.matchResult).toBeDefined();
    expect(event?.modelMarkets?.goals).toBeDefined();
    expect(event?.modelMarkets?.btts).toBeDefined();
    expect(event?.modelMarkets?.corners).toBeDefined();
  });

  it("păstrează semnalele separate de piețele eligibile și nu permite selecții fără cotă", () => {
    expect(staticPage).toContain("Semnalele sunt disponibile, dar piața nu intră într-o strategie");
    expect(staticPage).toContain("data-filter=\"signals\"");
    expect(staticPage).toContain("data-filter=\"priced\"");
    expect(staticPage).toContain("data-filter=\"eligible\"");
    expect(staticPage).toContain("data-filter=\"recommended\"");
    expect(staticPage).toContain("data-filter=\"high\"");
  });

  it("oferă noua arhitectură mobilă Azi, Explorare, Strategii și Jurnal", () => {
    expect(staticPage).toContain('data-tab="today"');
    expect(staticPage).toContain('data-tab="explore"');
    expect(staticPage).toContain('data-tab="strategies"');
    expect(staticPage).toContain('data-tab="journal"');
    expect(staticPage).toContain("Analize prioritare");
    expect(staticPage).toContain("Analiză verificabilă");
    expect(staticPage).toContain("new URLSearchParams(window.location.search).get('tab')");
    expect(staticPage).toContain("new URLSearchParams(window.location.search).get('strategy')");
  });

  it("construiește strategii din meciuri distincte și păstrează competițiile distincte pentru țintele controlate", () => {
    expect(staticPage).toContain("const target=number($('ticket-target').value)||1.4,policy=ticketPolicy(target),lower=policy.lower,upper=policy.upper");
    expect(staticPage).toContain("(!policy.allowLeagueReuse&&usedCompetitions.has(competition))");
    expect(staticPage).toContain("if(chosen.length>=policy.max||ticketSummary(chosen).odds>=upper)return");
    expect(staticPage).toContain("Acumulatorul permite o singură piață pentru același eveniment.");
    expect(staticPage).toContain("Pentru țintele sub 5,00 păstrăm competițiile distincte pentru a limita corelația.");
    expect(staticPage).toContain("Pentru ținte mari sunt admise numai cote prudente 1,20–1,70");
    expect(staticPage).toContain("Doar analiză");
    expect(staticPage).toContain("data-delete-pyramid");
    expect(staticPage).toContain("Ștergi această piramidă locală?");
  });

  it("oferă ținte mari şi Piramidă combinată exclusiv din cote verificate distincte", () => {
    expect(staticPage).toContain("function ticketPolicy(target)");
    expect(staticPage).toContain("[5,10,20,50,100]");
    expect(staticPage).toContain("max:20");
    expect(staticPage).toContain("allowLeagueReuse:true");
    expect(staticPage).toContain("Mod prudent: sunt disponibile doar");
    expect(staticPage).toContain("Nu adăugăm cote ridicate pentru a completa artificial biletul.");
    expect(staticPage).toContain("function pyramidComboCandidate(target)");
    expect(staticPage).toContain("Combinație 2–3");
    expect(staticPage).toContain("Nu există acum o combinație verificată de 2–3 evenimente");
    expect(staticPage).toContain("state.pyramidTarget=Math.min(3,Math.max(1.2,number(event.target.value)||1.3));renderStrategies()");
    expect(staticPage).toContain("if(events.has(item.eventId))continue");
    expect(staticPage).toContain("Risc de concentrare:");
    expect(highTargetSpec).toContain("competițiile distincte sunt preferate");
    expect(highTargetSpec).toContain("Rezultat de validare cu feedul public curent");
  });

  it("folosește numai nivelul prudent la ținte mari și caută cote din competiții diferite în bugetul existent", () => {
    expect(staticPage).toContain("prudentTargetEligible=item=>Boolean(item&&item.odds>=1.2&&item.odds<=1.7");
    expect(staticPage).toContain("Boolean(target>=5?prudentTargetEligible(item):item?.eligible)");
    expect(staticPage).toContain("nivel prudent pentru țintă mare");
    expect(staticPage).toContain("cote prudente 1,20–1,70");
    expect(staticPage).toContain("candidates=allSelections().filter(item=>strategyEligible(item,target))");
    expect(feedGenerator).toContain("function diversifiedOddsTargets(predictions, previous)");
    expect(feedGenerator).toContain("confidence(right) - confidence(left)");
    expect(feedGenerator).toContain("if (!competitions.has(prediction.event.league_name ?? \"\")) add(prediction)");
    expect(feedGenerator).toContain('const prudentMarkets = ["over_under_15", "double_chance", "1x2", "btts"]');
    expect(feedGenerator).toContain('request("/odds/", { market, min_decimal_odds: 1.2, max_decimal_odds: 1.7, limit: 200 })');
    expect(feedGenerator).toContain("function snapshotFromBatchRows(rows, eventId)");
  });

  it("calculează vizibil cota totală, ținta, miza și metricile Acumulatorului din selecții reale", () => {
    expect(staticPage).toContain("Cotă totală");
    expect(staticPage).toContain("Cotă țintă");
    expect(staticPage).toContain("retur potențial");
    expect(staticPage).toContain("profit potențial");
    expect(staticPage).toContain("diferență față de țintă");
    expect(staticPage).toContain("function ticketStatus(summary,target)");
    expect(staticPage).toContain("potentialReturn=round(stake*odds)");
    expect(staticPage).toContain("potentialProfit=odds?round(potentialReturn-stake):0");
    expect(staticPage).toContain("toate prețurile sunt verificate");
    expect(staticPage).toContain("$('ticket-target').onchange");
    expect(staticPage).toContain("$('ticket-stake').onchange");
    expect(staticPage).toContain("retur matematic");
    expect(staticPage).toContain("profit matematic");
    expect(staticPage).toContain("calculele nu reprezintă rezultat confirmat");
  });

  it("include numai context deja primit în feed și jurnal local fără rezultate fabricate", () => {
    expect(feedGenerator).toContain("expectedGoals");
    expect(feedGenerator).toContain("mostLikelyScore");
    expect(feedGenerator).toContain("oddsUpdateReason");
    expect(feedGenerator).toContain("function contextSignals(prediction)");
    expect(feedGenerator).toContain("function buildContextScore(prediction, recommended)");
    expect(feedGenerator).toContain("contextMissing: missingContext");
    expect(staticPage).toContain("Context primit în feed");
    expect(staticPage).toContain("Factori API utilizați");
    expect(staticPage).toContain("Tip de predicție");
    expect(staticPage).toContain("fără decontare automată inventată");
    expect(staticPage).toContain("Jurnal de decizie");
    expect(statisticsInventory).toContain("## Statistici suplimentare ale API-ului");
    expect(statisticsInventory).toContain("nu sunt înlocuite cu medii inventate");
  });

  it("documentează auditul competitiv, limitele API și principiile de produs", () => {
    expect(research).toContain("## Constatări din aplicații publice");
    expect(research).toContain("## Audit de capabilități API");
    expect(research).toContain("Nu sunt preluate afirmații comerciale privind profitul");
    expect(productSpec).toContain("## Arhitectura mobilă");
    expect(productSpec).toContain("## Reguli pentru strategii");
    expect(productSpec).toContain("Nu se afirmă şi nu se garantează venit sau profit");
  });
});
