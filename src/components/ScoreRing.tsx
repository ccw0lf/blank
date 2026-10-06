import { cn } from "@/lib/utils";

export function ScoreRing({
  value,
  size = 128,
  stroke = 10,
  passed,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  passed?: boolean | null;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const color = passed == null ? "text-brand-600" : passed ? "text-emerald-500" : "text-red-500";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${Math.round(v)} percent`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className={cn("stroke-current transition-all", color)}
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <p className="text-2xl font-semibold tabular-nums" style={{ fontSize: size * 0.22 }}>
          {Math.round(v)}%
        </p>
        {label && <p className="text-[11px] text-slate-500">{label}</p>}
      </div>
    </div>
  );
}
