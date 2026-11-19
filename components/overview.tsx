"use client";

import Link from "next/link";
import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { CITIES, type City } from "@/lib/cities";
import type { Series } from "@/lib/open-meteo";
import { UNIT, band, fmt, pollutant, times } from "@/lib/pollutants";
import { lastMean, rolling, thin } from "@/lib/series";
import { useAllSeries } from "@/lib/use-series";
import { Band, Failure, Updated } from "@/components/ui";
import { Flap } from "@/components/flap";
import { Sparkline } from "@/components/sparkline";
import { WindMap } from "@/components/wind-map";

const DAYS = 7;
const PM = pollutant("pm2_5");
const LIMIT = PM.guideline ?? 0;
const COLS = "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_12rem] sm:gap-x-5";

type Entry = {
  city: City;
  pending: boolean;
  error: unknown;
  retry: () => void;
  mean: number | null;
  trend: (number | null)[];
};

const tone = (ratio: number | null) => (ratio != null ? `var(--band-${band(ratio)})` : "var(--muted)");

function read(series: Series | undefined) {
  if (!series) return { mean: null, trend: [] };
  const means = rolling(series.values[PM.key], PM.window).slice(-DAYS * 24);
  return { mean: lastMean(series, PM.key, PM.window), trend: thin(means, 56) };
}

// up and down move through the ranking the way they move through a menu
function step(event: KeyboardEvent<HTMLOListElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>("a[data-row]")];
  const at = links.indexOf(document.activeElement as HTMLAnchorElement);
  if (at < 0) return;
  event.preventDefault();
  links[Math.min(Math.max(at + (event.key === "ArrowDown" ? 1 : -1), 0), links.length - 1)].focus();
}

export function Overview() {
  const [hovered, setHovered] = useState<string | null>(null);
  const queries = useAllSeries(CITIES, DAYS);
  const entries: Entry[] = CITIES.map((city, i) => {
    const q = queries[i];
    return { city, pending: q.isPending, error: q.isError ? q.error : null, retry: () => void q.refetch(), ...read(q.data) };
  });

  const settled = entries.every((e) => !e.pending);
  const loaded = entries.filter((e) => !e.pending && !e.error).length;
  const failed = entries.filter((e) => e.error).length;
  const measured = entries.filter((e) => e.mean != null);
  const above = measured.filter((e) => (e.mean as number) > LIMIT).length;
  // in the listed order while cities are still arriving, worst first once every one has answered
  const ranked = settled ? [...entries].sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1)) : entries;
  const worst = settled ? ranked.find((e) => e.mean != null) : undefined;
  const best = settled ? ranked.findLast((e) => e.mean != null) : undefined;
  // the right-hand end of every row's rule
  const top = Math.max(...measured.map((e) => (e.mean as number) / LIMIT), 1.5);
  const updatedAt = Math.max(0, ...queries.map((q) => q.dataUpdatedAt));
  const fetching = queries.some((q) => q.isFetching && !q.isPending);

  const markers = entries.map((e) => ({ city: e.city, mean: e.mean, ratio: e.mean != null ? e.mean / LIMIT : null, pending: e.pending, failed: e.error != null }));

  return (
    <>
      <p className="label mb-2 flex items-center gap-3 text-muted">
        <span className="stencil text-base text-ink">Sitrep</span>
        <span aria-hidden className="h-px flex-1 bg-line" />
        <span>PM2.5 against the guideline</span>
      </p>
      <dl className="grid grid-cols-2 border border-line bg-surface lg:grid-cols-4">
        <Stat order={0} label="Cities reporting" figure={String(loaded).padStart(2, "0")} note={`of ${CITIES.length}`} />
        <Stat
          order={1}
          label="Above the guideline"
          figure={settled ? String(above).padStart(2, "0") : "--"}
          note={settled ? `of ${measured.length}` : undefined}
          color={settled && above > 0 ? "var(--band-2)" : undefined}
        />
        <Extreme order={2} label="Highest" entry={worst} />
        <Extreme order={3} label="Lowest" entry={best} />
      </dl>

      <Board entries={entries} active={hovered} onActive={setHovered} />

      <div className="mt-10 grid gap-x-12 gap-y-10 sm:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] xl:grid-cols-[minmax(0,1fr)_31rem]">
        <div className="lg:sticky lg:top-20 lg:order-2 lg:self-start">
          <WindMap markers={markers} active={hovered ?? worst?.city.slug ?? null} onActive={setHovered} />
        </div>

        <section aria-labelledby="ranking" className="lg:order-1">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <h2 id="ranking" className="stencil text-2xl sm:text-3xl">
                Fine particles, last 24 hours
              </h2>
              <p className="mt-2 min-h-12 max-w-xl text-muted" aria-live="polite">
                {!settled && `Loading the latest hours: ${loaded} of ${CITIES.length} cities.`}
                {settled && measured.length > 0 && (
                  <>
                    {above} of {measured.length} cities are above the WHO guideline of {LIMIT} {UNIT}.
                    {worst?.mean != null && worst.mean > LIMIT && ` Highest: ${worst.city.name}, at ${times(worst.mean / LIMIT)} the guideline.`}
                    {failed > 0 && ` ${failed} could not be loaded.`}
                  </>
                )}
                {settled && measured.length === 0 && "None of the cities could be loaded."}
              </p>
            </div>
            <Updated at={updatedAt} fetching={fetching} />
          </div>

          <div className={`${COLS} label mt-6 border-b border-line pb-2 text-muted`} aria-hidden>
            <span>No.</span>
            <span>City</span>
            <span className="max-sm:hidden">7 days</span>
            <span className="text-right">× guideline</span>
          </div>
          <ol className="rows" data-settled={settled} onKeyDown={step}>
            {ranked.map((e, i) => (
              <Row key={i} index={i} entry={e} rank={settled && e.mean != null ? i + 1 : null} top={top} lit={hovered === e.city.slug} onActive={setHovered} />
            ))}
          </ol>
          <p className="label mt-4 flex items-center gap-2 text-muted max-lg:hidden" aria-hidden>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <span className="mr-3">Move</span>
            <kbd>Enter</kbd>
            <span>Open the city</span>
          </p>
        </section>
      </div>
    </>
  );
}

