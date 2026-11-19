export type PollutantKey = "pm2_5" | "pm10" | "nitrogen_dioxide" | "ozone" | "sulphur_dioxide" | "carbon_monoxide" | "dust";

export type Pollutant = {
  key: PollutantKey;
  label: string;
  name: string;
  // WHO global air quality guidelines (2021), in µg/m³; dust has none
  guideline: number | null;
  // the hours the guideline is a mean over
  window: number;
};

export const UNIT = "µg/m³";

export const POLLUTANTS: Pollutant[] = [
  { key: "pm2_5", label: "PM2.5", name: "Fine particles", guideline: 15, window: 24 },
  { key: "pm10", label: "PM10", name: "Coarse particles", guideline: 45, window: 24 },
  { key: "nitrogen_dioxide", label: "NO₂", name: "Nitrogen dioxide", guideline: 25, window: 24 },
  { key: "ozone", label: "O₃", name: "Ozone", guideline: 100, window: 8 },
  { key: "sulphur_dioxide", label: "SO₂", name: "Sulphur dioxide", guideline: 40, window: 24 },
  { key: "carbon_monoxide", label: "CO", name: "Carbon monoxide", guideline: 4000, window: 24 },
  { key: "dust", label: "Dust", name: "Desert dust", guideline: null, window: 24 },
];

export const POLLUTANT_KEYS = POLLUTANTS.map((p) => p.key);
export const pollutant = (key: PollutantKey) => POLLUTANTS.find((p) => p.key === key) ?? POLLUTANTS[0];

// multiples of the guideline, chosen for this dashboard; they are not an official index
export const BANDS = ["Within guideline", "Above guideline", "2× guideline or more", "3× guideline or more", "5× guideline or more"] as const;

export function band(ratio: number): number {
  if (ratio <= 1) return 0;
  if (ratio < 2) return 1;
  if (ratio < 3) return 2;
  if (ratio < 5) return 3;
  return 4;
}

export function fmt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "–";
  if (Math.abs(value) < 10) return value.toFixed(1);
  return Math.round(value).toLocaleString("en-GB");
}

export function times(ratio: number): string {
  return `${ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}×`;
}
