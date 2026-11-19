"use client";

import Link from "next/link";
import { CITIES, type City } from "@/lib/cities";
import type { Series } from "@/lib/open-meteo";
import { UNIT, band, fmt, pollutant, times } from "@/lib/pollutants";
import { lastMean, rolling, thin } from "@/lib/series";
import { useAllSeries } from "@/lib/use-series";
import { Band, Failure, Updated } from "@/components/ui";
import { Sparkline } from "@/components/sparkline";

const DAYS = 7;
const PM = pollutant("pm2_5");
const LIMIT = PM.guideline ?? 0;
const COLS = "grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[1.75rem_minmax(0,1fr)_9rem_6.5rem_11.5rem]";

type Entry = {
  city: City;
  pending: boolean;
  error: unknown;
  retry: () => void;
  mean: number | null;
  trend: (number | null)[];
};

function read(series: Series | undefined) {
  if (!series) return { mean: null, trend: [] };
  const means = rolling(series.values[PM.key], PM.window).slice(-DAYS * 24);
  return { mean: lastMean(series, PM.key, PM.window), trend: thin(means, 56) };
}

export function Overview() {
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
  const updatedAt = Math.max(0, ...queries.map((q) => q.dataUpdatedAt));
  const fetching = queries.some((q) => q.isFetching && !q.isPending);

  return (
    <section aria-labelledby="ranking">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="ranking" className="text-xl font-semibold tracking-tight">
            Fine particles, last 24 hours
          </h2>
          <p className="mt-1 min-h-12 max-w-2xl text-muted sm:min-h-6" aria-live="polite">
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

      <div className={`${COLS} mt-6 border-b border-line pb-2 text-xs uppercase tracking-wide text-muted`} aria-hidden>
        <span>#</span>
        <span>City</span>
        <span className="max-sm:hidden">7 days</span>
        <span className="text-right max-sm:hidden">24-hour mean</span>
        <span className="max-sm:text-right">Against guideline</span>
      </div>
      <ol>
        {ranked.map((e, i) => (
          <Row key={i} entry={e} rank={settled && e.mean != null ? i + 1 : null} />
        ))}
      </ol>
    </section>
  );
}

function Row({ entry, rank }: { entry: Entry; rank: number | null }) {
  const { city, pending, error, mean, trend } = entry;
  const ratio = mean != null ? mean / LIMIT : null;
  return (
    <li className={`${COLS} relative min-h-16 border-b border-line py-2.5 transition-colors hover:bg-sunk/60`}>
      <span className="num text-sm text-muted">{rank ?? ""}</span>
      <span className="min-w-0">
        <Link href={`/city/${city.slug}`} className="font-medium after:absolute after:inset-0">
          {city.name}
        </Link>
        <span className="block truncate text-sm text-muted">{city.country}</span>
      </span>

      {pending && (
        <>
          <span className="skeleton h-6 max-sm:hidden" />
          <span className="skeleton h-5 max-sm:hidden" />
          <span className="skeleton h-5 w-28 sm:w-auto" />
          <span className="sr-only">Loading</span>
        </>
      )}

      {!pending && error != null && <Failure error={error} onRetry={entry.retry} className="max-sm:col-span-3 max-sm:col-start-2 sm:col-span-3" />}

      {!pending && error == null && (
        <>
          <span className="max-sm:hidden">
            <Sparkline values={trend} guideline={LIMIT} color={ratio != null ? `var(--band-${band(ratio)})` : "var(--muted)"} />
          </span>
          <span className="num text-right max-sm:hidden">
            {fmt(mean)} <span className="text-xs text-muted">{UNIT}</span>
          </span>
          {ratio != null ? (
            <span className="text-sm max-sm:text-right">
              <span className="num block font-medium sm:inline sm:after:content-['_·_']">
                <span className="sm:hidden">{fmt(mean)} {UNIT}, </span>
                {times(ratio)}
              </span>
              <Band ratio={ratio} className="text-muted" />
            </span>
          ) : (
            <span className="text-sm text-muted">Not enough hours</span>
          )}
        </>
      )}
    </li>
  );
}
