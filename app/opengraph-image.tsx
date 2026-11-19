import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { CITIES } from "@/lib/cities";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const stencil = await readFile(join(process.cwd(), "assets/BlackOpsOne-Regular.ttf"));

const BG = "#10120c";
const INK = "#dcd7bd";
const MUTED = "#9b977b";
const AMBER = "#f0a818";
const countries = new Set(CITIES.map((c) => c.country)).size;
const [lead, rest] = site.tagline.split(", ");

// the card shown when a link to the site is shared: the briefing cover, drawn at build time
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: INK, fontFamily: "Stencil" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0", background: "#4d5527", color: "#e6e1c8", fontSize: 22, letterSpacing: 4 }}>
          UNCLASSIFIED // OPEN DATA // CC BY 4.0
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", padding: "0 80px" }}>
          <div style={{ display: "flex", alignItems: "center", color: MUTED, fontSize: 26, letterSpacing: 5 }}>
            <div style={{ width: 14, height: 14, background: AMBER, marginRight: 18 }} />
            AIR QUALITY BRIEFING
          </div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 150, lineHeight: 1 }}>{site.name.toUpperCase()}</div>
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 26, fontSize: 46, lineHeight: 1.15 }}>
            <span style={{ marginRight: 16 }}>{`${lead.toUpperCase()},`}</span>
            <span style={{ color: AMBER }}>{rest.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", marginTop: 34, color: MUTED, fontSize: 22, letterSpacing: 2 }}>
            {`${CITIES.length} CITIES // ${countries} COUNTRIES // PM2.5 AGAINST THE WHO GUIDELINE`}
          </div>
        </div>
        <div style={{ display: "flex", height: 22, backgroundImage: `repeating-linear-gradient(-45deg, ${AMBER} 0 16px, ${BG} 16px 32px)` }} />
      </div>
    ),
    { ...size, fonts: [{ name: "Stencil", data: stencil, style: "normal", weight: 400 }] },
  );
}
