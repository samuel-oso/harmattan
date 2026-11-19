"use client";

import dynamic from "next/dynamic";

// the chart library is the heaviest thing in the app, so it loads only where a chart is drawn
export const Chart = dynamic(() => import("./time-chart"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

type Item = { id: string; label: string; color: string; dash?: string };

export function Swatch({ color, dash }: { color: string; dash?: string }) {
  return (
    <svg width="22" height="6" aria-hidden className="shrink-0">
      <line x1="0" x2="22" y1="3" y2="3" stroke={color} strokeWidth="2.5" strokeDasharray={dash} />
    </svg>
  );
}

export function Legend({ items, guideline }: { items: Item[]; guideline?: string }) {
  const all = guideline ? [...items, { id: "guideline", label: guideline, color: "var(--ink)", dash: "5 5" }] : items;
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
      {all.map((item) => (
        <li key={item.id} className="flex items-center gap-2">
          <Swatch color={item.color} dash={item.dash} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
