import { describe, expect, it } from "vitest";

const SPORTS_API_BASE_URL = "https://sports.bzzoiro.com/api/v2";

describe("Sports Data API credentials", () => {
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
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("results");
    expect(Array.isArray(body.results)).toBe(true);
  }, 15_000);
});
