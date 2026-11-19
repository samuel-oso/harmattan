"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { sound } from "@/lib/sound";

type Option<T extends string> = { key: T; label: string; hint?: string };

// a drop-down list drawn like the rest of the briefing, and worked from the keyboard the way a native one is:
// arrows, Home and End move, Enter or Space choose, Escape closes, and typing jumps to a name
export function Select<T extends string>({
  label,
  bare,
  options,
  value,
  onChange,
  className = "",
}: {
  label: string;
  bare?: boolean;
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const chosen = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);

  const show = (at = chosen) => {
    setActive(at);
    setOpen(true);
  };
  const pick = (at: number) => {
    setOpen(false);
    if (options[at].key !== value) onChange(options[at].key);
  };
  const go = (at: number) => {
    const next = Math.min(Math.max(at, 0), options.length - 1);
    if (next !== active) sound.play("tick");
    setActive(next);
  };

  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const { key } = event;
    if (key === "Tab") {
      if (open) pick(active);
      return;
    }
    if (key === "Escape") {
      if (open) setOpen(false);
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (!open) return show();
      sound.play("select");
      return pick(active);
    }
    if (key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End") {
      event.preventDefault();
      if (!open) return show();
      return go(key === "Home" ? 0 : key === "End" ? options.length - 1 : active + (key === "ArrowDown" ? 1 : -1));
    }
    if (key.length !== 1) return;
    const now = Date.now();
    const text = (now - typed.current.at < 600 ? typed.current.text : "") + key.toLowerCase();
    typed.current = { text, at: now };
    const match = options.findIndex((o) => o.label.toLowerCase().startsWith(text));
    if (match === -1) return;
    if (open) go(match);
    else show(match);
  };

  const naming = bare ? { "aria-label": label } : { "aria-labelledby": `${id}-label` };

  return (
    <div className={`relative flex flex-col gap-2 ${className}`} onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}>
      {!bare && (
        <span id={`${id}-label`} className="label text-muted">
          {label}
        </span>
      )}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        {...naming}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={keyDown}
        // a button is also pressed by the space bar coming up, which would undo what the key going down just did
        onKeyUp={(event) => event.key === " " && event.preventDefault()}
        className="label flex h-10 w-full items-center justify-between gap-3 border border-line bg-sunk px-3 text-left text-ink hover:border-accent aria-expanded:border-accent"
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate">{options[chosen].label}</span>
          {options[chosen].hint && <span className="num text-xs normal-case tracking-normal text-muted">{options[chosen].hint}</span>}
        </span>
        <svg aria-hidden viewBox="0 0 10 6" width="10" height="6" className={`shrink-0 text-accent ${open ? "rotate-180" : ""}`}>
          <path d="M0 0h10L5 6z" fill="currentColor" />
        </svg>
      </button>
      <ul
        ref={list}
        id={`${id}-list`}
        role="listbox"
        tabIndex={-1}
        hidden={!open}
        data-lenis-prevent
        {...naming}
        className="absolute left-0 top-full z-30 mt-1 max-h-72 min-w-full overflow-auto border border-accent bg-surface py-1 shadow-[0_14px_30px_rgba(0,0,0,0.45)] motion-safe:animate-[unfold_0.16s_steps(5,end)]"
      >
        {options.map((o, i) => (
          <li
            key={o.key}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === chosen}
            data-active={open && i === active}
            // keeps the keyboard's place on the button, so the list does not close before the click lands
            onMouseDown={(event) => event.preventDefault()}
            onPointerMove={() => i !== active && setActive(i)}
            onClick={() => pick(i)}
            className="label flex items-center gap-3 whitespace-nowrap px-3 py-2 text-muted data-[active=true]:bg-sunk data-[active=true]:text-ink data-[active=true]:shadow-[inset_3px_0_0_var(--accent)]"
          >
            <span aria-hidden className={`size-2 shrink-0 border ${i === chosen ? "border-accent bg-accent" : "border-muted"}`} />
            <span>{o.label}</span>
            {o.hint && <span className="num ml-auto pl-4 text-xs normal-case tracking-normal">{o.hint}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
