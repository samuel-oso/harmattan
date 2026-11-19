import { CITIES, type City } from "@/lib/cities";
import { HOUR, type Series } from "@/lib/open-meteo";
import { POLLUTANT_KEYS, type PollutantKey } from "@/lib/pollutants";

export type Values = (number | null)[];
export type Point = { t: number; v: number };

// a mean only counts when at least three quarters of its hours have a value
const COVERAGE = 0.75;

export function mean(values: Values, from = 0, to = values.length): number | null {
  let sum = 0;
  let n = 0;
  for (let i = Math.max(0, from); i < Math.min(values.length, to); i++) {
    const v = values[i];
    if (v != null) {
      sum += v;
      n++;
    }
  }
  const span = Math.min(values.length, to) - Math.max(0, from);
  return span > 0 && n >= span * COVERAGE ? sum / n : null;
}

// the mean over the most recent `window` hours
export function lastMean(series: Series, key: PollutantKey, window = 24): number | null {
  const values = series.values[key];
  return values.length >= window ? mean(values, values.length - window) : null;
}

// how much of the time a run of means sat above a limit, from 0 to 1
export function shareAbove(means: Values, limit: number): number | null {
  let n = 0;
  let above = 0;
  for (const v of means) {
    if (v == null) continue;
    n++;
    if (v > limit) above++;
  }
  return n ? above / n : null;
}

export function latest(series: Series, key: PollutantKey): Point | null {
  const values = series.values[key];
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v != null) return { t: series.time[i], v };
  }
  return null;
}

export function peak(series: Series, key: PollutantKey): Point | null {
  let best: Point | null = null;
  series.values[key].forEach((v, i) => {
    if (v != null && (!best || v > best.v)) best = { t: series.time[i], v };
  });
  return best;
}

// the mean of each hour and the `window - 1` before it, in one pass
export function rolling(values: Values, window = 24): Values {
  const out: Values = [];
  let sum = 0;
  let n = 0;
  for (let i = 0; i < values.length; i++) {
    const add = values[i];
    if (add != null) {
      sum += add;
      n++;
    }
    const drop = i >= window ? values[i - window] : null;
    if (drop != null) {
      sum -= drop;
      n--;
    }
    out.push(i >= window - 1 && n >= window * COVERAGE ? sum / n : null);
  }
  return out;
}

// evens a long run of hours out into at most `max` points, for a small trend line
export function thin(values: Values, max: number): Values {
  if (values.length <= max) return values;
  const size = values.length / max;
  return Array.from({ length: max }, (_, k) => {
    const from = Math.floor(k * size);
    const to = Math.max(from + 1, Math.floor((k + 1) * size));
    let sum = 0;
    let n = 0;
    for (let i = from; i < to; i++) {
      const v = values[i];
      if (v != null) {
        sum += v;
        n++;
      }
    }
    return n ? sum / n : null;
  });
}

// the most recent `hours` of a series
export function trim(series: Series, hours: number): Series {
  if (series.time.length <= hours) return series;
  const values = {} as Series["values"];
  for (const key of POLLUTANT_KEYS) values[key] = series.values[key].slice(-hours);
  return { slug: series.slug, time: series.time.slice(-hours), values };
}

export type Line = { id: string; time: number[]; values: Values };
export type Plot = { t: number } & Record<string, number | null>;

// how many hours each point on a chart stands for, so a long range stays light to draw
export const stepFor = (hours: number, max = 720) => Math.max(1, Math.ceil(hours / max));

