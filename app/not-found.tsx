import Link from "next/link";
import { Headline } from "@/components/kinetic";

export default function NotFound() {
  return (
    <div className="py-10 sm:py-16">
      <p className="typed label mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted sm:mb-6">
        <span aria-hidden className="live-dot size-1.5 bg-accent" />
        <span>Error 404</span>
        <span aria-hidden>{"//"}</span>
        <span>No such file</span>
      </p>
      <Headline text="That page isn’t here." className="text-4xl sm:text-6xl lg:text-7xl" />
      <p className="enter mt-5 max-w-xl leading-relaxed text-muted sm:mt-7 sm:text-lg">
        The address may be mistyped, or the city isn’t one of the twenty covered.
      </p>
      <Link href="/" className="key label mt-8 inline-block border border-line px-4 py-3 text-ink hover:border-accent">
        <span aria-hidden>‹ </span>Back to all cities
      </Link>
    </div>
  );
}
