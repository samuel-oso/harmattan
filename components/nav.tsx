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
    <ul className="flex items-center sm:gap-1">
      {LINKS.map(({ href, label }) => (
        <li key={href}>
          <Link href={href} aria-current={active(href) ? "page" : undefined} className="key label block px-1.5 py-2 text-muted hover:text-ink sm:px-3">
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
