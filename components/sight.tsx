"use client";

import { useEffect, useRef } from "react";

const TARGETS = 'a[href], button:not(:disabled), input:not(:disabled), label, summary, [role="option"]';

// the pointer. with a mouse, the arrow gives way to a sight that closes in on anything that can be used;
// whatever carries a data-tip gets a readout beside it, in place of the browser's own tooltip
export function Sight() {
  const ref = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const readout = tip.current;
    if (!el || !readout || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const root = document.documentElement;
    // with motion turned down the arrow stays, and only the readout is used
    const arrow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      el.dataset.flip = String(event.clientX > window.innerWidth - 240);
      el.dataset.shown = "true";
      if (!arrow) root.dataset.sight = "";
    };
    const over = (event: PointerEvent) => {
      const at = event.target instanceof Element ? event.target : null;
      el.dataset.on = String(at?.closest(TARGETS) != null);
      const text = at?.closest<HTMLElement>("[data-tip]")?.dataset.tip ?? "";
      readout.textContent = text;
      readout.hidden = text === "";
    };
    const down = () => {
      el.dataset.down = "true";
    };
    const up = () => {
      el.dataset.down = "false";
    };
    const leave = () => {
      el.dataset.shown = "false";
      delete root.dataset.sight;
    };

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointerup", up, { passive: true });
    root.addEventListener("pointerleave", leave);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      root.removeEventListener("pointerleave", leave);
      leave();
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="sight">
      <svg width="34" height="34" viewBox="-17 -17 34 34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
        <path className="sight-arms" d="M0-14V-6M0 6V14M-14 0H-6M6 0H14" />
        <rect x="-1" y="-1" width="2" height="2" fill="currentColor" stroke="none" />
      </svg>
      <span ref={tip} hidden className="sight-tip num" />
    </div>
  );
}
