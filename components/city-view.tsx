"use client";

import { useMemo, type CSSProperties } from "react";
import type { City } from "@/lib/cities";
import { clock, dateTime, isoDayLabel, percent } from "@/lib/format";
import type { Series } from "@/lib/open-meteo";
import { POLLUTANTS, UNIT, band, fmt, pollutant, times, type Pollutant } from "@/lib/pollutants";
import { RANGES, daysOf } from "@/lib/queries";
import { dailySummaries, hourGrid, lastMean, latest, mean, peak, plot, rolling, shareAbove, stepFor, trim } from "@/lib/series";
import { useView } from "@/lib/store";
import { useSeries } from "@/lib/use-series";
import { Chart, Legend } from "@/components/charts/chart";
import { Flap } from "@/components/flap";
import { Heatmap } from "@/components/heatmap";
import { Head } from "@/components/head";
import { Band, Failure, Segmented, Updated } from "@/components/ui";

function summarise(series: Series, p: Pollutant, days: number, tz: string) {
  const hours = days * 24;
  const visible = trim(series, hours);
  const means = rolling(series.values[p.key], p.window).slice(-hours);
  const step = stepFor(visible.time.length);
  return {
    step,
    points: plot(
      [
        { id: "hourly", time: visible.time, values: visible.values[p.key] },
        { id: "mean", time: visible.time, values: means },
      ],
      step,
    ),
    latest: latest(visible, p.key),
    peak: peak(visible, p.key),
    average: mean(visible.values[p.key]),
    share: p.guideline != null ? shareAbove(means, p.guideline) : null,
    daily: dailySummaries(visible, p.key, tz).reverse(),
    grid: days >= 7 ? hourGrid(visible, p.key, tz) : null,
  };
}

const tone = (ratio: number | null) => (ratio != null ? `var(--band-${band(ratio)})` : "var(--ink)");
const CELL = "border-line px-4 py-4 max-lg:odd:border-r max-lg:nth-[n+3]:border-t sm:px-5 lg:not-first:border-l";

