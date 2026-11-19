import type { Values } from "@/lib/series";

const W = 160;
const H = 36;

// a small trend with no axes; the figures beside it carry the numbers
export function Sparkline({ values, guideline, color }: { values: Values; guideline: number | null; color: string }) {
  const top = Math.max(...values.map((v) => v ?? 0), (guideline ?? 0) * 1.25, 1);
  const x = (i: number) => (values.length > 1 ? (i / (values.length - 1)) * W : W);
  const y = (v: number) => H - 2 - (v / top) * (H - 4);

  let path = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v == null) {
      pen = false;
      return;
    }
    path += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className="h-9 w-full">
      {guideline != null && (
        <line x1="0" x2={W} y1={y(guideline)} y2={y(guideline)} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.6" />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
