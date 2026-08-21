import { describe, expect, it } from "vitest";

const SPORTS_API_BASE_URL = "https://sports.bzzoiro.com/api/v2";

describe("Sports Data API credentials", () => {
  it("authorizes a lightweight upcoming-events request", async () => {
    const apiKey = process.env.SPORTS_DATA_API_KEY;

    expect(apiKey, "SPORTS_DATA_API_KEY must be configured").toBeTruthy();

    const response = await fetch(
      `${SPORTS_API_BASE_URL}/events/?status=upcoming&limit=1`,
      {
        headers: {
          Authorization: `Token ${apiKey}`,
          Accept: "application/json",
        },
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("results");
    expect(Array.isArray(body.results)).toBe(true);
  }, 15_000);
});
