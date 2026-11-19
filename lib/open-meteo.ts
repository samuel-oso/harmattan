import type { City } from "@/lib/cities";
import { POLLUTANT_KEYS, type PollutantKey } from "@/lib/pollutants";

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
const ENDPOINT = "https://air-quality-api.open-meteo.com/v1/air-quality";
const TIMEOUT_MS = 15_000;

export type Series = {
  slug: string;
  // start of each hour, in ms since the epoch
  time: number[];
  values: Record<PollutantKey, (number | null)[]>;
};

export type DataErrorCode = "TIMEOUT" | "NETWORK" | "UNAVAILABLE" | "RATE_LIMITED" | "BAD_REQUEST" | "BAD_RESPONSE";

const MESSAGES: Record<DataErrorCode, string> = {
  TIMEOUT: "The data source took too long to answer.",
  NETWORK: "Couldn’t reach the data source. Check your connection.",
  UNAVAILABLE: "The data source is temporarily unavailable.",
  RATE_LIMITED: "Too many requests to the data source. Try again in a minute.",
  BAD_REQUEST: "The data source rejected the request.",
  BAD_RESPONSE: "The data source sent something unexpected.",
};

export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly status?: number;

  constructor(code: DataErrorCode, status?: number, options?: ErrorOptions) {
    super(MESSAGES[code], options);
    this.name = "DataError";
    this.code = code;
    this.status = status;
  }

  // only failures that can clear up on their own are worth another try
  get retryable() {
    return this.code === "TIMEOUT" || this.code === "NETWORK" || this.code === "UNAVAILABLE";
  }
}

export function seriesUrl(city: City, days: number): string {
  const params = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    hourly: POLLUTANT_KEYS.join(","),
    past_days: String(days),
    forecast_days: "1",
    timeformat: "unixtime",
  });
  return `${ENDPOINT}?${params}`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// keeps the hours inside the last `days` days up to now: the response also carries the rest of today as a forecast
export function parseSeries(json: unknown, slug: string, days: number, now: number): Series {
  const hourly = isRecord(json) ? json.hourly : undefined;
  if (!isRecord(hourly) || !Array.isArray(hourly.time)) throw new DataError("BAD_RESPONSE");

  const start = now - days * DAY;
  const keep: number[] = [];
  const time: number[] = [];
  hourly.time.forEach((t: unknown, i: number) => {
    if (typeof t !== "number" || !Number.isFinite(t)) throw new DataError("BAD_RESPONSE");
    const ms = t * 1000;
    if (ms > start && ms <= now) {
      keep.push(i);
      time.push(ms);
    }
  });

  const values = {} as Series["values"];
  for (const key of POLLUTANT_KEYS) {
    const column = hourly[key];
    if (!Array.isArray(column) || column.length !== hourly.time.length) throw new DataError("BAD_RESPONSE");
    values[key] = keep.map((i) => {
      const v: unknown = column[i];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    });
  }
  return { slug, time, values };
}

export async function fetchSeries(city: City, days: number, signal?: AbortSignal, now = Date.now()): Promise<Series> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  // a request the caller cancelled is passed on as it is, so it is never reported as a failure
  const failed = (cause: unknown, fallback: DataErrorCode) => {
    if (signal?.aborted) return cause;
    return new DataError(timeout.aborted ? "TIMEOUT" : fallback, undefined, { cause });
  };

  let res: Response;
  try {
    res = await fetch(seriesUrl(city, days), { signal: combined });
  } catch (cause) {
    throw failed(cause, "NETWORK");
  }
  if (res.status === 429) throw new DataError("RATE_LIMITED", res.status);
  if (res.status >= 500) throw new DataError("UNAVAILABLE", res.status);
  if (!res.ok) throw new DataError("BAD_REQUEST", res.status);

  let json: unknown;
  try {
    json = await res.json();
  } catch (cause) {
    throw failed(cause, "BAD_RESPONSE");
  }
  return parseSeries(json, city.slug, days, now);
}

export function describe(error: unknown): string {
  return error instanceof DataError ? error.message : "Something went wrong loading this.";
}
