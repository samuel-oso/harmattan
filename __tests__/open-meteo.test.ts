/** @jest-environment node */
import { CITIES } from "@/lib/cities";
import { DAY, DataError, fetchSeries, parseSeries, seriesUrl } from "@/lib/open-meteo";
import { MAX_RETRIES, seriesQuery } from "@/lib/queries";
import { HOUR, START, apiBody } from "./fixtures";

const lagos = CITIES[0];
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => jest.restoreAllMocks());

describe("seriesUrl", () => {
  it("asks for every pollutant at the city’s coordinates", () => {
    const url = new URL(seriesUrl(lagos, 7));
    expect(url.origin).toBe("https://air-quality-api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe(String(lagos.lat));
    expect(url.searchParams.get("past_days")).toBe("7");
    expect(url.searchParams.get("timeformat")).toBe("unixtime");
    expect(url.searchParams.get("hourly")?.split(",")).toHaveLength(7);
  });
});

describe("parseSeries", () => {
  it("keeps only the hours in range and up to now", () => {
    // three days of hours, read at 12:00 on the third day, asking for one day
    const now = START + 2 * DAY + 12 * HOUR;
    const out = parseSeries(apiBody(72), "lagos", 1, now);
    expect(out.time).toHaveLength(24);
    expect(out.time[out.time.length - 1]).toBe(now);
    expect(out.time[0]).toBe(now - 23 * HOUR);
    expect(out.values.pm2_5[out.values.pm2_5.length - 1]).toBe(60);
  });

  it("turns anything that is not a number into a gap", () => {
    const body = apiBody(3, START, (i) => (i === 1 ? null : i));
    (body.hourly.ozone as unknown[])[2] = "high";
    const out = parseSeries(body, "lagos", 1, START + 2 * HOUR);
    expect(out.values.pm2_5).toEqual([0, null, 2]);
    expect(out.values.ozone).toEqual([0, null, null]);
  });

  it.each([
    ["no hourly block", { latitude: 1 }],
    ["an error body", { error: true, reason: "nope" }],
    ["a missing pollutant", (() => { const b = apiBody(3); delete b.hourly.dust; return b; })()],
    ["columns of different lengths", (() => { const b = apiBody(3); (b.hourly.pm10 as unknown[]).pop(); return b; })()],
    ["times that are not numbers", (() => { const b = apiBody(3); (b.hourly.time as unknown[])[0] = "2025-11-03T00:00"; return b; })()],
    ["not an object", "<html>"],
  ])("rejects %s", (_, body) => {
    expect(() => parseSeries(body, "lagos", 1, START + DAY)).toThrow(DataError);
    try {
      parseSeries(body, "lagos", 1, START + DAY);
    } catch (error) {
      expect((error as DataError).code).toBe("BAD_RESPONSE");
    }
  });
});

describe("fetchSeries", () => {
  it("returns the parsed series", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(respond(apiBody(48)));
    const out = await fetchSeries(lagos, 1, undefined, START + 47 * HOUR);
    expect(out.slug).toBe("lagos");
    expect(out.time).toHaveLength(24);
  });

  it.each([
    [429, "RATE_LIMITED", false],
    [503, "UNAVAILABLE", true],
    [400, "BAD_REQUEST", false],
  ])("maps HTTP %i to %s", async (status, code, retryable) => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(respond({ error: true }, status));
    const error = await fetchSeries(lagos, 1).catch((e) => e);
    expect(error).toBeInstanceOf(DataError);
    expect(error).toMatchObject({ code, status, retryable });
  });

  it("reports a dropped connection as a network failure worth retrying", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    const error = await fetchSeries(lagos, 1).catch((e) => e);
    expect(error).toMatchObject({ code: "NETWORK", retryable: true });
  });

  it("reports a body that is not JSON as a bad response", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>", { status: 200 }));
    const error = await fetchSeries(lagos, 1).catch((e) => e);
    expect(error).toMatchObject({ code: "BAD_RESPONSE", retryable: false });
  });

  it("passes a cancelled request on untouched, so it is never shown as a failure", async () => {
    const controller = new AbortController();
    jest.spyOn(globalThis, "fetch").mockImplementation(
      (_, init) => new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))),
    );
    const pending = fetchSeries(lagos, 1, controller.signal).catch((e) => e);
    controller.abort();
    const error = await pending;
    expect(error).not.toBeInstanceOf(DataError);
    expect((error as Error).name).toBe("AbortError");
  });
});

describe("retry policy", () => {
  const { retry } = seriesQuery(lagos, 7);
  const decide = (failures: number, error: Error) => (typeof retry === "function" ? retry(failures, error) : retry);

  it("retries failures that can clear up, up to the limit", () => {
    expect(decide(0, new DataError("UNAVAILABLE", 503))).toBe(true);
    expect(decide(MAX_RETRIES - 1, new DataError("TIMEOUT"))).toBe(true);
    expect(decide(MAX_RETRIES, new DataError("TIMEOUT"))).toBe(false);
  });

  it("never retries a request the source rejected", () => {
    expect(decide(0, new DataError("BAD_REQUEST", 400))).toBe(false);
    expect(decide(0, new DataError("RATE_LIMITED", 429))).toBe(false);
    expect(decide(0, new DataError("BAD_RESPONSE"))).toBe(false);
  });
});
