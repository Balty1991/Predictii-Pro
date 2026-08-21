import { invokeLLM, listLLMModels } from "./_core/llm";

type ExplanationInput = {
  fixture: string;
  competition: string | null;
  marketLabel: string;
  probability: number;
  confidence: number | null;
  currentOdds: number | null;
  fairOdds: number | null;
  edge: number | null;
  expectedValue: number | null;
  reasons: string[];
};

let narrativeModel: string | null | undefined;

async function getNarrativeModel() {
  if (narrativeModel !== undefined) return narrativeModel;
  const catalog = await listLLMModels();
  narrativeModel = catalog.data.find(model => model.id === "gpt-5-mini")?.id ?? null;
  return narrativeModel;
}

export async function generatePredictionExplanation(input: ExplanationInput) {
  const model = await getNarrativeModel();
  if (!model) return null;

  const response = await invokeLLM({
    model,
    maxTokens: 240,
    messages: [
      {
        role: "system",
        content: "Ești un analist sportiv prudent. Scrie în română, clar și factual. Nu promite rezultate, nu inventa date și menționează explicit că analiza nu este o garanție. Explică doar faptele furnizate într-un singur paragraf de maximum 90 de cuvinte.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}
