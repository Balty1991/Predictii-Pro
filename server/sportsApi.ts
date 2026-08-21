import { z } from "zod";

const SPORTS_API_BASE_URL = "https://sports.bzzoiro.com/api/v2";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiEvent = {
  id: number;
  event_date: string;
  status: string;
  home_team_id?: number;
  home_team: string;
  away_team_id?: number;
  away_team: string;
  league_id?: number;
  league_name?: string;
  season_id?: number;
  home_score?: number | null;
  away_score?: number | null;
  home_score_ht?: number | null;
  away_score_ht?: number | null;
  has_xg?: boolean;
  [key: string]: unknown;
};

export type ApiPrediction = {
  id: number;
  created_at?: string;
  event: ApiEvent;
  markets: {
    match_result?: { prob_home?: number; prob_draw?: number; prob_away?: number; predicted?: string };
    expected_goals?: { home?: number; away?: number };
    over_under?: { prob_over_15?: number; prob_over_25?: number; prob_over_35?: number };
    btts?: { prob_yes?: number };
    score?: { most_likely?: string };
    draw_no_bet?: { prob_home?: number; prob_away?: number };
    corners?: { prob_over_85?: number; prob_over_95?: number; prob_over_105?: number };
  };
  recommendations?: Record<string, string | number | boolean | null | undefined>;
  model?: { confidence?: number; version?: string };
  [key: string]: unknown;
};

export type ApiOdds = {
  event_id: number;
  market: string;
  outcome: string;
  decimal_odds: number | string;
  previous_decimal_odds?: number | string | null;
  opening_decimal_odds?: number | string | null;
  movement?: "SHORTENING" | "DRIFTING" | null;
  bookmaker_slug?: string;
  bookmaker_name?: string;
  updated_at?: string;
  opening_at?: string | null;
  [key: string]: unknown;
};

const apiEventSchema: z.ZodType<ApiEvent> = z.object({
  id: z.number().int(),
  event_date: z.string(),
  status: z.string(),
  home_team_id: z.number().int().optional(),
  home_team: z.string(),
  away_team_id: z.number().int().optional(),
  away_team: z.string(),
  league_id: z.number().int().optional(),
  league_name: z.string().optional(),
  season_id: z.number().int().optional(),
  home_score: z.number().int().nullable().optional(),
  away_score: z.number().int().nullable().optional(),
  home_score_ht: z.number().int().nullable().optional(),
  away_score_ht: z.number().int().nullable().optional(),
  has_xg: z.boolean().optional(),
}).passthrough();

const apiPredictionSchema: z.ZodType<ApiPrediction> = z.object({
  id: z.number().int(),
  created_at: z.string().optional(),
  event: apiEventSchema,
  markets: z.object({
    match_result: z.object({ prob_home: z.number().optional(), prob_draw: z.number().optional(), prob_away: z.number().optional(), predicted: z.string().optional() }).optional(),
    expected_goals: z.object({ home: z.number().optional(), away: z.number().optional() }).optional(),
    over_under: z.object({ prob_over_15: z.number().optional(), prob_over_25: z.number().optional(), prob_over_35: z.number().optional() }).optional(),
    btts: z.object({ prob_yes: z.number().optional() }).optional(),
    score: z.object({ most_likely: z.string().optional() }).optional(),
    draw_no_bet: z.object({ prob_home: z.number().optional(), prob_away: z.number().optional() }).optional(),
    corners: z.object({ prob_over_85: z.number().optional(), prob_over_95: z.number().optional(), prob_over_105: z.number().optional() }).optional(),
  }).passthrough(),
  recommendations: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  model: z.object({ confidence: z.number().optional(), version: z.string().optional() }).optional(),
}).passthrough();

const apiOddsSchema: z.ZodType<ApiOdds> = z.object({
  event_id: z.number().int(),
  market: z.string(),
  outcome: z.string(),
  decimal_odds: z.union([z.number(), z.string()]),
  previous_decimal_odds: z.union([z.number(), z.string(), z.null()]).optional(),
  opening_decimal_odds: z.union([z.number(), z.string(), z.null()]).optional(),
  movement: z.enum(["SHORTENING", "DRIFTING"]).nullable().optional(),
  bookmaker_slug: z.string().optional(),
  bookmaker_name: z.string().optional(),
  updated_at: z.string().optional(),
  opening_at: z.string().nullable().optional(),
}).passthrough();

function paginatedSchema<T>(item: z.ZodType<T>) {
  return z.object({
    count: z.number().int().nonnegative(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(item),
  });
}

export class SportsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SportsApiError";
  }
}

function getApiKey() {
  const apiKey = process.env.SPORTS_DATA_API_KEY;
  if (!apiKey) throw new SportsApiError("Sports Data API key is not configured.", 500);
  return apiKey;
}

async function request<T>(path: string, schema: z.ZodType<T>, query?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${SPORTS_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${getApiKey()}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new SportsApiError(`Sports Data API request failed (${response.status}): ${errorBody.slice(0, 240)}`, response.status);
  }

  const body: unknown = await response.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new SportsApiError(`Sports Data API returned an invalid payload: ${parsed.error.issues[0]?.message ?? "Unknown schema error"}`, 502);
  }
  return parsed.data;
}

export async function fetchPredictions(dateFrom: string, dateTo: string) {
  return request<Paginated<ApiPrediction>>("/predictions/", paginatedSchema(apiPredictionSchema), {
    date_from: dateFrom,
    date_to: dateTo,
    limit: 200,
  });
}

export async function fetchOdds(eventId: number) {
  return request<Paginated<ApiOdds>>("/odds/", paginatedSchema(apiOddsSchema), { event_id: eventId, limit: 200 });
}

export async function fetchEvents(status: string, dateFrom: string, dateTo: string) {
  return request<Paginated<ApiEvent>>("/events/", paginatedSchema(apiEventSchema), {
    status,
    date_from: dateFrom,
    date_to: dateTo,
    limit: 200,
  });
}
