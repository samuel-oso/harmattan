"use client";

import type { CSSProperties } from "react";
import { CITIES, cityBySlug, type City } from "@/lib/cities";
import { dateTime, percent } from "@/lib/format";
import { POLLUTANTS, UNIT, band, fmt, pollutant, times } from "@/lib/pollutants";
import { RANGES, daysOf } from "@/lib/queries";
import { plot, rolling, shareAbove, stepFor, type Line } from "@/lib/series";
import { MAX_COMPARE, useView } from "@/lib/store";
import { useAllSeries } from "@/lib/use-series";
import { Chart, Legend, Swatch } from "@/components/charts/chart";
import { Flap } from "@/components/flap";
import { Head } from "@/components/head";
import { Band, Failure, Segmented } from "@/components/ui";

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
  const open = Array.from({ length: MAX_COMPARE - entries.length }, (_, i) => entries.length + i + 1);

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <section aria-labelledby="lineup">
        <Head no="01" id="lineup" title="Line-up">
          The cities on the chart, each with its latest {p.window}-hour mean of {p.label}. Change them from the list underneath.
        </Head>
        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {entries.map((e, i) => {
            const ratio = e.last != null && p.guideline != null ? e.last / p.guideline : null;
            return (
              <div key={e.city.slug} className="reading unfold" style={{ "--c": e.style.color, "--d": i, background: "var(--surface)" } as CSSProperties}>
                <span className="label flex items-center justify-between gap-2 text-muted">
                  <span>Line {i + 1}</span>
                  <Swatch color={e.style.color} dash={e.style.dash} />
                </span>
                <span className="stencil mt-2 text-xl leading-tight sm:text-2xl">
                  <Flap text={e.city.name} />
                </span>
                <span className="label mt-1 text-muted">
                  {e.city.code} · {e.city.country}
                </span>
                {e.pending ? (
                  <span className="skeleton mt-auto h-14" />
                ) : e.error != null ? (
                  <span className="mt-auto pt-4 text-sm text-muted">Couldn’t load. See the table below.</span>
                ) : (
                  <>
                    <span className="big mt-auto pt-6 text-5xl" style={{ color: ratio != null ? `var(--band-${band(ratio)})` : undefined }}>
                      <Flap text={fmt(e.last)} delay={i * 40} />
                    </span>
                    <span className="num mt-2 text-xs text-muted">
                      {UNIT}, {p.window}-hour mean
                    </span>
                    <span className="mt-2 min-h-8 text-xs">
                      {ratio != null ? <Band ratio={ratio} /> : <span className="text-muted">{p.guideline == null ? "No WHO guideline" : "Not enough hours"}</span>}
                    </span>
                  </>
                )}
              </div>
            );
          })}
          {open.map((n) => (
            <div key={n} className="label flex min-h-[12.5rem] flex-col justify-between border border-dashed border-line p-3 text-muted">
              <span>Line {n}</span>
              <span>Open</span>
            </div>
          ))}
        </div>

        <fieldset className="mt-6">
          <legend className="label text-muted">
            Cities, up to {MAX_COMPARE} ({compare.length} chosen)
          </legend>
          <div className="mt-2 flex flex-wrap gap-1">
            {CITIES.map((city) => {
              const on = compare.includes(city.slug);
              return (
                <button
                  key={city.slug}
                  type="button"
                  aria-pressed={on}
                  disabled={(!on && full) || (on && compare.length === 1)}
                  onClick={() => toggle(city.slug)}
                  className="key label px-3 py-2 text-muted enabled:hover:text-ink disabled:opacity-45 aria-pressed:opacity-100"
                >
                  {city.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="lines">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <Head no="02" id="lines" title={`${p.name} (${p.label}), last ${rangeLabel}`}>
            Each line is a city’s {p.window}-hour mean. The cities sit in different time zones, so times here are in UTC.
          </Head>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <Segmented label="Pollutant" options={POLLUTANTS} value={key} onChange={setPollutant} />
            <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
          </div>
        </div>
        <figure className="corners mt-5 border border-line bg-surface">
          <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-3 py-2.5 sm:px-4">
            <span aria-hidden className="label flex items-center gap-2 text-accent">
              <span className="live-dot size-1.5 bg-accent" />
              Trace
            </span>
            <Legend items={lines} guideline={p.guideline != null ? `WHO guideline, ${fmt(p.guideline)} ${UNIT}` : undefined} />
          </figcaption>
          <div key={`${key}:${range}:${drawn.length}`} className="trace h-72 p-3 sm:h-96 sm:p-4">
            {drawn.length > 0 ? (
              <Chart points={points} lines={lines} guideline={p.guideline} tz="UTC" />
            ) : loading ? (
              <div className="skeleton h-full" />
            ) : (
              <p className="grid h-full place-items-center text-muted">Nothing to draw yet.</p>
            )}
          </div>
        </figure>
      </section>

      <section aria-labelledby="figures">
        <Head no="03" id="figures" title="Side by side" />
        <div tabIndex={0} role="region" aria-label="Side by side table" className="mt-5 overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[46rem] whitespace-nowrap text-sm">
            <thead className="label bg-sunk text-left text-muted shadow-[0_1px_0_var(--line)]">
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
                <tr key={e.city.slug} className="border-t border-line hover:bg-sunk">
                  <th scope="row" className="px-4 py-3 text-left font-bold uppercase tracking-wide">
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
                        {e.high && <span className="num block text-xs uppercase text-muted">{dateTime(e.high.t, "UTC")}</span>}
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
