"use client";

import { useMemo } from "react";
import type { City } from "@/lib/cities";
import { clock, dateTime, isoDayLabel, percent } from "@/lib/format";
import type { Series } from "@/lib/open-meteo";
import { POLLUTANTS, UNIT, fmt, pollutant, times, type Pollutant } from "@/lib/pollutants";
import { RANGES, daysOf } from "@/lib/queries";
import { dailySummaries, hourGrid, lastMean, latest, mean, peak, plot, rolling, shareAbove, stepFor, trim } from "@/lib/series";
import { useView } from "@/lib/store";
import { useSeries } from "@/lib/use-series";
import { Chart, Legend } from "@/components/charts/chart";
import { Heatmap } from "@/components/heatmap";
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

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
        <Updated at={dataUpdatedAt} fetching={isFetching && !isPending} />
      </div>

      {isError && (
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="mb-1 font-medium">Couldn’t load {city.name}.</p>
          <Failure error={error} onRetry={() => void refetch()} className="text-muted" />
        </div>
      )}

      {!isError && (
        <>
          <section aria-labelledby="now">
            <h2 id="now" className="text-xl font-semibold tracking-tight">
              Right now
            </h2>
            <p className="mt-1 text-muted">The latest mean for each pollutant, over the hours its guideline is set for. Pick one to chart it.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {POLLUTANTS.map((item) => {
                const value = data ? lastMean(data, item.key, item.window) : null;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={item.key === key}
                    onClick={() => setPollutant(item.key)}
                    className="flex min-h-32 flex-col rounded-lg border border-line bg-surface p-3 text-left transition-colors hover:border-muted aria-pressed:border-accent aria-pressed:ring-1 aria-pressed:ring-accent"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted">{item.name}</span>
                    {isPending ? (
                      <span className="skeleton mt-auto h-10" />
                    ) : (
                      <>
                        <span className="num mt-auto pt-3 text-2xl">{fmt(value)}</span>
                        <span className="text-xs text-muted">
                          {UNIT}, {item.window}-hour mean
                        </span>
                        <span className="mt-1.5 text-xs">
                          {item.guideline == null ? (
                            <span className="text-muted">No WHO guideline</span>
                          ) : value == null ? (
                            <span className="text-muted">Not enough hours</span>
                          ) : (
                            <Band ratio={value / item.guideline} />
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
            <h2 id="trend" className="text-xl font-semibold tracking-tight">
              {p.name} ({p.label}), last {rangeLabel}
            </h2>
            <p className="mt-1 text-muted">
              {p.guideline != null
                ? `The WHO guideline is ${fmt(p.guideline)} ${UNIT} as a ${p.window}-hour mean, so the heavier line is the one to read against it.`
                : "The WHO sets no guideline for desert dust on its own; it counts towards the particle figures."}{" "}
              Times are local to {city.name}.
            </p>
            <figure className="mt-4 rounded-lg border border-line bg-surface p-3 sm:p-4">
              <div className="h-64 sm:h-80">{view ? <Chart points={view.points} lines={lines} guideline={p.guideline} tz={city.tz} /> : <div className="skeleton h-full" />}</div>
              <figcaption className="mt-3">
                <Legend items={lines} guideline={p.guideline != null ? `WHO guideline, ${fmt(p.guideline)} ${UNIT}` : undefined} />
              </figcaption>
            </figure>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Stat label="Latest hour" value={view?.latest?.v} note={view?.latest ? `at ${clock(view.latest.t, city.tz)}` : ""} pending={!view} />
              <Stat label="Highest hour" value={view?.peak?.v} note={view?.peak ? dateTime(view.peak.t, city.tz) : ""} pending={!view} />
              <Stat label={`Mean over ${rangeLabel}`} value={view?.average} note={p.guideline != null && view?.average != null ? `${times(view.average / p.guideline)} the guideline` : ""} pending={!view} />
              {p.guideline != null && (
                <Stat label="Time above guideline" text={view?.share != null ? percent(view.share) : "–"} note={`of ${p.window}-hour means`} pending={!view} />
              )}
            </dl>
          </section>

          {days >= 7 && (
            <section aria-labelledby="pattern">
              <h2 id="pattern" className="text-xl font-semibold tracking-tight">
                When it is highest
              </h2>
              <p className="mt-1 text-muted">
                Mean {p.label} for each weekday and hour over the last {rangeLabel}, local time.
              </p>
              <div className="mt-4 rounded-lg border border-line bg-surface p-3 sm:p-4">
                {view?.grid ? <Heatmap grid={view.grid} label={p.label} /> : <div className="skeleton h-56" />}
              </div>
            </section>
          )}

          <section aria-labelledby="daily">
            <h2 id="daily" className="text-xl font-semibold tracking-tight">
              Day by day
            </h2>
            <p className="mt-1 text-muted">The same readings as a table. A day with fewer than 18 hours of data has no mean.</p>
            <div tabIndex={0} role="region" aria-label="Day by day table" className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-line bg-surface">
              <table className="w-full min-w-[36rem] whitespace-nowrap text-sm">
                <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-muted shadow-[0_1px_0_var(--line)]">
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
                    <tr key={day.day} className="border-t border-line">
                      <th scope="row" className="px-4 py-2.5 text-left font-normal">{isoDayLabel(day.day)}</th>
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

function Stat({ label, value, text, note, pending }: { label: string; value?: number | null; text?: string; note: string; pending: boolean }) {
  return (
    <div className="border-t border-line pt-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 min-h-14">
        {pending ? (
          <span className="skeleton block h-8 w-24" />
        ) : (
          <>
            <span className="num text-2xl">{text ?? fmt(value)}</span>
            {text == null && <span className="ml-1 text-xs text-muted">{UNIT}</span>}
            <span className="block text-xs text-muted">{note}</span>
          </>
        )}
      </dd>
    </div>
  );
}
