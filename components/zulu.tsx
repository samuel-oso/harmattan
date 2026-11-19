"use client";

import { useSeconds } from "@/lib/use-seconds";

// the time in UTC, written the way flight crews write it
export function Zulu() {
  const seconds = useSeconds();
  const clock = seconds ? new Date(seconds * 1000).toISOString().slice(11, 19) : "--:--:--";
  return (
    <p className="label hidden items-center gap-2 text-muted md:flex">
      <span>UTC</span>
      <span className="num text-ink">{clock}Z</span>
    </p>
  );
}
