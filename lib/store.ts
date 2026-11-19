import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CITIES } from "@/lib/cities";
import { POLLUTANT_KEYS, type PollutantKey } from "@/lib/pollutants";
import { RANGES, type RangeKey } from "@/lib/queries";

export const MAX_COMPARE = 4;

type View = {
  // false until the saved choices have been read, so nothing is fetched for a view about to change
  ready: boolean;
  pollutant: PollutantKey;
  range: RangeKey;
  compare: string[];
  setPollutant: (pollutant: PollutantKey) => void;
  setRange: (range: RangeKey) => void;
  toggleCompare: (slug: string) => void;
};

const DEFAULTS = { pollutant: "pm2_5" as PollutantKey, range: "7d" as RangeKey, compare: ["lagos", "accra", "nairobi"] };

// what comes back from storage is checked like any other input
function clean(saved: unknown): typeof DEFAULTS {
  const s = (typeof saved === "object" && saved !== null ? saved : {}) as Record<string, unknown>;
  const compare = Array.isArray(s.compare) ? s.compare.filter((slug) => CITIES.some((c) => c.slug === slug)).slice(0, MAX_COMPARE) : [];
  return {
    pollutant: POLLUTANT_KEYS.includes(s.pollutant as PollutantKey) ? (s.pollutant as PollutantKey) : DEFAULTS.pollutant,
    range: RANGES.some((r) => r.key === s.range) ? (s.range as RangeKey) : DEFAULTS.range,
    compare: compare.length ? compare : DEFAULTS.compare,
  };
}

export const useView = create<View>()(
  persist(
    (set) => ({
      ready: false,
      ...DEFAULTS,
      setPollutant: (pollutant) => set({ pollutant }),
      setRange: (range) => set({ range }),
      toggleCompare: (slug) =>
        set(({ compare }) => {
          if (compare.includes(slug)) return compare.length > 1 ? { compare: compare.filter((s) => s !== slug) } : {};
          return compare.length < MAX_COMPARE ? { compare: [...compare, slug] } : {};
        }),
    }),
    {
      name: "harmattan:view",
      version: 1,
      // read after the page has hydrated, so the first render always matches the server's
      skipHydration: true,
      partialize: ({ pollutant, range, compare }) => ({ pollutant, range, compare }),
      merge: (saved, current) => ({ ...current, ...clean(saved) }),
    },
  ),
);

// if storage is unavailable there is nothing to read, and the defaults stand
export async function restoreView() {
  try {
    await useView.persist?.rehydrate();
  } catch {
    useView.setState(DEFAULTS);
  }
  useView.setState({ ready: true });
}
