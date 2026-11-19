import type { Metadata } from "next";
import { Suspense } from "react";
import { DataView } from "@/components/data-view";

export const metadata: Metadata = {
  title: "Data",
  description: "Every hourly reading behind the dashboard, to sort, filter and download as CSV.",
};

export default function DataPage() {
  return (
    <>
      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Data</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">Every hourly reading behind the charts. Sort it, filter it, or take it away as a CSV file.</p>
      </header>
      <Suspense>
        <DataView />
      </Suspense>
    </>
  );
}
