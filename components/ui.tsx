import { describe } from "@/lib/open-meteo";
import { BANDS, band } from "@/lib/pollutants";

// a band is always a dot and its name together, never the colour alone
export function Band({ ratio, className = "" }: { ratio: number; className?: string }) {
  const b = band(ratio);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span aria-hidden className="size-1.5 shrink-0 rotate-45" style={{ background: `var(--band-${b})` }} />
      {BANDS[b]}
    </span>
  );
}

type Option<T extends string> = { key: T; label: string };

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
          className="key label px-3 py-2 text-muted hover:text-ink"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Failure({ error, onRetry, className = "" }: { error: unknown; onRetry: () => void; className?: string }) {
  return (
    <p role="alert" className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${className}`}>
      <span>{describe(error)}</span>
      <button type="button" onClick={onRetry} className="relative z-10 font-medium underline underline-offset-4">
        Try again
      </button>
    </p>
  );
}

const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

export function Updated({ at, fetching }: { at: number; fetching: boolean }) {
  // the line keeps its size before there is a time to show, so nothing moves when the data lands
  return (
    <p className="label min-h-[1.35em] min-w-[8.4em] whitespace-nowrap text-right text-muted" aria-live="polite">
      {at ? (fetching ? "Updating…" : `Updated ${time.format(at)}`) : null}
    </p>
  );
}
