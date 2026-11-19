import type { Metadata } from "next";
import { Suspense } from "react";
import { Headline } from "@/components/kinetic";
import { DataView } from "@/components/data-view";

export const metadata: Metadata = {
  title: "Data",
  description: "Every hourly reading behind the dashboard, to sort, filter and download as CSV.",
};

export default function DataPage() {
  return (
    <>
      <header className="mb-8 sm:mb-10">
        <p className="typed label mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted sm:mb-6">
          <span aria-hidden className="live-dot size-1.5 bg-accent" />
          <span>The log</span>
          <span aria-hidden>{"//"}</span>
          <span>Hour by hour</span>
          <span aria-hidden>{"//"}</span>
          <span>Times in UTC</span>
        </p>
        <Headline text="Data" className="text-4xl sm:text-6xl lg:text-7xl" />
        <p className="enter mt-5 max-w-xl leading-relaxed text-muted sm:mt-7 sm:text-lg">
          Every hourly reading behind the charts. Sort it, filter it, or take it away as a CSV file.
        </p>
      </header>
      <Suspense>
        <DataView />
      </Suspense>
    </>
  );
}
