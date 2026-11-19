import { queryOptions } from "@tanstack/react-query";
import type { City } from "@/lib/cities";
import { DataError, fetchSeries } from "@/lib/open-meteo";
import { loadWind } from "@/lib/wind";

export type RangeKey = "24h" | "7d" | "30d" | "90d";

export const RANGES: { key: RangeKey; days: number; label: string }[] = [
  { key: "24h", days: 1, label: "24 hours" },
  { key: "7d", days: 7, label: "7 days" },
  { key: "30d", days: 30, label: "30 days" },
  { key: "90d", days: 90, label: "90 days" },
];

export const daysOf = (range: RangeKey) => RANGES.find((r) => r.key === range)?.days ?? 7;

export const MAX_RETRIES = 3;

// one more day than is shown, so a 24-hour mean exists for the very first hour on screen
export const LEAD_DAYS = 1;

const retry = (failures: number, error: Error) => error instanceof DataError && error.retryable && failures < MAX_RETRIES;
const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 8000);

export const seriesQuery = (city: City, days: number) =>
  queryOptions({
    queryKey: ["series", city.slug, days] as const,
    queryFn: ({ signal }) => fetchSeries(city, days + LEAD_DAYS, signal),
    // the source updates hourly, so a reading is good for a while and refreshes quietly after that
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    retry,
    retryDelay,
  });

export const windQuery = queryOptions({
  queryKey: ["wind"] as const,
  queryFn: ({ signal }) => loadWind(signal),
  staleTime: 30 * 60_000,
  gcTime: 60 * 60_000,
  retry,
  retryDelay,
});
