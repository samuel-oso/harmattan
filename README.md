# Harmattan

Air quality across African cities, hour by hour. Named after the dry, dusty wind that crosses West Africa each year.

**Status:** built and tested; deployment to Vercel is next. Setting `launched` to `false` in `lib/site.ts` tells search engines to stay away.

## Screens

- **Overview** ranks 20 cities by fine particles (PM2.5) over the last 24 hours, against the WHO guideline, beside a map of Africa with each city marked by its level, range rings around the city in hand and the wind there on a compass tape.
- **City** charts any of seven pollutants over 24 hours to 90 days, with a weekday-by-hour heatmap and a daily table.
- **Compare** puts up to four cities on one chart.
- **Data** lists every hourly reading in a virtualised table that can be sorted, filtered and downloaded as CSV.

Each city is its own request, so one can fail and be retried without taking the others down. Timeouts and server errors are retried up to three times with a growing delay; rejected requests are not.

## Data

Air quality figures come from [Open-Meteo](https://open-meteo.com/) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). They are modelled estimates on a grid of about 45 km, not readings from sensors on the ground. Guideline values are from the WHO global air quality guidelines (2021); the bands shown are multiples of those values chosen for this dashboard, not an official index. Open-Meteo's free API is for non-commercial use.

The wind is Open-Meteo's current 10 m wind on a coarse grid, blended between grid points. The map's coastlines and borders are from [Natural Earth](https://www.naturalearthdata.com/) (public domain); `node scripts/map.mjs` rebuilds the map.

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, Zustand, Recharts, TanStack Virtual and Lenis, tested with Jest, Playwright and axe.

The site's address, for the sitemap and for links shared elsewhere, is taken from Vercel at build time. Set `NEXT_PUBLIC_SITE_URL` to use a custom domain or another host.

The title face is [Black Ops One](https://fonts.google.com/specimen/Black+Ops+One) (SIL Open Font License); a copy sits in `assets/` for the image shown when a link is shared.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run lint` | Lint |
| `npm run typecheck` | Generate route types and type-check |
| `npm test` | Unit tests (Jest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against a production build on port 4310 |
| `npm run build` | Production build |

Every push and pull request runs lint, types, unit tests and end-to-end tests in GitHub Actions.
