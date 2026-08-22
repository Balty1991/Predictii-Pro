import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const staticPage = readFileSync(resolve(root, "docs/index.html"), "utf8");
const feedGenerator = readFileSync(resolve(root, "scripts/update-pages-feed.mjs"), "utf8");
const research = readFileSync(resolve(root, "docs/competitive-mobile-research-2026-08-22.md"), "utf8");
const productSpec = readFileSync(resolve(root, "docs/major-redesign-spec-2026-08-22.md"), "utf8");
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
    expect(staticPage).toContain("const target=number($('ticket-target').value)||1.4,lower=round(target-.08),upper=round(target+.12)");
    expect(staticPage).toContain("usedCompetitions.has(competition)");
    expect(staticPage).toContain("if(chosen.length>=4||ticketSummary(chosen).odds>=upper)return");
    expect(staticPage).toContain("Acumulatorul permite o singură piață pentru același eveniment.");
    expect(staticPage).toContain("Acumulatorul păstrează competițiile distincte pentru a limita corelația.");
    expect(staticPage).toContain("data-delete-pyramid");
    expect(staticPage).toContain("Ștergi această piramidă locală?");
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
