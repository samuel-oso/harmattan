"use client";

import { useEffect } from "react";
import { CITIES } from "@/lib/cities";
import { LANDED } from "@/lib/landing";
import { site } from "@/lib/site";

const countries = new Set(CITIES.map((c) => c.country)).size;

const LINES = [
  ["Stations", `${CITIES.length} cities, ${countries} countries`],
  ["Element", "PM2.5, 24-hour mean"],
  ["Reference", "WHO guideline, 2021"],
  ["Source", "Open-Meteo / CAMS"],
  ["Wind", "10 m above ground"],
];

// the screen lifts on its own, timed from before the page was painted; this is only the way to skip it
export function Boot() {
  useEffect(() => {
    const root = document.documentElement;
    if (!("boot" in root.dataset)) return;
    const end = () => {
      const held = root.dataset.boot === "";
      delete root.dataset.boot;
      if (held) window.dispatchEvent(new Event(LANDED));
    };
    // a key still held from the reload shortcut, or a modifier on its own, is not a wish to skip
    const skip = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || ["Meta", "Control", "Alt", "Shift"].includes(event.key)) return;
      end();
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", end);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", end);
    };
  }, []);

  return (
    <div className="boot" aria-hidden>
      <div className="w-full max-w-[34rem]">
        <p className="label mb-3 flex items-center gap-2 text-muted">
          <span className="live-dot size-1.5 bg-accent" />
          Air quality briefing
        </p>
        <p className="stencil boot-title">{site.name}</p>
        <ul className="label mt-6">
          {LINES.map(([name, value], i) => (
            <li key={name} style={{ "--i": i } as React.CSSProperties}>
              <span className="text-muted">{name}</span>
              <span>{value}</span>
            </li>
          ))}
        </ul>
        <div className="boot-bar mt-6 h-3 border border-line p-0.5">
          <span className="hazard" />
        </div>
        <p className="label mt-3 text-muted">Press any key to skip</p>
      </div>
    </div>
  );
}
