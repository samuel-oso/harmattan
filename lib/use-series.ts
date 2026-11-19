"use client";

import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Series } from "@/lib/open-meteo";
import type { City } from "@/lib/cities";
import { seriesQuery } from "@/lib/queries";
import { useView } from "@/lib/store";

export function useSeries(city: City, days: number) {
  const ready = useView((s) => s.ready);
  return useQuery({ ...seriesQuery(city, days), enabled: ready });
}

// one request per city, so each loads, fails and retries on its own
export function useAllSeries(cities: City[], days: number) {
  const ready = useView((s) => s.ready);
  return useQueries({ queries: cities.map((city) => ({ ...seriesQuery(city, days), enabled: ready })) });
}

const collect = (results: UseQueryResult<Series, Error>[]) => ({
  series: results.flatMap((r) => (r.data ? [r.data] : [])),
  pending: results.filter((r) => r.isPending).length,
  failures: results.flatMap((r, index) => (r.isError ? [{ index, error: r.error, retry: () => void r.refetch() }] : [])),
  fetching: results.some((r) => r.isFetching && !r.isPending),
  updatedAt: Math.max(0, ...results.map((r) => r.dataUpdatedAt)),
});

// every city's series as one list that only changes when a request does
export function useCollectedSeries(cities: City[], days: number) {
  const ready = useView((s) => s.ready);
  return useQueries({ queries: cities.map((city) => ({ ...seriesQuery(city, days), enabled: ready })), combine: collect });
}
