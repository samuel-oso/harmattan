import type { Page, Route } from "@playwright/test";

const HOUR = 3600;
const KEYS = ["pm2_5", "pm10", "nitrogen_dioxide", "ozone", "sulphur_dioxide", "carbon_monoxide", "dust"];

// PM2.5 level for a few cities, by latitude; every other city sits below the guideline
const LEVELS: Record<string, number> = { "12.0001": 90, "6.4541": 30, "9.0579": 20 };
export const LATITUDE = { kano: "12.0001", lagos: "6.4541", abuja: "9.0579" };

export function body(url: URL) {
  const days = Number(url.searchParams.get("past_days"));
  const level = LEVELS[url.searchParams.get("latitude") ?? ""] ?? 9;
  const end = Math.floor(Date.now() / 1000 / 86400) * 86400 + 86400;
  const time: number[] = [];
  for (let t = end - (days + 1) * 86400; t < end; t += HOUR) time.push(t);
  const hourly: Record<string, number[]> = { time };
  // a daily swing, so charts have a shape and some hours cross the line
  for (const key of KEYS) hourly[key] = time.map((t) => level + 4 * Math.sin((t / HOUR / 24) * 2 * Math.PI));
  return { latitude: 0, longitude: 0, hourly };
}

type Override = (url: URL, route: Route) => Promise<boolean> | boolean;

// every request to the data source is answered here, so the tests never depend on the network
export async function mockAirQuality(page: Page, override?: Override) {
  const requests: URL[] = [];
  await page.route("https://air-quality-api.open-meteo.com/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (override && (await override(url, route))) return;
    await route.fulfill({ json: body(url), headers: { "access-control-allow-origin": "*" } });
  });
  // a steady 6 m/s from the north-east at every point of the wind grid
  await page.route("https://api.open-meteo.com/**", async (route) => {
    const points = new URL(route.request().url()).searchParams.get("latitude")?.split(",").length ?? 0;
    const json = Array.from({ length: points }, () => ({ current: { wind_speed_10m: 6, wind_direction_10m: 45 } }));
    await route.fulfill({ json, headers: { "access-control-allow-origin": "*" } });
  });
  return requests;
}
