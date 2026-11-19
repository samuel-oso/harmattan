const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string, kind: "time" | "day" | "full"): Intl.DateTimeFormat {
  const id = `${tz}:${kind}`;
  let f = cache.get(id);
  if (!f) {
    const options: Intl.DateTimeFormatOptions =
      kind === "time"
        ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
        : kind === "day"
          ? { day: "numeric", month: "short" }
          : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
    f = new Intl.DateTimeFormat("en-GB", { ...options, timeZone: tz });
    cache.set(id, f);
  }
  return f;
}

export const clock = (t: number, tz: string) => formatter(tz, "time").format(t);
export const dayLabel = (t: number, tz: string) => formatter(tz, "day").format(t);
export const dateTime = (t: number, tz: string) => formatter(tz, "full").format(t);

// "2025-11-03" to "3 Nov"
export const isoDayLabel = (day: string) => dayLabel(Date.parse(`${day}T12:00:00Z`), "UTC");

const degrees = (value: number, width: number, plus: string, minus: string) => {
  const minutes = Math.round(Math.abs(value) * 60);
  return `${String(Math.floor(minutes / 60)).padStart(width, "0")}°${String(minutes % 60).padStart(2, "0")}′${value >= 0 ? plus : minus}`;
};

// degrees and minutes, the way a position is written on a chart: 12°00′N 008°31′E
export const position = (lat: number, lon: number) => `${degrees(lat, 2, "N", "S")} ${degrees(lon, 3, "E", "W")}`;

// "UTC+1": how far a time zone is from UTC right now
export function offset(t: number, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(t);
  return (parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC").replace("GMT", "UTC");
}

export const percent = (share: number) => `${Math.round(share * 100)}%`;