function Stat({ order, label, figure, note, color }: { order: number; label: string; figure: string; note?: string; color?: string }) {
  return (
    <div
      className="unfold border-line px-4 py-4 max-lg:odd:border-r max-lg:nth-[n+3]:border-t sm:px-5 lg:not-first:border-l"
      style={{ "--d": order } as CSSProperties}
    >
      <dt className="label text-muted">{label}</dt>
      <dd className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
        <span className="big text-6xl sm:text-7xl" style={{ color }}>
          <Flap plates text={figure} />
        </span>
        {note && <span className="label min-w-0 truncate pb-1 text-muted">{note}</span>}
      </dd>
    </div>
  );
}

function Extreme({ order, label, entry }: { order: number; label: string; entry: Entry | undefined }) {
  const ratio = entry?.mean != null ? entry.mean / LIMIT : null;
  return (
    <Stat
      order={order}
      label={`${label}, × guideline`}
      figure={ratio != null ? times(ratio) : "--"}
      note={entry?.city.name}
      color={ratio != null ? tone(ratio) : undefined}
    />
  );
}

// every city at a glance, in a fixed order; the ranking below carries the same figures for keyboards and screen readers
function Board({ entries, active, onActive }: { entries: Entry[]; active: string | null; onActive: (slug: string | null) => void }) {
  return (
    <div aria-hidden className="unfold mt-3 grid grid-cols-5 gap-1 sm:grid-cols-10 xl:grid-cols-20" style={{ "--d": 4 } as CSSProperties}>
      {entries.map(({ city, pending, error, mean }) => {
        const ratio = mean != null ? mean / LIMIT : null;
        return (
          <Link
            key={city.slug}
            href={`/city/${city.slug}`}
            tabIndex={-1}
            data-tip={city.name}
            data-on={active === city.slug}
            data-state={pending ? "pending" : error != null ? "failed" : "ok"}
            onMouseEnter={() => onActive(city.slug)}
            onMouseLeave={() => onActive(null)}
            className="tile"
            style={{ "--c": tone(ratio) } as CSSProperties}
          >
            <span className="num text-base leading-none">{city.code}</span>
            <span className="num text-xs leading-none text-muted">{pending ? "···" : ratio != null ? times(ratio) : "n/a"}</span>
          </Link>
        );
      })}
    </div>
  );
}

function Row({
  entry,
  index,
  rank,
  top,
  lit,
  onActive,
}: {
  entry: Entry;
  index: number;
  rank: number | null;
  top: number;
  lit: boolean;
  onActive: (slug: string | null) => void;
}) {
  const { city, pending, error, mean, trend } = entry;
  const ratio = mean != null ? mean / LIMIT : null;
  return (
    <li
      data-lit={lit}
      onMouseEnter={() => onActive(city.slug)}
      onMouseLeave={() => onActive(null)}
      onFocus={() => onActive(city.slug)}
      onBlur={() => onActive(null)}
      className={`${COLS} relative min-h-[4.75rem] py-3`}
      style={{ "--i": index } as CSSProperties}
    >
      <span className="rank num text-sm text-muted">{rank != null ? String(rank).padStart(2, "0") : ""}</span>
      <span className="min-w-0">
        <Link href={`/city/${city.slug}`} data-row className="city-name text-lg leading-tight after:absolute after:inset-0 sm:text-xl">
          <Flap text={city.name} delay={index * 30} />
        </Link>
        <span className="label mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-muted">
          <span>
            {city.code} · {city.country}
          </span>
          {ratio != null && <Band ratio={ratio} />}
        </span>
      </span>

      {pending && (
        <>
          <span className="skeleton h-6 max-sm:hidden" />
          <span className="skeleton h-10 w-20 justify-self-end sm:w-32" />
          <span className="sr-only">Loading</span>
        </>
      )}

      {!pending && error != null && <Failure error={error} onRetry={entry.retry} className="max-sm:col-span-2 max-sm:col-start-2 sm:col-span-2" />}

      {!pending && error == null && (
        <>
          <span className="max-sm:hidden">
            <Sparkline values={trend} guideline={LIMIT} color={tone(ratio)} />
          </span>
          {ratio != null ? (
            <span className="flex flex-col-reverse items-end gap-x-3 gap-y-1.5 sm:flex-row sm:items-baseline sm:justify-end">
              <span className="num whitespace-nowrap text-xs text-muted">
                {fmt(mean)} {UNIT}
              </span>
              <span className="big text-5xl sm:text-6xl" style={{ color: tone(ratio) }}>
                <Flap text={times(ratio)} delay={200 + index * 30} />
              </span>
            </span>
          ) : (
            <span className="text-right text-sm text-muted">Not enough hours</span>
          )}
        </>
      )}

      {/* the rule under a row is its bar: filled to the city's level, with a tick where the guideline sits */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-line">
        {ratio != null && <span className="fill absolute bottom-0 left-0 h-0.5" style={{ width: `${(ratio / top) * 100}%`, background: tone(ratio) }} />}
        <span className="absolute -top-1 h-2 w-px bg-muted" style={{ left: `${100 / top}%` }} />
      </span>
    </li>
  );
}
