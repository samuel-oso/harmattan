"use client";

import { useLayoutEffect, useRef } from "react";
import { landed } from "@/lib/landing";

// false only while the first screen of a visit is being put together
let settled = false;

// a numbered heading, the way the parts of a briefing are numbered. it is drawn in the first time it is scrolled to
export function Head({ no, id, title, children }: { no: string; id: string; title: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function" || typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const first = !settled;
    queueMicrotask(() => {
      settled = true;
    });
    if (el.getBoundingClientRect().top < window.innerHeight) {
      // already on screen. it is drawn in with the rest of the screen, unless the visitor has been looking at it
      // for a while already, as on a slow phone where this runs late
      if (!first || !landed()) el.dataset.seen = "true";
      return;
    }
    el.dataset.seen = "false";
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.seen = "true";
        watch.disconnect();
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  return (
    <div ref={ref} className="head min-w-0 flex-1 basis-[28rem]">
      <p aria-hidden className="label flex items-center gap-3 text-accent">
        <span>{no}</span>
        <span className="head-rule h-px w-10 bg-accent" />
      </p>
      <h2 id={id} className="stencil mt-2 text-2xl sm:text-3xl">
        {title}
      </h2>
      {children && <p className="head-note mt-2 max-w-3xl text-muted">{children}</p>}
    </div>
  );
}
