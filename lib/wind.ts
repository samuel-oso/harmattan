import { BOX } from "@/lib/land";
import { DataError, getJson } from "@/lib/open-meteo";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
export const WIND_COLS = 8;
export const WIND_ROWS = 8;
const SPAN_X = BOX.east - BOX.west;
const SPAN_Y = BOX.north - BOX.south;

// wind towards the east (u) and the north (v) in m/s, on a coarse grid read row by row from the north-west corner
export type Wind = { u: number[]; v: number[] };

export function windPoints(): { lat: number; lon: number }[] {
  const points = [];
  for (let r = 0; r < WIND_ROWS; r++) {
    for (let c = 0; c < WIND_COLS; c++) {
      points.push({ lat: BOX.north - (r * SPAN_Y) / (WIND_ROWS - 1), lon: BOX.west + (c * SPAN_X) / (WIND_COLS - 1) });
    }
  }
  return points;
}

// one request for the whole grid
export function windUrl(): string {
  const points = windPoints();
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(2)).join(","),
    longitude: points.map((p) => p.lon.toFixed(2)).join(","),
    current: "wind_speed_10m,wind_direction_10m",
    wind_speed_unit: "ms",
  });
  return `${ENDPOINT}?${params}`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parseWind(json: unknown): Wind {
  if (!Array.isArray(json) || json.length !== WIND_COLS * WIND_ROWS) throw new DataError("BAD_RESPONSE");
  const wind: Wind = { u: [], v: [] };
  for (const point of json) {
    const current: unknown = isRecord(point) ? point.current : undefined;
    if (!isRecord(current)) throw new DataError("BAD_RESPONSE");
    const speed = current.wind_speed_10m;
    const from = current.wind_direction_10m;
    // a point with no reading is treated as still air
    const ok = finite(speed) && finite(from);
    const angle = ok ? (from * Math.PI) / 180 : 0;
    // the direction is where the wind comes from, clockwise from north, so the air moves the opposite way
    wind.u.push(ok ? -speed * Math.sin(angle) : 0);
    wind.v.push(ok ? -speed * Math.cos(angle) : 0);
  }
  return wind;
}

// the wind at any place inside the map, blended from the four grid points around it
export function windAt(wind: Wind, lon: number, lat: number, out: [number, number] = [0, 0]): [number, number] {
  const fx = Math.min(Math.max(((lon - BOX.west) / SPAN_X) * (WIND_COLS - 1), 0), WIND_COLS - 1);
  const fy = Math.min(Math.max(((BOX.north - lat) / SPAN_Y) * (WIND_ROWS - 1), 0), WIND_ROWS - 1);
  const c = Math.min(Math.floor(fx), WIND_COLS - 2);
  const r = Math.min(Math.floor(fy), WIND_ROWS - 2);
  const tx = fx - c;
  const ty = fy - r;
  const i = r * WIND_COLS + c;
  const blend = (g: number[]) =>
    (g[i] * (1 - tx) + g[i + 1] * tx) * (1 - ty) + (g[i + WIND_COLS] * (1 - tx) + g[i + WIND_COLS + 1] * tx) * ty;
  out[0] = blend(wind.u);
  out[1] = blend(wind.v);
  return out;
}

const POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export const KNOTS_PER_MS = 1.943844;

// the direction the wind comes from, in degrees clockwise from north
export function bearing(u: number, v: number): number {
  return ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360;
}

// speed, and the compass point the wind comes from
export function describeWind(u: number, v: number): { speed: number; from: string } {
  return { speed: Math.hypot(u, v), from: POINTS[Math.round(bearing(u, v) / 45) % 8] };
}

const KEY = "harmattan:wind";
const KEEP_MS = 30 * 60_000;

function saved(now: number): Wind | null {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (!isRecord(raw) || !finite(raw.at) || now - raw.at > KEEP_MS || now < raw.at) return null;
    const { u, v } = raw;
    const grid = (g: unknown): g is number[] => Array.isArray(g) && g.length === WIND_COLS * WIND_ROWS && g.every(finite);
    return grid(u) && grid(v) ? { u, v } : null;
  } catch {
    // no storage, or something unreadable in it: ask the source instead
    return null;
  }
}

// the grid costs one request per point against the source's limits, so a reading is kept for the tab for half an hour
export async function loadWind(signal?: AbortSignal, now = Date.now()): Promise<Wind> {
  const kept = saved(now);
  if (kept) return kept;
  const wind = parseWind(await getJson(windUrl(), signal));
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ at: now, ...wind }));
  } catch (error) {
    console.warn("The wind reading could not be kept for this tab.", error);
  }
  return wind;
}
