/** @jest-environment node */
import { BOX } from "@/lib/land";
import { landCells, project } from "@/lib/land";
import { CITIES } from "@/lib/cities";
import { DataError } from "@/lib/open-meteo";
import { WIND_COLS, WIND_ROWS, describeWind, parseWind, windAt, windPoints, windUrl, type Wind } from "@/lib/wind";

const N = WIND_COLS * WIND_ROWS;
const reading = (speed: unknown, from: unknown) => ({ current: { wind_speed_10m: speed, wind_direction_10m: from } });

describe("wind grid", () => {
  it("covers the map corner to corner in one request", () => {
    const points = windPoints();
    expect(points).toHaveLength(N);
    expect(points[0]).toEqual({ lat: BOX.north, lon: BOX.west });
    expect(points[N - 1]).toEqual({ lat: BOX.south, lon: BOX.east });
    const url = new URL(windUrl());
    expect(url.origin).toBe("https://api.open-meteo.com");
    expect(url.searchParams.get("latitude")?.split(",")).toHaveLength(N);
    expect(url.searchParams.get("wind_speed_unit")).toBe("ms");
  });
});

describe("parseWind", () => {
  it("turns where the wind comes from into where the air goes", () => {
    const json = Array.from({ length: N }, (_, i) => (i === 0 ? reading(10, 0) : i === 1 ? reading(10, 90) : reading(4, 45)));
    const wind = parseWind(json);
    // from the north: moving south
    expect(wind.u[0]).toBeCloseTo(0);
    expect(wind.v[0]).toBeCloseTo(-10);
    // from the east: moving west
    expect(wind.u[1]).toBeCloseTo(-10);
    expect(wind.v[1]).toBeCloseTo(0);
    // from the north-east, the harmattan's direction: moving south-west
    expect(wind.u[2]).toBeLessThan(0);
    expect(wind.v[2]).toBeLessThan(0);
  });

  it("treats a point with no reading as still air", () => {
    const wind = parseWind(Array.from({ length: N }, (_, i) => (i === 3 ? reading(null, 20) : reading(5, 180))));
    expect([wind.u[3], wind.v[3]]).toEqual([0, 0]);
  });

  it.each([
    ["too few points", [reading(1, 1)]],
    ["an error body", { error: true, reason: "nope" }],
    ["a point with no current block", Array.from({ length: N }, () => ({ latitude: 1 }))],
  ])("rejects %s", (_, json) => {
    expect(() => parseWind(json)).toThrow(DataError);
  });
});

describe("windAt", () => {
  const wind: Wind = { u: Array.from({ length: N }, (_, i) => i % WIND_COLS), v: Array.from({ length: N }, (_, i) => Math.floor(i / WIND_COLS)) };

  it("returns the grid value at a grid point and blends between them", () => {
    const points = windPoints();
    expect(windAt(wind, points[10].lon, points[10].lat)).toEqual([expect.closeTo(2), expect.closeTo(1)]);
    const midLon = (points[10].lon + points[11].lon) / 2;
    const midLat = (points[10].lat + points[18].lat) / 2;
    expect(windAt(wind, midLon, midLat)).toEqual([expect.closeTo(2.5), expect.closeTo(1.5)]);
  });

  it("holds the edge value outside the map", () => {
    expect(windAt(wind, BOX.east + 30, BOX.south - 30)).toEqual([expect.closeTo(WIND_COLS - 1), expect.closeTo(WIND_ROWS - 1)]);
  });
});

describe("describeWind", () => {
  it("names the compass point the wind comes from", () => {
    expect(describeWind(-3, -3).from).toBe("NE");
    expect(describeWind(0, 5).from).toBe("S");
    expect(describeWind(4, 0).from).toBe("W");
    expect(describeWind(-3, -4).speed).toBe(5);
  });
});

describe("the map", () => {
  it("puts every city on land, inside the frame", () => {
    const land = new Set(landCells().map(([c, r]) => `${c},${r}`));
    for (const city of CITIES) {
      const { x, y } = project(city.lon, city.lat);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(1);
      // coastal cities can sit a cell off the coarse coastline
      const c = Math.floor(city.lon - BOX.west);
      const r = Math.floor(BOX.north - city.lat);
      const near = [-1, 0, 1].some((dc) => [-1, 0, 1].some((dr) => land.has(`${c + dc},${r + dr}`)));
      expect(near).toBe(true);
    }
  });
});
