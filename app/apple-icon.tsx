import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const AMBER = "#f0a818";
const arm = { position: "absolute", background: AMBER } as const;

// the sight from the pointer, on the page colour
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#10120c" }}>
        <div style={{ ...arm, left: 82, top: 26, width: 16, height: 44 }} />
        <div style={{ ...arm, left: 82, top: 110, width: 16, height: 44 }} />
        <div style={{ ...arm, left: 26, top: 82, width: 44, height: 16 }} />
        <div style={{ ...arm, left: 110, top: 82, width: 44, height: 16 }} />
        <div style={{ ...arm, left: 80, top: 80, width: 20, height: 20 }} />
      </div>
    ),
    size,
  );
}
