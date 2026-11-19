"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CITIES } from "@/lib/cities";
import { download } from "@/lib/download";
import { dateTime } from "@/lib/format";
import { POLLUTANTS, UNIT, fmt, pollutant, type PollutantKey } from "@/lib/pollutants";
import { RANGES, daysOf } from "@/lib/queries";
import { toCsv, toRows, trim, type Row } from "@/lib/series";
import { useView } from "@/lib/store";
import { useCollectedSeries } from "@/lib/use-series";
import { Failure, Field, Segmented, Updated, selectClass } from "@/components/ui";

type SortKey = "city" | "t" | PollutantKey;
type Sort = { key: SortKey; dir: 1 | -1 };

const ROW = 36;
const COLS = "grid min-w-[58rem] grid-cols-[10rem_8.5rem_repeat(7,minmax(4.75rem,1fr))] items-center";
const WITH_GUIDELINE = POLLUTANTS.filter((p) => p.guideline != null);

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
  const shown = useMemo(() => {
    const limit = pollutant(limitKey).guideline;
    const kept = only && limit != null ? rows.filter((r) => (r[limitKey] ?? 0) > limit) : rows;
    return order(kept, sort);
  }, [rows, only, limitKey, sort]);

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-4">
        <Field label="City">
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className={selectClass}>
            <option value="all">All {CITIES.length} cities</option>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
        <div className="flex flex-wrap items-center gap-2 text-sm sm:h-9">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Only hours above the guideline level for
          </label>
          <select aria-label="Pollutant to filter by" value={limitKey} onChange={(e) => setLimitKey(e.target.value as PollutantKey)} className={selectClass}>
            {WITH_GUIDELINE.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} ({fmt(p.guideline)} {UNIT})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="text-sm" aria-live="polite">
          <span className="num font-medium">{shown.length.toLocaleString("en-GB")}</span> {shown.length === 1 ? "row" : "rows"}
          {pending > 0 && (
            <span className="text-muted">
              {" "}
              · loading {cities.length - pending} of {cities.length} {cities.length === 1 ? "city" : "cities"}
            </span>
          )}
          <span className="text-muted"> · all values in {UNIT}</span>
        </div>
        <div className="flex items-center gap-4">
          <Updated at={updatedAt} fetching={fetching} />
          <button
            type="button"
            disabled={shown.length === 0}
            onClick={() => download(toCsv(shown), `harmattan-${slug}-${range}.csv`)}
            className="h-9 rounded-md bg-ink px-3.5 text-sm font-medium text-bg hover:opacity-85 disabled:opacity-40"
          >
            Download CSV
          </button>
        </div>
      </div>

      {failures.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-4">
          {failures.map((f) => (
            <li key={cities[f.index].slug} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium">{cities[f.index].name}:</span>
              <Failure error={f.error} onRetry={f.retry} className="text-muted" />
            </li>
          ))}
        </ul>
      )}

      <div
        ref={scroller}
        tabIndex={0}
        role="table"
        aria-label="Hourly readings"
        aria-rowcount={shown.length + 1}
        className="h-[65vh] min-h-80 overflow-auto rounded-lg border border-line bg-surface text-sm"
      >
        <div role="rowgroup" className="sticky top-0 z-10 w-max min-w-full bg-surface shadow-[0_1px_0_var(--line)]">
          <div role="row" aria-rowindex={1} className={COLS}>
            {columns.map((c) => (
              <div
                key={c.key}
                role="columnheader"
                aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                className={c.numeric ? "text-right" : ""}
              >
                <button type="button" onClick={() => sortBy(c.key)} className="w-full px-3 py-2.5 text-xs uppercase tracking-wide text-muted hover:text-ink" style={{ textAlign: "inherit" }}>
                  {c.numeric && <Arrow dir={sort.key === c.key ? sort.dir : 0} />}
                  {c.label}
                  {!c.numeric && <Arrow dir={sort.key === c.key ? sort.dir : 0} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="p-6 text-muted">{pending > 0 ? "Loading readings…" : failures.length > 0 ? "Nothing could be loaded." : "No hours match."}</p>
        ) : (
          <div role="rowgroup" className="relative w-max min-w-full" style={{ height: virtual.getTotalSize() }}>
            {virtual.getVirtualItems().map((item) => {
              const row = shown[item.index];
              return (
                <div
                  key={item.key}
                  role="row"
                  aria-rowindex={item.index + 2}
                  className={`${COLS} absolute left-0 top-0 w-full border-b border-line`}
                  style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                >
                  <div role="cell" className="truncate px-3">
                    {row.city}
                  </div>
                  <div role="cell" className="num px-3 text-muted">
                    {dateTime(row.t, "UTC")}
                  </div>
                  {POLLUTANTS.map((p) => {
                    const v = row[p.key];
                    const over = v != null && p.guideline != null && v > p.guideline;
                    return (
                      <div key={p.key} role="cell" className={`num px-3 text-right ${over ? "font-semibold" : "text-muted"}`}>
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
      <p className="text-sm text-muted">
        Figures in bold are above the guideline level for that pollutant. The guidelines are set for a mean over {pollutant("pm2_5").window} hours ({pollutant("ozone").window} for
        ozone), so a single high hour is a signal, not a breach.
      </p>
    </div>
  );
}
