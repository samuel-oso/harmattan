# Harmattan

Air quality across African cities, hour by hour. Named after the dry, dusty wind that crosses West Africa each year.

**Status:** in progress. The four screens work; a performance pass and deployment are still to come.

## Screens

- **Overview** ranks 20 cities by fine particles (PM2.5) over the last 24 hours, against the WHO guideline.
- **City** charts any of seven pollutants over 24 hours to 90 days, with a weekday-by-hour heatmap and a daily table.
- **Compare** puts up to four cities on one chart.
- **Data** lists every hourly reading in a virtualised table that can be sorted, filtered and downloaded as CSV.

Each city is its own request, so one can fail and be retried without taking the others down. Timeouts and server errors are retried up to three times with a growing delay; rejected requests are not.

## Data

Air quality figures come from [Open-Meteo](https://open-meteo.com/) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). They are modelled estimates on a grid of about 45 km, not readings from sensors on the ground. Guideline values are from the WHO global air quality guidelines (2021); the bands shown are multiples of those values chosen for this dashboard, not an official index. Open-Meteo's free API is for non-commercial use.

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, Zustand, Recharts and TanStack Virtual, tested with Jest, Playwright and axe.

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
