import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { CityFile } from "@/components/city-file";
import { CityView } from "@/components/city-view";
import { Flap } from "@/components/flap";
import { CITIES, cityBySlug } from "@/lib/cities";

export function generateStaticParams() {
  return CITIES.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: PageProps<"/city/[slug]">): Promise<Metadata> {
  const city = cityBySlug((await params).slug);
  if (!city) return { title: "City not found" };
  return {
    title: `${city.name}, ${city.country}`,
    description: `Hour-by-hour air quality for ${city.name}: fine particles, dust, ozone and more, against the WHO guidelines.`,
  };
}

async function City({ params }: { params: PageProps<"/city/[slug]">["params"] }) {
  const city = cityBySlug((await params).slug);
  if (!city) notFound();
  const at = CITIES.indexOf(city);
  const turn = [
    { label: "Previous city", city: CITIES[(at + CITIES.length - 1) % CITIES.length], align: "" },
    { label: "Next city", city: CITIES[(at + 1) % CITIES.length], align: "items-end text-right" },
  ];
  return (
    <>
      <header className="mb-8 grid items-end gap-x-12 gap-y-8 sm:mb-10 lg:grid-cols-[minmax(0,1fr)_27rem]">
        <div className="@container">
          <Link href="/" className="key label -ml-3 inline-block px-3 py-2 text-muted hover:text-ink">
            <span aria-hidden>‹ </span>All cities
          </Link>
          <p className="typed label mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
            <span aria-hidden className="live-dot size-1.5 bg-accent" />
            <span>City file</span>
            <span aria-hidden>{"//"}</span>
            <span>{city.code}</span>
            <span aria-hidden>{"//"}</span>
            <span>{city.country}</span>
          </p>
          <h1 className="city-title mt-3" style={{ "--n": city.name.length } as CSSProperties}>
            <Flap text={city.name} />
          </h1>
          <p className="enter mt-5 max-w-xl leading-relaxed text-muted sm:text-lg">
            Hour-by-hour air quality for {city.name}: fine particles, dust, ozone and more, against the WHO guidelines.
          </p>
        </div>
        <CityFile city={city} />
      </header>

      <CityView city={city} />

      <nav aria-label="Other cities" className="mt-14 grid grid-cols-2 gap-2 border-t border-line pt-6">
        {turn.map((t) => (
          <Link key={t.label} href={`/city/${t.city.slug}`} className={`turn flex flex-col gap-1.5 border border-line bg-surface px-4 py-3 ${t.align}`}>
            <span className="label text-muted">{t.label}</span>
            <span className="stencil text-lg leading-tight sm:text-2xl">{t.city.name}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function CityPage({ params }: PageProps<"/city/[slug]">) {
  return (
    <Suspense>
      <City params={params} />
    </Suspense>
  );
}
