"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { City } from "@/lib/cities";
import { position } from "@/lib/format";
import { BOX, COLS, ROWS, project } from "@/lib/land";
import { BANDS, UNIT, band, fmt, times } from "@/lib/pollutants";
import { windQuery } from "@/lib/queries";
import { useView } from "@/lib/store";
import { KNOTS_PER_MS, bearing, describeWind, windAt } from "@/lib/wind";
import { Flap } from "@/components/flap";

export type Marker = { city: City; mean: number | null; ratio: number | null; pending: boolean; failed: boolean };

// the map is drawn ten units to a degree; public/theatre.svg, built by scripts/map.mjs, uses the same frame
const W = COLS * 10;
const H = ROWS * 10;
const KM_PER_UNIT = 11.12;
const RINGS = [500, 1000];

// where each city's code sits, as a step away from its marker in map units; set by hand so that no two collide
const STEP: Record<string, [number, number]> = {
  dakar: [16, -24],
  bamako: [6, -34],
  ouagadougou: [4, -40],
  niamey: [14, -56],
  kano: [26, -26],
  abuja: [30, 0],
  lagos: [18, 32],
  accra: [0, 44],
  abidjan: [-14, 30],
  kampala: [-18, -12],
  nairobi: [18, 10],
  "dar-es-salaam": [18, 8],
  luanda: [18, 10],
  "cape-town": [-18, -10],
};
const AWAY: [number, number] = [18, -12];

// the card for the city in hand sits over the Atlantic, where there is nothing to cover
const CARD = { left: 0.03, bottom: 0.03, width: 0.36, top: 0.7, low: 0.9 };

const LONS = [-10, 0, 10, 20, 30, 40];
const LATS = [30, 20, 10, 0, -10, -20, -30];
const pct = (fraction: number) => `${fraction * 100}%`;

