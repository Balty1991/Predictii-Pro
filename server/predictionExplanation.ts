import { invokeLLM, listLLMModels } from "./_core/llm";

export type ExplanationInput = {
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
    maxCompletionTokens: 360,
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

export async function generatePredictionExplanationsBatch(inputs: Array<ExplanationInput & { selectionId: number }>) {
  if (!inputs.length) return [] as Array<{ selectionId: number; explanation: string }>;
  const model = await getNarrativeModel();
  if (!model) return [] as Array<{ selectionId: number; explanation: string }>;

  const response = await invokeLLM({
    model,
    maxCompletionTokens: Math.min(3_600, Math.max(1_200, inputs.length * 220)),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "prediction_explanations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  selectionId: { type: "integer" },
                  explanation: { type: "string" },
                },
                required: ["selectionId", "explanation"],
                additionalProperties: false,
              },
            },
          },
          required: ["items"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: "system",
        content: "Ești un analist sportiv prudent. Pentru fiecare obiect, scrie în română un singur paragraf factual de maximum 90 de cuvinte. Explică doar datele furnizate și precizează că analiza nu este o garanție. Nu inventa statistici, rezultate sau motive.",
      },
      { role: "user", content: JSON.stringify(inputs) },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (typeof content !== "string") return [] as Array<{ selectionId: number; explanation: string }>;
  try {
    const parsed = JSON.parse(content) as { items?: unknown };
    if (!Array.isArray(parsed.items)) return [] as Array<{ selectionId: number; explanation: string }>;
    const validIds = new Set(inputs.map(item => item.selectionId));
    return parsed.items.flatMap(item => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as { selectionId?: unknown; explanation?: unknown };
      if (typeof candidate.selectionId !== "number" || !validIds.has(candidate.selectionId) || typeof candidate.explanation !== "string" || !candidate.explanation.trim()) return [];
      return [{ selectionId: candidate.selectionId, explanation: candidate.explanation.trim() }];
    });
  } catch {
    return [] as Array<{ selectionId: number; explanation: string }>;
  }
}
