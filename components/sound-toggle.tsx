"use client";

import { useEffect, useSyncExternalStore } from "react";
import { sound } from "@/lib/sound";

const CONTROLS = 'a, button, input, summary, [role="option"]';
const control = (event: Event) => (event.target instanceof Element ? event.target.closest(CONTROLS) : null);

export function SoundToggle() {
  const on = useSyncExternalStore(sound.subscribe, sound.enabled, () => true);

  // one set of listeners for the whole site: a tick on arriving at a control, a tone on using it
  useEffect(() => {
    let last: Element | null = null;
    const arrive = (event: Event) => {
      const at = control(event);
      if (at && at !== last) sound.play("tick");
      last = at;
    };
    const use = (event: Event) => {
      if (control(event)) sound.play("select");
    };
    document.addEventListener("pointerover", arrive);
    document.addEventListener("focusin", arrive);
    document.addEventListener("click", use);
    document.addEventListener("pointerdown", sound.unlock);
    document.addEventListener("keydown", sound.unlock);
    return () => {
      document.removeEventListener("pointerover", arrive);
      document.removeEventListener("focusin", arrive);
      document.removeEventListener("click", use);
      document.removeEventListener("pointerdown", sound.unlock);
      document.removeEventListener("keydown", sound.unlock);
    };
  }, []);

  const toggle = () => {
    sound.set(!on);
    sound.unlock();
    sound.play("switch");
  };

  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label="Sound" className="grid size-8 place-items-center text-muted hover:text-ink aria-pressed:text-ink sm:size-9">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden>
        <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
        {on ? <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
      </svg>
    </button>
  );
}
