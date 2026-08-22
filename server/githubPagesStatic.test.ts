import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const staticPage = readFileSync(resolve(root, "docs/index.html"), "utf8");
const feedGenerator = readFileSync(resolve(root, "scripts/update-pages-feed.mjs"), "utf8");
const filterMapping = readFileSync(resolve(root, "docs/mobile-render-validation-2026-08-22.md"), "utf8");

describe("aplicația statică GitHub Pages", () => {
  it("păstrează semnalele furnizorului vizibile fără a le transforma în cote eligibile", () => {
    expect(staticPage).toContain("providerSignals");
    expect(staticPage).toContain("o piață nu este adăugată în bilet până când feedul nu confirmă o cotă reală");
    expect(feedGenerator).toContain("slice(0, 60)");
    expect(feedGenerator).toContain("providerSignals: providerSignals(prediction)");
    expect(feedGenerator).toContain("/events/${prediction.event.id}/odds/");
    expect(feedGenerator).toContain("paginated: false");
  });

  it("permite ștergerea confirmată a unei piramide păstrate local", () => {
    expect(staticPage).toContain("data-delete-pyramid");
    expect(staticPage).toContain("Ștergi această piramidă locală?");
    expect(staticPage).toContain("filter(plan=>plan.id!==button.dataset.deletePyramid)");
  });

  it("propune Acumulatoare doar în intervalul țintă și din competiții distincte", () => {
    expect(staticPage).toContain("const lower=round(target-.08),upper=round(target+.12)");
    expect(staticPage).toContain("usedCompetitions.has(competition)");
    expect(staticPage).toContain("intervalul ${lower.toFixed(2)}–${upper.toFixed(2)} cu evenimente și competiții distincte");
  });

  it("separă filtrele pentru semnalele API, cote, eligibilitate, recomandări și rată mare", () => {
    expect(staticPage).toContain('data-filter="signals"');
    expect(staticPage).toContain("function hasProviderSignals(event)");
    expect(staticPage).toContain("if(state.filter==='signals')return hasProviderSignals(event)");
    expect(staticPage).toContain('data-filter="priced"');
    expect(staticPage).toContain('data-filter="eligible"');
    expect(staticPage).toContain('data-filter="recommended"');
    expect(staticPage).toContain('data-filter="high"');
  });

  it("păstrează documentată maparea fiecărei categorii de filtru", () => {
    expect(filterMapping).toContain("## Maparea filtrelor de Meciuri");
    expect(filterMapping).toContain("| Semnale API | `providerSignals` |");
    expect(filterMapping).toContain("| Cu cotă | `selections` |");
    expect(filterMapping).toContain("| Eligibile | `selections[].eligible` |");
    expect(filterMapping).toContain("| Recomandate | recomandare model sau furnizor |");
    expect(filterMapping).toContain("| Rată 60%+ | încredere sau probabilitate de semnal |");
    expect(filterMapping).toContain("| Competiție | `competition` |");
  });
});
