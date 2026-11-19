"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { clock, dateTime, dayLabel } from "@/lib/format";
import { DAY } from "@/lib/open-meteo";
import { UNIT, fmt } from "@/lib/pollutants";
import { ticksFor, type Plot } from "@/lib/series";

export type ChartLine = { id: string; label: string; color: string; dash?: string; width?: number; opacity?: number };

type Props = {
  points: Plot[];
  lines: ChartLine[];
  guideline: number | null;
  // the time zone the axis and tooltip are written in
  tz: string;
};

export const GUIDE = { color: "var(--ink)", dash: "5 5" };

// the next round number that splits into four even steps, so the axis reads 0, 25, 50, 75, 100
function roundUp(max: number): number {
  if (!(max > 0)) return 1;
  const unit = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 4, 6, 8, 10].map((m) => m * unit).find((n) => n >= max) ?? 10 * unit;
}

type TipEntry = { dataKey?: unknown; value?: unknown };

function Tip({ active, payload, label, lines, tz }: { active?: boolean; payload?: readonly TipEntry[]; label?: unknown; lines: ChartLine[]; tz: string }) {
  if (!active || !payload?.length || typeof label !== "number") return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-muted">{dateTime(label, tz)}</p>
      {lines.map((line) => {
        const entry = payload.find((p) => p.dataKey === line.id);
        if (typeof entry?.value !== "number") return null;
        return (
          <p key={line.id} className="flex items-center gap-2">
            <svg width="16" height="6" aria-hidden>
              <line x1="0" x2="16" y1="3" y2="3" stroke={line.color} strokeWidth="2" strokeDasharray={line.dash} />
            </svg>
            <span>{line.label}</span>
            <span className="num ml-auto pl-3">
              {fmt(entry.value)} {UNIT}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export default function TimeChart({ points, lines, guideline, tz }: Props) {
  const from = points[0]?.t ?? 0;
  const to = points[points.length - 1]?.t ?? 0;
  const short = to - from <= 2 * DAY;
  const tick = { fontSize: 12, fill: "var(--muted)" };

  // the guideline joins the scale only when the readings come near it, so a clean pollutant is not flattened to make room
  const top = (max: number) => roundUp(guideline != null && max >= guideline * 0.5 ? Math.max(max, guideline * 1.15) : max);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          domain={[from, to]}
          ticks={ticksFor(from, to, tz)}
          tickFormatter={(t: number) => (short ? clock(t, tz) : dayLabel(t, tz))}
          tick={tick}
          tickLine={false}
          axisLine={{ stroke: "var(--line)" }}
          minTickGap={24}
        />
        <YAxis width={44} domain={[0, top]} tickCount={5} tickFormatter={(v: number) => Number(v.toPrecision(3)).toLocaleString("en-GB")} tick={tick} tickLine={false} axisLine={false} />
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--muted)", strokeDasharray: "2 4" }}
          content={(p) => <Tip active={p.active} payload={p.payload} label={p.label} lines={lines} tz={tz} />}
        />
        {guideline != null && (
          <ReferenceLine y={guideline} stroke={GUIDE.color} strokeDasharray={GUIDE.dash} />
        )}
        {lines.map((line) => (
          <Line
            key={line.id}
            dataKey={line.id}
            name={line.label}
            stroke={line.color}
            strokeWidth={line.width ?? 2}
            strokeOpacity={line.opacity ?? 1}
            strokeDasharray={line.dash}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
