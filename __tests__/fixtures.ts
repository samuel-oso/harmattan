import { POLLUTANT_KEYS } from "@/lib/pollutants";
import type { Series } from "@/lib/open-meteo";

export const HOUR = 3_600_000;
// Monday 3 November 2025, 00:00 UTC
export const START = Date.UTC(2025, 10, 3);

export function series(values: (number | null)[], slug = "lagos", start = START): Series {
  const out = { slug, time: values.map((_, i) => start + i * HOUR), values: {} } as Series;
  for (const key of POLLUTANT_KEYS) out.values[key] = values;
  return out;
}

export function apiBody(hours: number, start = START, value: (i: number) => number | null = (i) => i) {
  const hourly: Record<string, unknown> = { time: Array.from({ length: hours }, (_, i) => (start + i * HOUR) / 1000) };
  for (const key of POLLUTANT_KEYS) hourly[key] = Array.from({ length: hours }, (_, i) => value(i));
  return { latitude: 6.5, longitude: 3.4, hourly };
}
