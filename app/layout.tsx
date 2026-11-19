import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Black_Ops_One, Quantico, Share_Tech_Mono, Teko } from "next/font/google";
import { Boot } from "@/components/boot";
import { NavLinks } from "@/components/nav";
import { Sight } from "@/components/sight";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SoundToggle } from "@/components/sound-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Zulu } from "@/components/zulu";
import { restore } from "@/lib/restore";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/url";
import { Providers } from "./providers";
import "./globals.css";

// each face falls back to a stand-in from globals.css, sized to the text this site sets in it
const stencil = Black_Ops_One({ variable: "--font-stencil", subsets: ["latin"], weight: "400", adjustFontFallback: false, fallback: ["Stand-in Stencil"] });
const quantico = Quantico({ variable: "--font-quantico", subsets: ["latin"], weight: ["400", "700"], adjustFontFallback: false, fallback: ["Stand-in Text"] });
const teko = Teko({ variable: "--font-teko", subsets: ["latin"], weight: "600", adjustFontFallback: false, fallback: ["Stand-in Figures"] });
const tech = Share_Tech_Mono({ variable: "--font-tech", subsets: ["latin"], weight: "400", adjustFontFallback: false, fallback: ["Stand-in Mono"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  alternates: { canonical: "./" },
  openGraph: { type: "website", siteName: site.name, locale: "en_GB", url: "./" },
  twitter: { card: "summary_large_image" },
  robots: site.launched ? undefined : { index: false, follow: false },
};

// the colour of the marking across the top, which is the same in either theme
export const viewport: Viewport = { themeColor: "#4d5527" };

const SHELL = "mx-auto w-full max-w-[88rem] px-4 sm:px-8";
const MARKING = "Unclassified // Open data // CC BY 4.0";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${stencil.variable} ${quantico.variable} ${teko.variable} ${tech.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: restore }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-bg">
          Skip to content
        </a>
        <Boot />
        <SmoothScroll />
        <Sight />
        <p aria-hidden className="banner label py-1 text-center">
          {MARKING}
        </p>
        <header className="site-header sticky top-0 z-40 border-b border-line">
          <nav aria-label="Main" className={`${SHELL} flex h-14 items-center justify-between gap-2`}>
            <Link href="/" className="stencil text-lg leading-none sm:text-2xl">
              {site.name}
            </Link>
            <div className="flex items-center sm:gap-4">
              <Zulu />
              <Suspense>
                <NavLinks />
              </Suspense>
              <div className="flex items-center">
                <SoundToggle />
                <ThemeToggle />
              </div>
            </div>
          </nav>
          <div aria-hidden className="hazard h-1 opacity-80" />
        </header>
        <Providers>
          <main id="main" className={`${SHELL} flex-1 py-8 sm:py-12`}>
            {children}
          </main>
        </Providers>
        <footer className="mt-10 overflow-hidden border-t border-line">
          <div className={`${SHELL} grid gap-x-12 gap-y-4 py-8 text-sm leading-relaxed text-muted md:grid-cols-2`}>
            <p>
              Figures are modelled estimates on a grid of about 45 km, not readings from sensors on the ground. They describe the wider
              area around a city, not a street. The bands are multiples of the guideline chosen for this dashboard, not an official
              index. Each city’s three-letter code is that of its main airport.
            </p>
            <p>
              Data by{" "}
              <a href="https://open-meteo.com/" className="text-ink underline underline-offset-4">
                Open-Meteo
              </a>{" "}
              (CC BY 4.0), from the Copernicus Atmosphere Monitoring Service. Guideline values are from the WHO global air quality
              guidelines, 2021.
            </p>
          </div>
          <p aria-hidden className={`${SHELL} outline-type`}>
            {site.name}
          </p>
          <p aria-hidden className="banner label mt-6 py-1 text-center">
            {MARKING}
          </p>
        </footer>
      </body>
    </html>
  );
}