export function WindMap({
  markers,
  active,
  onActive,
}: {
  markers: Marker[];
  // the city in hand: the one under the pointer, or failing that the worst one
  active: string | null;
  onActive: (slug: string | null) => void;
}) {
  const ready = useView((s) => s.ready);
  const wind = useQuery({ ...windQuery, enabled: ready });

  const target = markers.find((m) => m.city.slug === active);
  const at = target ? project(target.city.lon, target.city.lat) : null;
  const air = target && wind.data ? windAt(wind.data, target.city.lon, target.city.lat) : null;
  const from = air ? Math.round(bearing(air[0], air[1])) % 360 : null;
  // a circle on the ground is wider than it is tall on this map, more so away from the equator
  const stretch = target ? 1 / Math.cos((target.city.lat * Math.PI) / 180) : 1;
  const cardEdge = (CARD.left + CARD.width) * W;
  // the line from a city runs down, or up, until it is level with the card, then across to it
  const hook = at ? Math.min(Math.max(at.y, CARD.top), CARD.low) * H : 0;

  return (
    <figure className="wind-map corners">
      <div aria-hidden className="rule flex items-center gap-3 border-b px-3 py-1.5">
        <span className="label hud shrink-0">Wind from</span>
        <Tape bearing={from} />
        <span className="num w-[6.75rem] shrink-0 text-right text-xs">
          {air && from != null ? `${String(from).padStart(3, "0")}° / ${String(Math.round(Math.hypot(air[0], air[1]) * KNOTS_PER_MS)).padStart(2, "0")} KT` : "---° / -- KT"}
        </span>
      </div>

      <div className="theatre num relative w-full overflow-hidden" style={{ aspectRatio: `${COLS} / ${ROWS}` }}>
        {/* the ranking beside the map carries the same cities and figures for keyboards and screen readers */}
        <div aria-hidden className="absolute inset-0">
          {LONS.map((lon) => (
            <span key={lon} className="edge top-1" style={{ left: pct((lon - BOX.west) / COLS) }}>
              {Math.abs(lon)}°{lon < 0 ? "W" : lon > 0 ? "E" : ""}
            </span>
          ))}
          {LATS.map((lat) => (
            <span key={lat} className="edge right-1 -translate-y-full" style={{ top: pct((BOX.north - lat) / ROWS) }}>
              {lat === 0 ? "EQ" : `${Math.abs(lat)}°${lat > 0 ? "N" : "S"}`}
            </span>
          ))}
          <span className="place" style={{ left: pct(project(9, 23.5).x), top: pct(project(9, 23.5).y) }}>
            Sahara
          </span>

          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {markers.map(({ city }) => {
              const { x, y } = project(city.lon, city.lat);
              const [dx, dy] = STEP[city.slug] ?? AWAY;
              return <line key={city.slug} className="leader" x1={x * W} y1={y * H} x2={x * W + dx} y2={y * H + dy} />;
            })}
            {at && (
              <g key={active}>
                {RINGS.map((km, i) => (
                  <ellipse
                    key={km}
                    className="ring"
                    cx={at.x * W}
                    cy={at.y * H}
                    rx={(km / KM_PER_UNIT) * stretch}
                    ry={km / KM_PER_UNIT}
                    style={{ animationDelay: `${i * 90}ms` }}
                  />
                ))}
                <polyline
                  className="elbow"
                  points={`${at.x * W},${at.y * H} ${at.x * W},${hook} ${Math.min(at.x * W, cardEdge)},${hook}`}
                />
              </g>
            )}
          </svg>

          <span className="edge hud bottom-1 right-1">Rings {RINGS.join(" / ")} km</span>

          {markers.map((m, i) => (
            <Pin key={m.city.slug} marker={m} index={i} on={active === m.city.slug} onActive={onActive} />
          ))}

          {at && (
            <span className="td" style={{ left: pct(at.x), top: pct(at.y) }}>
              <span key={active} className="td-lock" />
            </span>
          )}

          {target && (
            <div className="callout" style={{ left: pct(CARD.left), bottom: pct(CARD.bottom), width: pct(CARD.width) }}>
              <p className="label hud">Station {target.city.code}</p>
              <p className="stencil mt-1 text-sm leading-tight sm:text-base">
                <Flap text={target.city.name} />
              </p>
              <p className="mt-1 hidden text-[0.6875rem] leading-tight text-[#dcd7bd]/75 sm:block">
                {position(target.city.lat, target.city.lon)}
              </p>
              {target.ratio != null ? (
                <>
                  <p className="big mt-2.5 text-4xl sm:text-5xl" style={{ color: `var(--band-${band(target.ratio)})` }}>
                    <Flap text={times(target.ratio)} />
                  </p>
                  <p className="mt-1.5 text-xs leading-tight">
                    {fmt(target.mean)} {UNIT}
                  </p>
                </>
              ) : (
                <p className="mt-2.5 text-xs leading-tight">{target.failed ? "Couldn’t load" : target.pending ? "Loading…" : "Not enough hours"}</p>
              )}
              {air && (
                <p className="mt-1 text-xs leading-tight text-[#dcd7bd]/85">
                  Wind from {describeWind(air[0], air[1]).from}, {Math.hypot(air[0], air[1]).toFixed(1)}&nbsp;m/s
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <figcaption className="rule label flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-3 py-2.5 text-[#dcd7bd]/80">
        <span className="flex items-center gap-2">
          <span className={`size-1.5 ${wind.isSuccess ? "live-dot bg-[#f0a818]" : "bg-white/40"}`} aria-hidden />
          {wind.isSuccess && "Wind right now, 10 m above ground"}
          {wind.isPending && "Reading the wind…"}
          {wind.isError && (
            <>
              The wind couldn’t be loaded.
              <button type="button" onClick={() => void wind.refetch()} className="label text-white underline underline-offset-4">
                Try again
              </button>
            </>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span className="sr-only">
            Each square is a city, coloured by its fine particles against the guideline. The ranking lists the same cities. The rings are 500 and 1,000
            km from the city in hand.
          </span>
          <span aria-hidden>PM2.5</span>
          <span className="flex items-center gap-1" aria-hidden>
            {BANDS.map((name, b) => (
              <span key={name} data-tip={name} className="size-2" style={{ background: `var(--band-${b})` }} />
            ))}
          </span>
          <span aria-hidden>higher</span>
        </span>
      </figcaption>
    </figure>
  );
}

const PX = 3;
const LEAD = 90;
const TICKS = Array.from({ length: (360 + LEAD * 2) / 10 + 1 }, (_, i) => i * 10 - LEAD);
const CARDINAL: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W" };

// a strip of compass bearings that slides until the one in question sits over the mark
function Tape({ bearing }: { bearing: number | null }) {
  return (
    <span className={`tape num min-w-0 flex-1 transition-opacity ${bearing == null ? "opacity-30" : ""}`}>
      <span className="tape-strip" style={{ transform: `translateX(${-((bearing ?? 0) + LEAD) * PX}px)` }}>
        {TICKS.map((deg) => {
          const shown = (deg + 360) % 360;
          const major = shown % 30 === 0;
          return (
            <span key={deg} className="tape-tick" data-major={major || undefined} style={{ left: (deg + LEAD) * PX }}>
              {major && <span>{CARDINAL[shown] ?? String(shown).padStart(3, "0")}</span>}
            </span>
          );
        })}
      </span>
      <span className="tape-mark" />
    </span>
  );
}

// a city on the map: a square in the colour of its band, and its code at the end of a short line
function Pin({ marker, index, on, onActive }: { marker: Marker; index: number; on: boolean; onActive: (slug: string | null) => void }) {
  const { city, ratio, pending, failed } = marker;
  const { x, y } = project(city.lon, city.lat);
  const [dx, dy] = STEP[city.slug] ?? AWAY;
  const color = ratio != null ? `var(--band-${band(ratio)})` : "rgba(220, 215, 189, 0.5)";

  return (
    <Link
      href={`/city/${city.slug}`}
      tabIndex={-1}
      data-on={on}
      onMouseEnter={() => onActive(city.slug)}
      onMouseLeave={() => onActive(null)}
      className="pin"
      style={{ color, animationDelay: `${0.6 + index * 0.04}s` }}
    >
      <span className="mark" style={{ left: pct(x), top: pct(y) }}>
        <span className={`${failed ? "border border-current" : "bg-current"} ${pending ? "opacity-50" : ""}`} />
      </span>
      <span className="code" data-side={dx < 0 ? "left" : "right"} style={{ left: pct(x + dx / W), top: pct(y + dy / H) }}>
        {city.code}
      </span>
    </Link>
  );
}
