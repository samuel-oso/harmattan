import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { NavLinks } from "@/components/nav";
import { site } from "@/lib/site";
import { Providers } from "./providers";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  robots: site.launched ? undefined : { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <header className="border-b border-line">
          <nav aria-label="Main" className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              {site.name}
            </Link>
            <Suspense>
              <NavLinks />
            </Suspense>
          </nav>
        </header>
        <Providers>
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </main>
        </Providers>
        <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm leading-relaxed text-muted sm:px-6">
            <p>
              Figures are modelled estimates on a grid of about 45 km, not readings from sensors on the ground. They describe the wider
              area around a city, not a street. The bands are multiples of the guideline chosen for this dashboard, not an official
              index.
            </p>
            <p>
              Data by{" "}
              <a href="https://open-meteo.com/" className="underline underline-offset-4 hover:text-ink">
                Open-Meteo
              </a>{" "}
              (CC BY 4.0), from the Copernicus Atmosphere Monitoring Service. Guideline values are from the WHO global air quality
              guidelines, 2021.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
