/** @jest-environment node */
import { dailySummaries, hourGrid, lastMean, latest, mean, peak, rolling, shareAbove, thin, toCsv, toRows } from "@/lib/series";
import { band, fmt, times } from "@/lib/pollutants";
import { HOUR, START, series } from "./fixtures";

describe("mean", () => {
  it("averages the values it has", () => {
    expect(mean([1, 2, 3, 6])).toBe(3);
    expect(mean([10, null, 20, 30])).toBe(20);
  });

  it("gives nothing when too many hours are missing", () => {
    expect(mean([1, null, null, 4])).toBeNull();
    expect(mean([])).toBeNull();
  });
});

describe("lastMean", () => {
  it("uses only the final 24 hours", () => {
    const values = [...new Array(24).fill(100), ...new Array(24).fill(10)];
    expect(lastMean(series(values), "pm2_5")).toBe(10);
    expect(lastMean(series([...new Array(40).fill(0), ...new Array(8).fill(80)]), "ozone", 8)).toBe(80);
  });

  it("needs a full window of hours", () => {
    expect(lastMean(series(new Array(23).fill(10)), "pm2_5")).toBeNull();
  });
});

describe("latest and peak", () => {
  it("skips missing hours at the end", () => {
    expect(latest(series([5, 7, null]), "pm10")).toEqual({ t: START + HOUR, v: 7 });
    expect(latest(series([null, null]), "pm10")).toBeNull();
  });

  it("finds the highest hour", () => {
    expect(peak(series([5, 42, null, 9]), "ozone")).toEqual({ t: START + HOUR, v: 42 });
  });
});

describe("rolling", () => {
  it("is empty until a full window has passed, then follows the window", () => {
    const out = rolling([2, 4, 6, 8], 2);
    expect(out).toEqual([null, 3, 5, 7]);
  });

  it("matches a plain mean over each window", () => {
    const values = Array.from({ length: 60 }, (_, i) => (i * 37) % 11);
    const out = rolling(values, 24);
    for (let i = 23; i < values.length; i++) expect(out[i]).toBeCloseTo(mean(values, i - 23, i + 1) as number, 10);
  });

  it("drops windows with too many gaps", () => {
    expect(rolling([1, null, null, null], 4)).toEqual([null, null, null, null]);
  });
});

describe("shareAbove", () => {
  it("counts the share of means over the limit, ignoring gaps", () => {
    expect(shareAbove([10, 20, null, 30, 16], 15)).toBe(0.75);
    expect(shareAbove([15, 15], 15)).toBe(0);
    expect(shareAbove([null], 15)).toBeNull();
  });
});

describe("thin", () => {
  it("leaves short runs alone and evens long ones out", () => {
    expect(thin([1, 2], 4)).toEqual([1, 2]);
    expect(thin([1, 3, 5, 7, 9, 11], 3)).toEqual([2, 6, 10]);
    expect(thin([null, null, 4, 6], 2)).toEqual([null, 5]);
  });
});

describe("daily summaries", () => {
  it("groups hours by the city’s own calendar day", () => {
    // Lagos is an hour ahead of UTC, so 23:00 UTC already belongs to the next day there
    const days = dailySummaries(series(new Array(48).fill(10)), "pm2_5", "Africa/Lagos");
    expect(days.map((d) => [d.day, d.hours])).toEqual([
      ["2025-11-03", 23],
      ["2025-11-04", 24],
      ["2025-11-05", 1],
    ]);
  });

  it("gives no mean for a day with too few hours", () => {
    const days = dailySummaries(series(new Array(48).fill(10)), "pm2_5", "Africa/Lagos");
    expect(days[0].mean).toBe(10);
    expect(days[2].mean).toBeNull();
    expect(days[2].max).toBe(10);
  });
});

describe("hourGrid", () => {
  it("places each hour on its local weekday and hour", () => {
    // one value at Monday 00:00 UTC, which is Monday 03:00 in Nairobi
    const grid = hourGrid(series([50]), "pm2_5", "Africa/Nairobi");
    expect(grid[0][3]).toBe(50);
    expect(grid[0][0]).toBeNull();
    expect(grid).toHaveLength(7);
    expect(grid[0]).toHaveLength(24);
  });

  it("averages the same slot across weeks", () => {
    const values = new Array(7 * 24 + 1).fill(null);
    values[0] = 10;
    values[7 * 24] = 30;
    expect(hourGrid(series(values), "pm2_5", "UTC")[0][0]).toBe(20);
  });
});

describe("rows and CSV", () => {
  it("flattens every city-hour into a row", () => {
    const rows = toRows([series([1, 2], "lagos"), series([3], "accra")]);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({ slug: "accra", city: "Accra", country: "Ghana", t: START, pm2_5: 3 });
  });

  it("writes a header, ISO times and blanks for missing values", () => {
    const csv = toCsv(toRows([series([1.5, null], "abidjan")]));
    const [head, first, second] = csv.trim().split("\n");
    expect(head).toBe("city,country,time_utc,pm2_5_ug_m3,pm10_ug_m3,nitrogen_dioxide_ug_m3,ozone_ug_m3,sulphur_dioxide_ug_m3,carbon_monoxide_ug_m3,dust_ug_m3");
    expect(first).toBe("Abidjan,Côte d’Ivoire,2025-11-03T00:00:00.000Z,1.5,1.5,1.5,1.5,1.5,1.5,1.5");
    expect(second).toBe("Abidjan,Côte d’Ivoire,2025-11-03T01:00:00.000Z,,,,,,,");
  });
});

describe("bands and formatting", () => {
  it("bands a reading by how many times the guideline it is", () => {
    expect([0.4, 1, 1.01, 2, 2.9, 3, 4.99, 5, 12].map(band)).toEqual([0, 0, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("formats values and multiples", () => {
    expect(fmt(4.26)).toBe("4.3");
    expect(fmt(41.6)).toBe("42");
    expect(fmt(4540)).toBe("4,540");
    expect(fmt(null)).toBe("–");
    expect(times(2.34)).toBe("2.3×");
    expect(times(12.4)).toBe("12×");
  });
});
