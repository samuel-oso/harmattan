import type { Metadata } from "next";
import { Suspense } from "react";
import { Headline } from "@/components/kinetic";
import { CompareView } from "@/components/compare-view";

export const metadata: Metadata = {
  title: "Compare cities",
  description: "Put up to four African cities on one chart and compare their air, pollutant by pollutant.",
};

export default function ComparePage() {
  return (
    <>
      <header className="mb-8 sm:mb-10">
        <p className="typed label mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted sm:mb-6">
          <span aria-hidden className="live-dot size-1.5 bg-accent" />
          <span>Side by side</span>
          <span aria-hidden>{"//"}</span>
          <span>Up to four cities</span>
          <span aria-hidden>{"//"}</span>
          <span>Times in UTC</span>
        </p>
        <Headline text="Compare cities" className="text-4xl sm:text-6xl lg:text-7xl" />
        <p className="enter mt-5 max-w-xl leading-relaxed text-muted sm:mt-7 sm:text-lg">
          Put up to four cities on one chart and see how their air differs, pollutant by pollutant.
        </p>
      </header>
      <Suspense>
        <CompareView />
      </Suspense>
    </>
  );
}
