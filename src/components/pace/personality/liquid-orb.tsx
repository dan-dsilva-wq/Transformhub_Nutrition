"use client";

import { clsx } from "clsx";

export function LiquidOrb({
  label,
  value,
  target,
  gradient,
  size = 80,
  className,
}: {
  label: string;
  value: number;
  target: number;
  /** Two color stops [top, bottom] for the liquid. */
  gradient: [string, string];
  size?: number;
  className?: string;
}) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const fillPct = Math.max(pct, 0.04); // always show a sliver so it doesn't feel dead
  const display = Math.round(pct * 100);

  return (
    <div className={clsx("flex flex-col items-center", className)}>
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle at 32% 30%, rgba(255,255,255,0.55), rgba(0,0,0,0.04) 60%)",
          boxShadow:
            "inset -5px -8px 14px rgba(0,0,0,0.08), inset 4px 6px 10px rgba(255,255,255,0.4), 0 6px 18px rgba(0,0,0,0.08)",
        }}
        role="img"
        aria-label={`${label} ${display}% of target`}
      >
        <div
          className="liquid-wave absolute"
          style={{
            left: "-25%",
            right: "-25%",
            bottom: 0,
            height: `${fillPct * 100}%`,
            background: `linear-gradient(180deg, ${gradient[0]}, ${gradient[1]})`,
            borderRadius: "50% 50% 0 0 / 12% 12% 0 0",
            transformOrigin: "50% 100%",
            transition: "height 800ms cubic-bezier(.2,.8,.2,1)",
          }}
        />
        <div
          className="numerals absolute inset-x-0 text-center text-white"
          style={{
            top: 8,
            fontSize: size * 0.22,
            fontWeight: 700,
            textShadow: "0 1px 2px rgba(0,0,0,0.25)",
          }}
        >
          {display}%
        </div>
        <div
          className="absolute inset-x-0 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white"
          style={{
            bottom: 8,
            textShadow: "0 1px 2px rgba(0,0,0,0.25)",
          }}
        >
          {label[0]}
        </div>
      </div>
      <div className="mt-1.5 text-[11px] font-medium text-ink-2">{label}</div>
      <div className="numerals text-[10px] text-muted">
        {Math.round(value)} / {Math.round(target)}g
      </div>
    </div>
  );
}
