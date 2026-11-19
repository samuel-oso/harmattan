"use client";

import { useEffect } from "react";

// the wheel eases the page along instead of stepping it. touch scrolling, and anyone who has turned motion down, are left alone
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let gone = false;
    let stop = () => {};
    import("lenis")
      .then(({ default: Lenis }) => {
        if (gone) return;
        const lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.14, stopInertiaOnNavigate: true });
        stop = () => lenis.destroy();
      })
      .catch((error: unknown) => console.warn("Smooth scrolling could not be started.", error));
    return () => {
      gone = true;
      stop();
    };
  }, []);

  return null;
}
