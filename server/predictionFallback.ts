import { SportsApiError } from "./sportsApi";

export function shouldUseUpcomingEventsFallback(error: unknown) {
  return error instanceof SportsApiError && error.status === 502;
}
