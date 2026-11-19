import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CityView } from "@/components/city-view";
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
  return (
    <>
      <header className="mb-8">
        <Link href="/" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          <span aria-hidden>← </span>All cities
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{city.name}</h1>
        <p className="mt-1 text-lg text-muted">{city.country}</p>
      </header>
      <CityView city={city} />
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
