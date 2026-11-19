"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/compare", label: "Compare" },
  { href: "/data", label: "Data" },
];

export function NavLinks() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/city") : pathname.startsWith(href));
  return (
    <ul className="flex items-center gap-1 text-sm">
      {LINKS.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className="rounded-full px-3 py-1.5 text-muted transition-colors hover:text-ink aria-[current=page]:bg-sunk aria-[current=page]:text-ink"
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
