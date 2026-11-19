// Builds public/theatre.svg: the map behind the stations, with coastlines and country borders.
// Source: Natural Earth 1:110m countries (public domain), https://www.naturalearthdata.com/
// Run: node scripts/map.mjs [path-to-countries.geojson]
import { readFile, writeFile } from "node:fs/promises";

const SOURCE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const BOX = { west: -20, east: 54, north: 39, south: -37 };
// ten map units to a degree, the same frame lib/land.ts uses
const UNIT = 10;
const W = (BOX.east - BOX.west) * UNIT;
const H = (BOX.north - BOX.south) * UNIT;
const KHAKI = "#dcd7bd";

async function load(path) {
  if (path) return JSON.parse(await readFile(path, "utf8"));
  const res = await fetch(SOURCE, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Natural Earth download failed: ${res.status}`);
  return res.json();
}

const inFrame = (ring) => {
  const lons = ring.map(([lon]) => lon);
  const lats = ring.map(([, lat]) => lat);
  return Math.max(...lons) > BOX.west && Math.min(...lons) < BOX.east && Math.max(...lats) > BOX.south && Math.min(...lats) < BOX.north;
};

function trace(ring) {
  const points = [];
  for (const [lon, lat] of ring) {
    const point = `${Math.round((lon - BOX.west) * UNIT)},${Math.round((BOX.north - lat) * UNIT)}`;
    if (points.at(-1) !== point) points.push(point);
  }
  return points.length > 3 ? `M${points.join("L")}Z` : "";
}

const world = await load(process.argv[2]);
const shapes = { africa: "", around: "" };
for (const feature of world.features) {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const key = feature.properties.CONTINENT === "Africa" ? "africa" : "around";
  for (const polygon of polygons) if (inFrame(polygon[0])) shapes[key] += polygon.map(trace).join("");
}

const hair = `fill="none" stroke="${KHAKI}" vector-effect="non-scaling-stroke"`;
let grid = "";
for (let lon = -10; lon < BOX.east; lon += 10) grid += `M${(lon - BOX.west) * UNIT},0V${H}`;
for (let lat = 30; lat > BOX.south; lat -= 10) grid += `M0,${(BOX.north - lat) * UNIT}H${W}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
<defs><path id="africa" d="${shapes.africa}"/></defs>
<rect width="${W}" height="${H}" fill="#0b0d08"/>
<path d="${shapes.around}" fill="#14170e" stroke="${KHAKI}" stroke-opacity=".18" stroke-width=".8" vector-effect="non-scaling-stroke"/>
<use href="#africa" ${hair} stroke-opacity=".7" stroke-width="2.6" stroke-linejoin="round"/>
<use href="#africa" fill="#20251a" stroke="${KHAKI}" stroke-opacity=".26" stroke-width=".8" vector-effect="non-scaling-stroke"/>
<path d="${grid}" ${hair} stroke-opacity=".08" stroke-width="1"/>
<path d="M0,${BOX.north * UNIT}H${W}" ${hair} stroke-opacity=".2" stroke-width="1" stroke-dasharray="6 6"/>
</svg>
`;
await writeFile(new URL("../public/theatre.svg", import.meta.url), svg);
console.log(`public/theatre.svg: ${(svg.length / 1024).toFixed(1)} kB`);
