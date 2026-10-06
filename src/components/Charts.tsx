import { cn } from "@/lib/utils";

/** Simple accessible bar chart built from divs. */
export function BarChart({
  data,
  height = 140,
  barClass = "bg-brand-500",
}: {
  data: { label: string; value: number; barClass?: string; title?: string }[];
  height?: number;
  barClass?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5" role="img" aria-label="Bar chart">
      {data.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={d.title ?? `${d.label}: ${d.value}`}>
          <span className="text-[11px] text-slate-500 tabular-nums">{d.value || ""}</span>
          <div
            className={cn("w-full rounded-t-md transition-all", d.barClass ?? barClass)}
            style={{ height: d.value ? Math.max(4, (d.value / max) * height) : 2, opacity: d.value ? 1 : 0.25 }}
          />
          <span className="w-full truncate text-center text-[10px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Score trend: line + dots with a dashed pass-mark line. y axis is 0–100%. */
export function TrendChart({
  points,
  passMark,
}: {
  points: { label: string; value: number; passed: boolean | null }[];
  passMark?: number;
}) {
  const W = 560;
  const H = 180;
  const padL = 34;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const x = (i: number) => padL + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => padT + ih - (v / 100) * ih;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = points.length > 1 ? `${path} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score trend over your attempts">
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="stroke-slate-100" />
          <text x={padL - 8} y={y(t) + 3} textAnchor="end" className="fill-slate-400" fontSize="10">
            {t}
          </text>
        </g>
      ))}
      {passMark != null && (
        <g>
          <line x1={padL} x2={W - padR} y1={y(passMark)} y2={y(passMark)} className="stroke-amber-400" strokeDasharray="4 4" />
          <text x={W - padR} y={y(passMark) - 4} textAnchor="end" className="fill-amber-600" fontSize="10">
            pass mark
          </text>
        </g>
      )}
      {area && <path d={area} className="fill-brand-500/10" />}
      {points.length > 1 && <path d={path} fill="none" className="stroke-brand-500" strokeWidth="2" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="4.5" className={cn("stroke-white", p.passed ? "fill-emerald-500" : "fill-red-500")} strokeWidth="2">
            <title>{`${p.label}: ${Math.round(p.value)}%`}</title>
          </circle>
          {(points.length <= 8 || i % Math.ceil(points.length / 8) === 0) && (
            <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-slate-400" fontSize="10">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function ProgressBar({ value, tone }: { value: number; tone?: "green" | "red" | "brand" }) {
  const color = tone === "green" ? "bg-emerald-500" : tone === "red" ? "bg-red-500" : "bg-brand-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
