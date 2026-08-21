import * as db from "../server/db.ts";
import { generatePredictionExplanationsBatch } from "../server/predictionExplanation.ts";

const selections = await db.listMissingSelectionExplanationInputs(12);
const generated = await generatePredictionExplanationsBatch(selections.map(selection => ({
  selectionId: selection.id,
  fixture: `${selection.homeTeam} – ${selection.awayTeam}`,
  competition: selection.competition,
  marketLabel: selection.label,
  probability: Number(selection.probability),
  confidence: selection.confidence ? Number(selection.confidence) : null,
  currentOdds: selection.currentOdds ? Number(selection.currentOdds) : null,
  fairOdds: selection.fairOdds ? Number(selection.fairOdds) : null,
  edge: selection.edge ? Number(selection.edge) : null,
  expectedValue: selection.expectedValue ? Number(selection.expectedValue) : null,
  reasons: Array.isArray(selection.reasonCodes) ? selection.reasonCodes.filter(item => typeof item === "string") : [],
})));

for (const item of generated) {
  await db.updateSelectionExplanation(item.selectionId, item.explanation);
}

console.log(JSON.stringify({ requested: selections.length, generated: generated.length }));
process.exit(0);
