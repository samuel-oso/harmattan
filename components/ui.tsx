import { describe } from "@/lib/open-meteo";
import { BANDS, band } from "@/lib/pollutants";

// a band is always a dot and its name together, never the colour alone
export function Band({ ratio, className = "" }: { ratio: number; className?: string }) {
  const b = band(ratio);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: `var(--band-${b})` }} />
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
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-line bg-surface p-1 text-sm">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
          className="rounded-full px-3 py-1 text-muted transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-bg"
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
  if (!at) return null;
  return (
    <p className="text-sm text-muted" aria-live="polite">
      {fetching ? "Updating…" : `Updated ${time.format(at)}`}
    </p>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

export const selectClass = "h-9 rounded-md border border-line bg-surface px-2 text-sm text-ink";
