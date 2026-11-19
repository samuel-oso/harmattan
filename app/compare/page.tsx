import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/components/compare-view";

export const metadata: Metadata = {
  title: "Compare cities",
  description: "Put up to four African cities on one chart and compare their air, pollutant by pollutant.",
};

export default function ComparePage() {
  return (
    <>
      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Compare cities</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">Put up to four cities on one chart and see how their air differs, pollutant by pollutant.</p>
      </header>
      <Suspense>
        <CompareView />
      </Suspense>
    </>
  );
}
