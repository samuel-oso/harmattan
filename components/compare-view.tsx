"use client";

import { CITIES, cityBySlug, type City } from "@/lib/cities";
import { dateTime, percent } from "@/lib/format";
import { POLLUTANTS, UNIT, fmt, pollutant, times, type PollutantKey } from "@/lib/pollutants";
import { RANGES, daysOf } from "@/lib/queries";
import { plot, rolling, shareAbove, stepFor, type Line } from "@/lib/series";
import { MAX_COMPARE, useView } from "@/lib/store";
import { useAllSeries } from "@/lib/use-series";
import { Chart, Legend, Swatch } from "@/components/charts/chart";
import { Band, Failure, Field, Segmented, selectClass } from "@/components/ui";

// each city gets a colour and a dash pattern, so the lines can be told apart without colour
const STYLES = [
  { color: "var(--series-1)", dash: undefined },
  { color: "var(--series-2)", dash: "7 4" },
  { color: "var(--series-3)", dash: "2 4" },
  { color: "var(--series-4)", dash: "12 4 2 4" },
];

export function CompareView() {
  const compare = useView((s) => s.compare);
  const key = useView((s) => s.pollutant);
  const range = useView((s) => s.range);
  const toggle = useView((s) => s.toggleCompare);
  const setPollutant = useView((s) => s.setPollutant);
  const setRange = useView((s) => s.setRange);

  const p = pollutant(key);
  const days = daysOf(range);
  const hours = days * 24;
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "";
  const cities = compare.map(cityBySlug).filter((c): c is City => c != null);
  const queries = useAllSeries(cities, days);

  const entries = cities.map((city, i) => {
    const q = queries[i];
    const means = q.data ? rolling(q.data.values[key], p.window).slice(-hours) : [];
    const time = q.data ? q.data.time.slice(-hours) : [];
    let high: { t: number; v: number } | null = null;
    means.forEach((v, j) => {
      if (v != null && (!high || v > high.v)) high = { t: time[j], v };
    });
    let last: number | null = null;
    for (let j = means.length - 1; j >= 0 && last == null; j--) last = means[j];
    return {
      city,
      style: STYLES[i % STYLES.length],
      pending: q.isPending,
      error: q.isError ? q.error : null,
      retry: () => void q.refetch(),
      line: q.data ? ({ id: city.slug, time, values: means } satisfies Line) : null,
      last,
      high: high as { t: number; v: number } | null,
      share: p.guideline != null && q.data ? shareAbove(means, p.guideline) : null,
    };
  });

  const drawn = entries.filter((e) => e.line);
  const points = plot(drawn.map((e) => e.line as Line), stepFor(hours));
  const lines = drawn.map((e) => ({ id: e.city.slug, label: e.city.name, color: e.style.color, dash: e.style.dash, width: 2.25 }));
  const loading = entries.some((e) => e.pending);
  const full = compare.length >= MAX_COMPARE;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <fieldset>
          <legend className="text-sm text-muted">
            Cities, up to {MAX_COMPARE} ({compare.length} chosen)
          </legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CITIES.map((city) => {
              const on = compare.includes(city.slug);
              return (
                <button
                  key={city.slug}
                  type="button"
                  aria-pressed={on}
                  disabled={(!on && full) || (on && compare.length === 1)}
                  onClick={() => toggle(city.slug)}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted transition-colors enabled:hover:border-muted enabled:hover:text-ink disabled:opacity-45 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg aria-pressed:opacity-100 aria-pressed:enabled:hover:text-bg"
                >
                  {city.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Pollutant">
            <select value={key} onChange={(e) => setPollutant(e.target.value as PollutantKey)} className={selectClass}>
              {POLLUTANTS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}, {item.name.toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
        </div>
      </div>

      <section aria-labelledby="lines">
        <h2 id="lines" className="text-xl font-semibold tracking-tight">
          {p.name} ({p.label}), last {rangeLabel}
        </h2>
        <p className="mt-1 text-muted">Each line is a city’s {p.window}-hour mean. The cities sit in different time zones, so times here are in UTC.</p>
        <figure className="mt-4 rounded-lg border border-line bg-surface p-3 sm:p-4">
          <div className="h-72 sm:h-96">
            {drawn.length > 0 ? (
              <Chart points={points} lines={lines} guideline={p.guideline} tz="UTC" />
            ) : loading ? (
              <div className="skeleton h-full" />
            ) : (
              <p className="grid h-full place-items-center text-muted">Nothing to draw yet.</p>
            )}
          </div>
          <figcaption className="mt-3">
            <Legend items={lines} guideline={p.guideline != null ? `WHO guideline, ${fmt(p.guideline)} ${UNIT}` : undefined} />
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="figures">
        <h2 id="figures" className="text-xl font-semibold tracking-tight">
          Side by side
        </h2>
        <div tabIndex={0} role="region" aria-label="Side by side table" className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[44rem] whitespace-nowrap text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-normal">City</th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">Latest {p.window}-hour mean</th>
                <th scope="col" className="px-4 py-2.5 font-normal">Against guideline</th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">Highest mean</th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">Time above guideline</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.city.slug} className="border-t border-line">
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-2.5">
                      <Swatch color={e.style.color} dash={e.style.dash} />
                      {e.city.name}
                    </span>
                  </th>
                  {e.pending && (
                    <td colSpan={4} className="px-4 py-3">
                      <span className="skeleton block h-5" />
                      <span className="sr-only">Loading</span>
                    </td>
                  )}
                  {!e.pending && e.error != null && (
                    <td colSpan={4} className="px-4 py-3">
                      <Failure error={e.error} onRetry={e.retry} className="text-muted" />
                    </td>
                  )}
                  {!e.pending && e.error == null && (
                    <>
                      <td className="num px-4 py-3 text-right">
                        {fmt(e.last)} <span className="text-xs text-muted">{UNIT}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.guideline != null && e.last != null ? (
                          <span className="flex flex-wrap items-center gap-x-2">
                            <span className="num">{times(e.last / p.guideline)}</span>
                            <Band ratio={e.last / p.guideline} className="text-muted" />
                          </span>
                        ) : (
                          <span className="text-muted">{p.guideline == null ? "No WHO guideline" : "–"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="num">{fmt(e.high?.v)}</span>
                        {e.high && <span className="block text-xs text-muted">{dateTime(e.high.t, "UTC")}</span>}
                      </td>
                      <td className="num px-4 py-3 text-right">{e.share != null ? percent(e.share) : "–"}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
