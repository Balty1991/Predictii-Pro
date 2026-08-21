export type OddsMovementDirection = "shortening" | "drifting" | "flat";

export type OddsMovement = {
  absoluteDelta: number;
  percentDelta: number;
  direction: OddsMovementDirection;
};

export function calculateOddsMovement(currentOdds: number | null, openingOdds: number | null): OddsMovement | null {
  if (currentOdds === null || openingOdds === null || !Number.isFinite(currentOdds) || !Number.isFinite(openingOdds) || currentOdds <= 0 || openingOdds <= 0) {
    return null;
  }

  const absoluteDelta = Number((currentOdds - openingOdds).toFixed(2));
  const percentDelta = Number(((absoluteDelta / openingOdds) * 100).toFixed(2));
  const direction: OddsMovementDirection = percentDelta <= -0.1 ? "shortening" : percentDelta >= 0.1 ? "drifting" : "flat";
  return { absoluteDelta, percentDelta, direction };
}