export function CityView({ city }: { city: City }) {
  const range = useView((s) => s.range);
  const key = useView((s) => s.pollutant);
  const setRange = useView((s) => s.setRange);
  const setPollutant = useView((s) => s.setPollutant);
  const days = daysOf(range);
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "";
  const p = pollutant(key);

  const { data, isPending, isError, error, refetch, isFetching, dataUpdatedAt } = useSeries(city, days);
  const view = useMemo(() => (data ? summarise(data, p, days, city.tz) : null), [data, p, days, city.tz]);

  const lines = [
    { id: "hourly", label: view && view.step > 1 ? `${view.step}-hour mean` : "Hourly", color: "var(--muted)", width: 1, opacity: 0.7 },
    { id: "mean", label: `${p.window}-hour mean`, color: "var(--accent)", width: 2.5 },
  ];
  const average = view?.average != null && p.guideline != null ? view.average / p.guideline : null;

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      {isError && (
        <div className="corners border border-line bg-surface">
          <div aria-hidden className="hazard h-1.5" />
          <div className="p-5">
            <p className="stencil mb-2 text-xl">Couldn’t load {city.name}.</p>
            <Failure error={error} onRetry={() => void refetch()} className="text-muted" />
          </div>
        </div>
      )}

      {!isError && (
        <>
          <section aria-labelledby="now">
            <Head no="01" id="now" title="Right now">
              The latest mean for each pollutant, over the hours its guideline is set for. Pick one to chart it.
            </Head>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {POLLUTANTS.map((item, i) => {
                const value = data ? lastMean(data, item.key, item.window) : null;
                const ratio = value != null && item.guideline != null ? value / item.guideline : null;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={item.key === key}
                    onClick={() => setPollutant(item.key)}
                    className="reading unfold"
                    style={{ "--c": ratio != null ? tone(ratio) : "var(--line)", "--d": i } as CSSProperties}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="stencil text-xl leading-none">{item.label}</span>
                      <span aria-hidden className="lamp" />
                    </span>
                    <span className="label mt-1.5 text-muted">{item.name}</span>
                    {isPending ? (
                      <span className="skeleton mt-auto h-14" />
                    ) : (
                      <>
                        <span className="big mt-auto pt-6 text-5xl" style={{ color: tone(ratio) }}>
                          <Flap text={fmt(value)} delay={i * 40} />
                        </span>
                        <span className="num mt-2 text-xs text-muted">
                          {UNIT}, {item.window}-hour mean
                        </span>
                        <span className="mt-2 min-h-8 text-xs">
                          {item.guideline == null ? (
                            <span className="text-muted">No WHO guideline</span>
                          ) : ratio == null ? (
                            <span className="text-muted">Not enough hours</span>
                          ) : (
                            <Band ratio={ratio} />
                          )}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="trend">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <Head no="02" id="trend" title={`${p.name} (${p.label}), last ${rangeLabel}`}>
                {p.guideline != null
                  ? `The WHO guideline is ${fmt(p.guideline)} ${UNIT} as a ${p.window}-hour mean, so the heavier line is the one to read against it.`
                  : "The WHO sets no guideline for desert dust on its own; it counts towards the particle figures."}{" "}
                Times are local to {city.name}.
              </Head>
              <div className="flex flex-col items-start gap-2 lg:items-end">
                <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
                <Updated at={dataUpdatedAt} fetching={isFetching && !isPending} />
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
              <div key={`${key}:${range}:${view ? 1 : 0}`} className="trace h-64 p-3 sm:h-80 sm:p-4">
                {view ? <Chart points={view.points} lines={lines} guideline={p.guideline} tz={city.tz} /> : <div className="skeleton h-full" />}
              </div>
            </figure>

            <dl className="mt-2 grid grid-cols-2 border border-line bg-surface lg:grid-cols-4">
              <Stat label="Latest hour" figure={fmt(view?.latest?.v)} unit note={view?.latest ? `at ${clock(view.latest.t, city.tz)}` : ""} pending={!view} />
              <Stat label="Highest hour" figure={fmt(view?.peak?.v)} unit note={view?.peak ? dateTime(view.peak.t, city.tz) : ""} pending={!view} />
              <Stat
                label={`Mean over ${rangeLabel}`}
                figure={fmt(view?.average)}
                unit
                note={average != null ? `${times(average)} the guideline` : ""}
                color={average != null ? tone(average) : undefined}
                pending={!view}
              />
              <Stat
                label="Time above guideline"
                figure={view?.share != null ? percent(view.share) : "–"}
                note={p.guideline != null ? `of ${p.window}-hour means` : "No WHO guideline"}
                pending={!view}
              />
            </dl>
          </section>

          {days >= 7 && (
            <section aria-labelledby="pattern">
              <Head no="03" id="pattern" title="When it is highest">
                Mean {p.label} for each weekday and hour over the last {rangeLabel}, local time.
              </Head>
              <div className="corners mt-5 border border-line bg-surface p-3 sm:p-4">
                {view?.grid ? <Heatmap grid={view.grid} label={p.label} /> : <div className="skeleton h-56" />}
              </div>
            </section>
          )}

          <section aria-labelledby="daily">
            <Head no={days >= 7 ? "04" : "03"} id="daily" title="Day by day">
              The same readings as a table. A day with fewer than 18 hours of data has no mean.
            </Head>
            <div tabIndex={0} role="region" aria-label="Day by day table" className="mt-5 max-h-[28rem] overflow-auto border border-line bg-surface">
              <table className="w-full min-w-[36rem] whitespace-nowrap text-sm">
                <thead className="label sticky top-0 bg-sunk text-left text-muted shadow-[0_1px_0_var(--line)]">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-normal">Day</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-normal">Mean</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-normal">Lowest hour</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-normal">Highest hour</th>
                    {p.guideline != null && <th scope="col" className="px-4 py-2.5 font-normal">Against guideline</th>}
                  </tr>
                </thead>
                <tbody>
                  {!view &&
                    [0, 1, 2, 3].map((i) => (
                      <tr key={i} className="border-t border-line">
                        <td colSpan={5} className="px-4 py-2.5">
                          <span className="skeleton block h-5" />
                        </td>
                      </tr>
                    ))}
                  {view?.daily.map((day) => (
                    <tr key={day.day} className="border-t border-line hover:bg-sunk">
                      <th scope="row" className="num px-4 py-2.5 text-left font-normal uppercase">{isoDayLabel(day.day)}</th>
                      <td className="num px-4 py-2.5 text-right">{fmt(day.mean)}</td>
                      <td className="num px-4 py-2.5 text-right text-muted">{fmt(day.min)}</td>
                      <td className="num px-4 py-2.5 text-right text-muted">{fmt(day.max)}</td>
                      {p.guideline != null && (
                        <td className="px-4 py-2.5">
                          {/* the daily guidelines are for a whole day; ozone's is for its worst 8 hours, which a daily mean cannot show */}
                          {day.mean != null && p.window === 24 ? (
                            <span className="flex flex-wrap items-center gap-x-2">
                              <span className="num">{times(day.mean / p.guideline)}</span>
                              <Band ratio={day.mean / p.guideline} className="text-muted" />
                            </span>
                          ) : (
                            <span className="text-muted">–</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, figure, unit, note, color, pending }: { label: string; figure: string; unit?: boolean; note: string; color?: string; pending: boolean }) {
  return (
    <div className={CELL}>
      <dt className="label text-muted">{label}</dt>
      <dd className="mt-3 min-h-[4.5rem]">
        {pending ? (
          <span className="skeleton block h-12 w-24" />
        ) : (
          <>
            <span key="figure" className="flex flex-wrap items-end gap-x-2 gap-y-1">
              <span className="big text-5xl sm:text-6xl" style={{ color }}>
                <Flap text={figure} />
              </span>
              {unit && <span className="num text-xs text-muted">{UNIT}</span>}
            </span>
            <span className="label mt-2 block text-muted">{note}</span>
          </>
        )}
      </dd>
    </div>
  );
}
