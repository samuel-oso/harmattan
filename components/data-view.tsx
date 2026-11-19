"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CITIES } from "@/lib/cities";
import { download } from "@/lib/download";
import { dateTime, percent } from "@/lib/format";
import { POLLUTANTS, UNIT, fmt, pollutant, type PollutantKey } from "@/lib/pollutants";
import { RANGES, daysOf } from "@/lib/queries";
import { toCsv, toRows, trim, type Row } from "@/lib/series";
import { useView } from "@/lib/store";
import { useCollectedSeries } from "@/lib/use-series";
import { Flap } from "@/components/flap";
import { Head } from "@/components/head";
import { Select } from "@/components/select";
import { Failure, Segmented, Updated } from "@/components/ui";

type SortKey = "city" | "t" | PollutantKey;
type Sort = { key: SortKey; dir: 1 | -1 };

const ROW = 36;
const COLS = "grid min-w-[60rem] grid-cols-[10rem_10.5rem_repeat(7,minmax(4.75rem,1fr))] items-center";
const CITY_OPTIONS = [{ key: "all", label: `All ${CITIES.length} cities` }, ...CITIES.map((c) => ({ key: c.slug, label: c.name }))];
const LIMIT_OPTIONS = POLLUTANTS.filter((p) => p.guideline != null).map((p) => ({ key: p.key, label: p.label, hint: `${fmt(p.guideline)} ${UNIT}` }));
const PANE = "border-line p-4 sm:p-5 max-lg:not-first:border-t lg:not-first:border-l";
// the city stays in view while the readings scroll sideways
const PINNED = "sticky left-0 z-[1] self-stretch border-r border-line";
const CELL = "border-line px-4 py-4 max-lg:odd:border-r max-lg:nth-[n+3]:border-t sm:px-5 lg:not-first:border-l";
const count = (n: number) => n.toLocaleString("en-GB");

function Figure({ label, figure, note }: { label: string; figure: string; note: string }) {
  return (
    <div className={CELL}>
      <dt className="label text-muted">{label}</dt>
      <dd className="mt-3">
        <span className="big block text-5xl sm:text-6xl">
          <Flap text={figure} />
        </span>
        <span className="label mt-2 block text-muted">{note}</span>
      </dd>
    </div>
  );
}

function Arrow({ dir }: { dir: 1 | -1 | 0 }) {
  return (
    <span aria-hidden className="mx-1 inline-block w-2">
      {dir === 0 ? "" : dir === 1 ? "↑" : "↓"}
    </span>
  );
}

function order(rows: Row[], { key, dir }: Sort): Row[] {
  return [...rows].sort((a, b) => {
    if (key === "city") return dir * a.city.localeCompare(b.city) || b.t - a.t;
    const x = a[key];
    const y = b[key];
    // hours with no reading go last, whichever way the column is sorted
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    return dir * (x - y) || a.city.localeCompare(b.city);
  });
}

