import { describe, expect, it } from "vitest";
import { getSafeSportsSyncError } from "../shared/syncError";

describe("normalizarea erorilor de sincronizare", () => {
  it("ascunde detaliul tehnic al unui payload null", () => {
    expect(getSafeSportsSyncError("Sports Data API returned an invalid payload: Invalid input: expected object, received null")).toContain("răspuns gol sau nevalid");
  });

  it("păstrează comunicarea clară pentru limita zilnică", () => {
    expect(getSafeSportsSyncError("taster_exhausted")).toContain("limita zilnică");
  });
});
