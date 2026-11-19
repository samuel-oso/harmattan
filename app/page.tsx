import { site } from "@/lib/site";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-widest opacity-60">In progress</p>
      <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">{site.name}</h1>
      <p className="text-lg leading-relaxed opacity-80">{site.tagline}</p>
      <p className="text-sm leading-relaxed opacity-60">
        The first screens are being built. Data will come from{" "}
        <a href="https://open-meteo.com/" className="underline underline-offset-4">
          Open-Meteo
        </a>
        , whose air quality figures are modelled estimates, not readings from sensors on the ground.
      </p>
    </main>
  );
}
