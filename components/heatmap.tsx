import { UNIT, fmt } from "@/lib/pollutants";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

// a real table, so the pattern can be read cell by cell as well as seen
export function Heatmap({ grid, label }: { grid: (number | null)[][]; label: string }) {
  const flat = grid.flat().filter((v): v is number => v != null);
  if (!flat.length) return null;
  const low = Math.min(...flat);
  const high = Math.max(...flat);
  const share = (v: number) => (high > low ? (v - low) / (high - low) : 0.5);

  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-[2px]">
        <caption className="sr-only">
          Mean {label} in {UNIT} for each weekday and hour of the day
        </caption>
        <thead>
          <tr>
            <td className="w-9" />
            {HOURS.map((h) => (
              <th key={h} scope="col" className="num pb-1 text-left text-[0.6875rem] font-normal text-muted">
                <span className={h % 6 === 0 ? "" : "sr-only"}>{String(h).padStart(2, "0")}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, d) => (
            <tr key={d}>
              <th scope="row" className="pr-2 text-left text-xs font-normal text-muted">
                <span aria-hidden>{DAYS[d].slice(0, 3)}</span>
                <span className="sr-only">{DAYS[d]}</span>
              </th>
              {row.map((v, h) => (
                <td
                  key={h}
                  title={v != null ? `${DAYS[d]} ${String(h).padStart(2, "0")}:00, ${fmt(v)} ${UNIT}` : undefined}
                  className="h-6 rounded-[3px] sm:h-7"
                  style={{ background: v != null ? `color-mix(in srgb, var(--accent) ${Math.round(8 + share(v) * 92)}%, var(--sunk))` : "transparent" }}
                >
                  <span className="sr-only">{v != null ? fmt(v) : "no data"}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span className="num">{fmt(low)}</span>
        <span aria-hidden className="h-2 w-28 rounded-full" style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--accent) 8%, var(--sunk)), var(--accent))" }} />
        <span className="num">
          {fmt(high)} {UNIT}
        </span>
      </p>
    </div>
  );
}
