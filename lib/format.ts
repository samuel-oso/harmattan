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

export const percent = (share: number) => `${Math.round(share * 100)}%`;
