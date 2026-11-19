import { Suspense } from "react";
import { Headline } from "@/components/kinetic";
import { Overview } from "@/components/overview";
import { CITIES } from "@/lib/cities";
import { UNIT, pollutant } from "@/lib/pollutants";
import { site } from "@/lib/site";

const [lead, rest] = site.tagline.split(", ");
const countries = new Set(CITIES.map((c) => c.country)).size;

const BRIEF = [
  ["Area", `Africa: ${CITIES.length} cities in ${countries} countries`],
  ["Element", "Fine particles (PM2.5), 24-hour mean"],
  ["Reference", `WHO guideline, ${pollutant("pm2_5").guideline} ${UNIT}`],
  ["Source", "Open-Meteo, from the CAMS model, about 45 km grid"],
  ["Wind", "10 m above ground, at each city"],
];

export default function Home() {
  return (
    <>
      <header className="mb-8 grid items-end gap-x-12 gap-y-8 sm:mb-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div>
          <p className="typed label mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted sm:mb-6">
            <span aria-hidden className="live-dot size-1.5 bg-accent" />
            <span>Weather briefing</span>
            <span aria-hidden>{"//"}</span>
            <span>Air quality</span>
            <span aria-hidden>{"//"}</span>
            <span>Hourly</span>
          </p>
          <Headline text={`${lead},`} alt={rest} />
          <p className="enter mt-5 max-w-xl leading-relaxed text-muted sm:mt-7 sm:text-lg">
            Twenty cities, ranked by the fine particles in their air and measured against the World Health Organization’s guideline.
            Named for the dry-season wind that carries Saharan dust across West Africa.
          </p>
        </div>

        <section aria-label="Briefing" className="unfold corners border border-line bg-surface">
          <p className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="stencil text-lg">Briefing</span>
            <span aria-hidden className="hazard h-3 w-16" />
          </p>
          <dl className="px-4 py-1">
            {BRIEF.map(([name, value]) => (
              <div key={name} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 border-b border-line py-2 last:border-b-0">
                <dt className="label pt-0.5 text-muted">{name}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </header>
      <Suspense>
        <Overview />
      </Suspense>
    </>
  );
}