// lines on one shared time axis, each point the mean of `step` hours
export function plot(lines: Line[], step = 1): Plot[] {
  const size = step * HOUR;
  const cells = new Map<number, Map<string, { sum: number; n: number }>>();
  for (const line of lines) {
    line.time.forEach((t, i) => {
      const at = Math.floor(t / size) * size;
      const cell = cells.get(at) ?? new Map<string, { sum: number; n: number }>();
      cells.set(at, cell);
      const v = line.values[i];
      if (v == null) return;
      const c = cell.get(line.id) ?? { sum: 0, n: 0 };
      c.sum += v;
      c.n++;
      cell.set(line.id, c);
    });
  }
  return Array.from(cells.keys())
    .sort((a, b) => a - b)
    .map((t) => {
      const row = { t } as Plot;
      for (const line of lines) {
        const c = cells.get(t)?.get(line.id);
        row[line.id] = c ? c.sum / c.n : null;
      }
      return row;
    });
}

// where to label a time axis: local midnights for a long range, every few hours for a short one
export function ticksFor(from: number, to: number, tz: string, max = 7): number[] {
  const clock = localClock(tz);
  const every = to - from <= 2 * 24 * HOUR ? 6 : 24;
  const all: number[] = [];
  for (let t = Math.ceil(from / HOUR) * HOUR; t <= to; t += HOUR) if (clock(t).hour % every === 0) all.push(t);
  const skip = Math.ceil(all.length / max);
  return all.filter((_, i) => i % skip === 0);
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// the calendar day, hour and weekday (0 is Monday) of a moment, in a city's own time zone
export function localClock(tz: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  return (t: number) => {
    const p: Record<string, string> = {};
    for (const part of parts.formatToParts(t)) p[part.type] = part.value;
    return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), weekday: WEEKDAYS.indexOf(p.weekday) };
  };
}

export type DaySummary = { day: string; mean: number | null; min: number | null; max: number | null; hours: number };

export function dailySummaries(series: Series, key: PollutantKey, tz: string): DaySummary[] {
  const clock = localClock(tz);
  const days = new Map<string, number[]>();
  series.values[key].forEach((v, i) => {
    const { day } = clock(series.time[i]);
    const list = days.get(day) ?? [];
    if (v != null) list.push(v);
    days.set(day, list);
  });
  return Array.from(days, ([day, list]) => ({
    day,
    hours: list.length,
    // a day still in progress, or with gaps, has no fair daily mean
    mean: list.length >= 24 * COVERAGE ? list.reduce((a, b) => a + b, 0) / list.length : null,
    min: list.length ? Math.min(...list) : null,
    max: list.length ? Math.max(...list) : null,
  }));
}

// mean for every weekday and hour of the day: [weekday][hour]
export function hourGrid(series: Series, key: PollutantKey, tz: string): (number | null)[][] {
  const clock = localClock(tz);
  const sum = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  const n = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  series.values[key].forEach((v, i) => {
    if (v == null) return;
    const { weekday, hour } = clock(series.time[i]);
    if (weekday < 0) return;
    sum[weekday][hour] += v;
    n[weekday][hour]++;
  });
  return sum.map((row, d) => row.map((s, h) => (n[d][h] ? s / n[d][h] : null)));
}

export type Row = { slug: string; city: string; country: string; t: number } & Record<PollutantKey, number | null>;

export function toRows(all: Series[], cities: City[] = CITIES): Row[] {
  const rows: Row[] = [];
  for (const series of all) {
    const city = cities.find((c) => c.slug === series.slug);
    if (!city) continue;
    for (let i = 0; i < series.time.length; i++) {
      const row = { slug: city.slug, city: city.name, country: city.country, t: series.time[i] } as Row;
      for (const key of POLLUTANT_KEYS) row[key] = series.values[key][i];
      rows.push(row);
    }
  }
  return rows;
}

const quote = (text: string) => (/[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);

export function toCsv(rows: Row[]): string {
  const head = ["city", "country", "time_utc", ...POLLUTANT_KEYS.map((k) => `${k}_ug_m3`)].join(",");
  const body = rows.map((r) =>
    [quote(r.city), quote(r.country), new Date(r.t).toISOString(), ...POLLUTANT_KEYS.map((k) => r[k] ?? "")].join(","),
  );
  return [head, ...body].join("\n") + "\n";
}
