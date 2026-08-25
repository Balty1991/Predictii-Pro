import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBestOddsForWindow, fetchOdds } from "./sportsApi";

const emptyPage = { count: 0, next: null, previous: null, results: [] };

describe("Sports Data API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("reîncearcă o cerere de cote după o eroare tranzitorie de rețea", async () => {
    vi.useFakeTimers();
    vi.stubEnv("SPORTS_DATA_API_KEY", "test-token");
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("TLS connection reset"))
      .mockResolvedValueOnce(new Response(JSON.stringify(emptyPage), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = fetchOdds(222618);
    await vi.advanceTimersByTimeAsync(700);

    await expect(resultPromise).resolves.toMatchObject(emptyPage);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("solicită cotele în lot pentru piața și intervalul configurat", async () => {
    vi.stubEnv("SPORTS_DATA_API_KEY", "test-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(emptyPage), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBestOddsForWindow("btts", "2026-08-22", "2026-08-24")).resolves.toMatchObject(emptyPage);

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/odds/best/?market=btts&date_from=2026-08-22&date_to=2026-08-24&limit=200");
  });

  it("trimite tokenul configurat în fiecare cerere către furnizor", async () => {
    vi.stubEnv("SPORTS_DATA_API_KEY", "configured-test-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(emptyPage), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOdds(222618)).resolves.toMatchObject(emptyPage);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Token configured-test-token",
          Accept: "application/json",
        }),
      }),
    );
  });

  it("semnalează imediat lipsa cheii, fără a încerca o cerere externă", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOdds(222618)).rejects.toMatchObject({
      name: "SportsApiError",
      status: 500,
      message: "Sports Data API key is not configured.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