export function DataView() {
  const range = useView((s) => s.range);
  const setRange = useView((s) => s.setRange);
  const [slug, setSlug] = useState("all");
  const [sort, setSort] = useState<Sort>({ key: "t", dir: -1 });
  const [only, setOnly] = useState(false);
  const [limitKey, setLimitKey] = useState<PollutantKey>("pm2_5");

  const days = daysOf(range);
  const cities = useMemo(() => (slug === "all" ? CITIES : CITIES.filter((c) => c.slug === slug)), [slug]);
  const { series, pending, failures, fetching, updatedAt } = useCollectedSeries(cities, days);

  const rows = useMemo(() => toRows(series.map((s) => trim(s, days * 24))), [series, days]);
  const above = useMemo(() => {
    const limit = pollutant(limitKey).guideline;
    return limit != null ? rows.filter((r) => (r[limitKey] ?? 0) > limit) : null;
  }, [rows, limitKey]);
  const shown = useMemo(() => order(only && above ? above : rows, sort), [rows, above, only, sort]);
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "";

  const scroller = useRef<HTMLDivElement>(null);
  // only the rows on screen are in the page, however long the table is
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtual = useVirtualizer({ count: shown.length, getScrollElement: () => scroller.current, estimateSize: () => ROW, overscan: 12 });

  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "city" ? 1 : -1 }));
  const columns: { key: SortKey; label: string; numeric: boolean }[] = [
    { key: "city", label: "City", numeric: false },
    { key: "t", label: "Time (UTC)", numeric: false },
    ...POLLUTANTS.map((p) => ({ key: p.key, label: p.label, numeric: true })),
  ];

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <section aria-labelledby="filters">
        <Head no="01" id="filters" title="Filters">
          Narrow the log to one city or a shorter stretch, or keep only the hours above a guideline level.
        </Head>
        <div className="unfold corners mt-5 grid border border-line bg-surface lg:grid-cols-[16rem_auto_minmax(0,1fr)]">
          <div className={PANE}>
            <Select label="City" options={CITY_OPTIONS} value={slug} onChange={setSlug} />
          </div>
          <div className={`${PANE} flex flex-col gap-2`}>
            <p aria-hidden className="label text-muted">
              Time range
            </p>
            <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
          </div>
          <div className={`${PANE} flex flex-col gap-2`}>
            <p className="label text-muted">Above guideline</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <label className="flex min-h-10 items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={only}
                  onChange={(e) => setOnly(e.target.checked)}
                  className="size-4 shrink-0 appearance-none border border-muted checked:border-accent checked:bg-accent forced-colors:appearance-auto"
                />
                Only hours above the guideline level for
              </label>
              <Select bare label="Pollutant to filter by" options={LIMIT_OPTIONS} value={limitKey} onChange={setLimitKey} className="min-w-44" />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="log">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <Head no="02" id="log" title="Hourly readings">
            Every value is in {UNIT} and every time is in UTC. Press a column heading to sort by it.
          </Head>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Updated at={updatedAt} fetching={fetching} />
            <button
              type="button"
              disabled={shown.length === 0}
              onClick={() => download(toCsv(shown), `harmattan-${slug}-${range}.csv`)}
              className="label bg-accent px-4 py-3 font-bold text-bg enabled:hover:bg-ink disabled:opacity-40"
            >
              Download CSV
            </button>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 border border-line bg-surface lg:grid-cols-4">
          <div className={CELL}>
            <dt className="label text-muted">Rows shown</dt>
            <dd className="mt-3" aria-live="polite">
              <span className="num big block text-5xl sm:text-6xl">{count(shown.length)}</span>
              <span className="label mt-2 block text-muted">
                {only ? `of ${count(rows.length)} hours` : "one per city per hour"}
                {pending > 0 && ", still loading"}
              </span>
            </dd>
          </div>
          <Figure
            label="Cities loaded"
            figure={`${series.length}/${cities.length}`}
            note={pending > 0 ? "Loading" : failures.length > 0 ? `${failures.length} could not be loaded` : "All in"}
          />
          <Figure label="Hours per city" figure={count(days * 24)} note={`Last ${rangeLabel}`} />
          <Figure
            label={`Above ${pollutant(limitKey).label} level`}
            figure={above && rows.length > 0 ? percent(above.length / rows.length) : "–"}
            note="of the hours loaded"
          />
        </dl>

        {failures.length > 0 && (
          <div className="corners mt-2 border border-line bg-surface">
            <div aria-hidden className="hazard h-1.5" />
            <ul className="flex flex-col gap-1.5 p-4">
              {failures.map((f) => (
                <li key={cities[f.index].slug} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-bold uppercase tracking-wide">{cities[f.index].name}:</span>
                  <Failure error={f.error} onRetry={f.retry} className="text-muted" />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="corners mt-2 border border-line bg-surface">
          <div ref={scroller} tabIndex={0} role="table" data-lenis-prevent aria-label="Hourly readings" aria-rowcount={shown.length + 1} className="h-[65vh] min-h-80 overflow-auto text-sm">
            <div role="rowgroup" className="sticky top-0 z-10 w-max min-w-full bg-sunk shadow-[0_1px_0_var(--line)]">
              <div role="row" aria-rowindex={1} className={COLS}>
                {columns.map((c) => {
                  const dir = sort.key === c.key ? sort.dir : 0;
                  return (
                    <div
                      key={c.key}
                      role="columnheader"
                      aria-sort={dir === 0 ? "none" : dir === 1 ? "ascending" : "descending"}
                      className={`${c.numeric ? "text-right" : ""} ${c.key === "city" ? `${PINNED} bg-sunk` : ""} ${dir === 0 ? "" : "shadow-[inset_0_-2px_0_var(--accent)]"}`}
                    >
                      <button
                        type="button"
                        onClick={() => sortBy(c.key)}
                        className={`label w-full px-3 py-2.5 hover:text-ink ${dir === 0 ? "text-muted" : "text-ink"}`}
                        style={{ textAlign: "inherit" }}
                      >
                        {c.numeric && <Arrow dir={dir} />}
                        {c.label}
                        {!c.numeric && <Arrow dir={dir} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {shown.length === 0 ? (
              <p className="label p-6 text-muted">{pending > 0 ? "Loading readings…" : failures.length > 0 ? "Nothing could be loaded." : "No hours match."}</p>
            ) : (
              <div role="rowgroup" className="relative w-max min-w-full" style={{ height: virtual.getTotalSize() }}>
                {virtual.getVirtualItems().map((item) => {
                  const row = shown[item.index];
                  return (
                    <div
                      key={item.key}
                      role="row"
                      aria-rowindex={item.index + 2}
                      className={`${COLS} group absolute left-0 top-0 w-full border-b border-line hover:bg-sunk`}
                      style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                    >
                      <div role="cell" className={`${PINNED} flex items-center bg-surface px-3 font-bold uppercase tracking-wide group-hover:bg-sunk`}>
                        <span className="truncate">{row.city}</span>
                      </div>
                      <div role="cell" className="num px-3 uppercase text-muted">
                        {dateTime(row.t, "UTC")}
                      </div>
                      {POLLUTANTS.map((p) => {
                        const v = row[p.key];
                        const over = v != null && p.guideline != null && v > p.guideline;
                        return (
                          <div key={p.key} role="cell" className={`num px-3 text-right ${over ? "font-bold" : "text-muted"}`}>
                            {fmt(v)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-muted">
          Figures in bold are above the guideline level for that pollutant. The guidelines are set for a mean over {pollutant("pm2_5").window} hours ({pollutant("ozone").window} for
          ozone), so a single high hour is a signal, not a breach.
        </p>
      </section>
    </div>
  );
}
