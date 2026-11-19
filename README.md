# Harmattan

Air quality across African cities, hour by hour. Named after the dry, dusty wind that crosses West Africa each year.

**Status:** in progress. The project is scaffolded with its checks in place; the screens are being built.

## Data

Air quality figures come from [Open-Meteo](https://open-meteo.com/) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). They are modelled estimates, not readings from sensors on the ground. Open-Meteo's free API is for non-commercial use.

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query and Zustand, tested with Jest and Playwright.

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
