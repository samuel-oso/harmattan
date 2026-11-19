"use client";

import { useQuery } from "@tanstack/react-query";
import type { City } from "@/lib/cities";
import { clock, offset, position } from "@/lib/format";
import { COLS, ROWS, project } from "@/lib/land";
import { windQuery } from "@/lib/queries";
import { useView } from "@/lib/store";
import { useSeconds } from "@/lib/use-seconds";
import { describeWind, windAt } from "@/lib/wind";

const pct = (fraction: number) => `${fraction * 100}%`;

// what is fixed about a city, and the two things that are not: its clock and its wind
export function CityFile({ city }: { city: City }) {
  const ready = useView((s) => s.ready);
  const wind = useQuery({ ...windQuery, enabled: ready });
  const seconds = useSeconds();
  const at = project(city.lon, city.lat);
  const air = wind.data ? describeWind(...windAt(wind.data, city.lon, city.lat)) : null;

  const rows: [string, string][] = [
    ["Code", city.code],
    ["Position", position(city.lat, city.lon)],
    ["Local time", seconds ? `${clock(seconds * 1000, city.tz)} (${offset(seconds * 1000, city.tz)})` : "--:--"],
    ["Wind", air ? `From ${air.from}, ${air.speed.toFixed(1)} m/s` : wind.isError ? "Not available" : "Reading…"],
  ];

  return (
    <section aria-label="City file" className="unfold corners border border-line bg-surface">
      <p className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="stencil text-lg">City file</span>
        <span aria-hidden className="hazard h-3 w-16" />
      </p>
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] sm:grid-cols-[8.5rem_minmax(0,1fr)]">
        <div aria-hidden className="border-r border-line bg-[#0b0d08]">
          <div className="locator theatre relative overflow-hidden" style={{ aspectRatio: `${COLS} / ${ROWS}` }}>
            <span className="absolute inset-y-0 w-px" style={{ left: pct(at.x) }} />
            <span className="absolute inset-x-0 h-px" style={{ top: pct(at.y) }} />
            <i style={{ left: pct(at.x), top: pct(at.y) }} />
          </div>
        </div>
        <dl className="px-4 py-1">
          {rows.map(([name, value]) => (
            <div key={name} className="grid gap-x-3 border-b border-line py-1.5 last:border-b-0 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:py-2">
              <dt className="label pt-0.5 text-muted">{name}</dt>
              <dd className="num text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
