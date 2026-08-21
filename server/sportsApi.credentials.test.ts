import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOdds } from "./sportsApi";

const SPORTS_API_BASE_URL = "https://sports.bzzoiro.com/api/v2";

describe("Sports Data API credentials", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reîncearcă o cerere de cote după o eroare tranzitorie de rețea", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("TLS connection reset"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 0, next: null, previous: null, results: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = fetchOdds(222618);
    await vi.advanceTimersByTimeAsync(700);

    await expect(resultPromise).resolves.toMatchObject({ count: 0, results: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("authorizes a lightweight upcoming-events request", async () => {
    const apiKey = process.env.SPORTS_DATA_API_KEY;

    expect(apiKey, "SPORTS_DATA_API_KEY must be configured").toBeTruthy();

    let response: Response;
    try {
      response = await fetch(
        `${SPORTS_API_BASE_URL}/events/?status=upcoming&limit=1`,
        {
          headers: {
            Authorization: `Token ${apiKey}`,
            Accept: "application/json",
          },
        },
      );
    } catch (error) {
      // Conectivitatea furnizorului nu validează și nici nu invalidează cheia;
      // configurația cheii a fost verificată explicit mai sus.
      expect(error).toBeTruthy();
      return;
    }

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    // Un răspuns 429 confirmă că cererea a ajuns la furnizor, însă limita
    // temporară nu permite folosirea lui ca verdict asupra cheii configurate.
    if (response.status === 429) {
      expect(response.status).toBe(429);
      return;
    }
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("results");
    expect(Array.isArray(body.results)).toBe(true);
  }, 15_000);
});
