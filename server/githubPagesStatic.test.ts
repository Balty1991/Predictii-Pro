import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const staticPage = readFileSync(resolve(root, "docs/index.html"), "utf8");
const feedGenerator = readFileSync(resolve(root, "scripts/update-pages-feed.mjs"), "utf8");
const research = readFileSync(resolve(root, "docs/competitive-mobile-research-2026-08-22.md"), "utf8");
const productSpec = readFileSync(resolve(root, "docs/major-redesign-spec-2026-08-22.md"), "utf8");
const highTargetSpec = readFileSync(resolve(root, "docs/high-target-strategy-spec-2026-08-22.md"), "utf8");
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

  it("folosește cote per-eveniment fără parametrul limit și păstrează plafonul de cinci apeluri", () => {
    expect(feedGenerator).toContain("if (calls >= 5)");
    expect(feedGenerator).toContain("slice(0, 60)");
    expect(feedGenerator).toContain("/events/${prediction.event.id}/odds/");
    expect(feedGenerator).toContain("paginated: false");
    expect(feedGenerator).not.toContain('request(`/events/${prediction.event.id}/odds/`, { limit');
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

  it("construiește strategii numai din evenimente și competiții distincte, în interval strict", () => {
    expect(staticPage).toContain("const target=number($('ticket-target').value)||1.4,policy=ticketPolicy(target),lower=policy.lower,upper=policy.upper");
    expect(staticPage).toContain("usedCompetitions.has(competition)");
    expect(staticPage).toContain("if(chosen.length>=policy.max||ticketSummary(chosen).odds>=upper)return");
    expect(staticPage).toContain("Acumulatorul permite o singură piață pentru același eveniment.");
    expect(staticPage).toContain("Acumulatorul păstrează competițiile distincte pentru a limita corelația.");
    expect(staticPage).toContain("Cota este reală, dar nu respectă criteriile curente pentru strategie.");
    expect(staticPage).toContain("Doar analiză");
    expect(staticPage).toContain("data-delete-pyramid");
    expect(staticPage).toContain("Ștergi această piramidă locală?");
  });

  it("oferă ținte mari şi Piramidă combinată exclusiv din cote verificate distincte", () => {
    expect(staticPage).toContain("function ticketPolicy(target)");
    expect(staticPage).toContain("[5,10,20,50,100]");
    expect(staticPage).toContain("max:20");
    expect(staticPage).toContain("function pyramidComboCandidate(target)");
    expect(staticPage).toContain("Combinație 2–3");
    expect(staticPage).toContain("Nu există acum o combinație verificată de 2–3 evenimente");
    expect(staticPage).toContain("state.pyramidTarget=Math.min(3,Math.max(1.2,number(event.target.value)||1.3));renderStrategies()");
    expect(staticPage).toContain("if(events.has(item.eventId))continue");
    expect(staticPage).toContain("Risc de concentrare:");
    expect(highTargetSpec).toContain("competițiile distincte sunt preferate");
    expect(highTargetSpec).toContain("Rezultat de validare cu feedul public curent");
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
    expect(staticPage).toContain("Context primit în feed");
    expect(staticPage).toContain("fără decontare automată inventată");
    expect(staticPage).toContain("Jurnal de decizie");
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
