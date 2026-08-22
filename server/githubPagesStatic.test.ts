import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const staticPage = readFileSync(resolve(root, "docs/index.html"), "utf8");
const feedGenerator = readFileSync(resolve(root, "scripts/update-pages-feed.mjs"), "utf8");

describe("aplicația statică GitHub Pages", () => {
  it("păstrează semnalele furnizorului vizibile fără a le transforma în cote eligibile", () => {
    expect(staticPage).toContain("providerSignals");
    expect(staticPage).toContain("Așteptăm o cotă reală înainte de a permite adăugarea într-un bilet");
    expect(feedGenerator).toContain("slice(0, 60)");
    expect(feedGenerator).toContain("providerSignals: providerSignals(prediction)");
  });

  it("permite ștergerea confirmată a unei piramide păstrate local", () => {
    expect(staticPage).toContain("data-delete-pyramid");
    expect(staticPage).toContain("Ștergi această piramidă locală?");
    expect(staticPage).toContain("filter(plan=>plan.id!==button.dataset.deletePyramid)");
  });
});
