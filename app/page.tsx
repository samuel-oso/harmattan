import { Suspense } from "react";
import { Overview } from "@/components/overview";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <>
      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{site.tagline}</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">
          Twenty cities, ranked by the fine particles in their air and measured against the World Health Organization’s guideline. Named
          for the dry-season wind that carries Saharan dust across West Africa.
        </p>
      </header>
      <Suspense>
        <Overview />
      </Suspense>
    </>
  );
}
