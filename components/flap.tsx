"use client";

import { useEffect, useState } from "react";
import { LANDED, landed } from "@/lib/landing";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const STEP_MS = 45;
const pick = (from: string) => from[Math.floor(Math.random() * from.length)];

// one clock turns every flap on the screen, so that a screen full of them is redrawn once a step, not once each
const turning = new Set<() => void>();
let clock = 0;
function onStep(turn: () => void) {
  turning.add(turn);
  clock ||= window.setInterval(() => turning.forEach((each) => each()), STEP_MS);
  return () => {
    turning.delete(turn);
    if (turning.size > 0) return;
    window.clearInterval(clock);
    clock = 0;
  };
}

// text that turns over into place, one character after another, whenever it changes.
// what is read aloud is always the finished text
export function Flap({ text, plates, delay = 0, className = "" }: { text: string; plates?: boolean; delay?: number; className?: string }) {
  const [turning, setTurning] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const chars = [...text];
    const last = 4 + chars.length * 1.5;
    let step = 0;
    let stop = () => {};
    let start = 0;
    const turn = () => {
      step += 1;
      if (step >= last) {
        stop();
        setTurning(null);
        return;
      }
      setTurning(
        chars
          .map((ch, i) => {
            if (step >= 4 + i * 1.5) return ch;
            if (/[0-9]/.test(ch)) return pick(DIGITS);
            return /[a-z]/i.test(ch) ? pick(LETTERS) : ch;
          })
          .join(""),
      );
    };
    const begin = () => {
      start = window.setTimeout(() => {
        stop = onStep(turn);
      }, delay);
    };
    if (landed()) begin();
    else window.addEventListener(LANDED, begin, { once: true });
    return () => {
      window.removeEventListener(LANDED, begin);
      window.clearTimeout(start);
      stop();
    };
  }, [text, delay]);

  return (
    <span className={`flap ${className}`} data-plates={plates || undefined}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="flap-row">
        {[...(turning ?? text)].map((ch, i) => (
          <span key={`${i}${ch}`}>{ch === " " ? "\u00a0" : ch}</span>
        ))}
      </span>
    </span>
  );
}
