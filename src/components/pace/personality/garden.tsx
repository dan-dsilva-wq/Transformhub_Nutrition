"use client";

import { clsx } from "clsx";

const VEG = ["🥕", "🥦", "🍅", "🥬", "🌽", "🍆", "🫑", "🥒", "🍓", "🥗"];

export function Garden({
  count,
  max = 9,
  height = 160,
  className,
}: {
  count: number;
  max?: number;
  height?: number;
  className?: string;
}) {
  const visible = Math.min(Math.max(count, 0), max);

  return (
    <div
      className={clsx("relative w-full overflow-hidden rounded-3xl", className)}
      style={{
        height,
        background:
          "linear-gradient(180deg, #cfeaf6 0%, #f3e7c8 65%, #d6c19a 100%)",
      }}
    >
      {/* Sun */}
      <div
        className="sun-pulse-anim absolute right-5 top-4"
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, #fff5d8 0%, #f59e0b 70%, transparent 100%)",
          boxShadow: "0 0 32px rgba(245,158,11,0.5)",
        }}
        aria-hidden
      />
      {/* hills behind plot */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "55%",
          background:
            "radial-gradient(120% 80% at 50% 100%, rgba(101,163,13,0.55), transparent 70%)",
        }}
        aria-hidden
      />
      {/* soil plot */}
      <div
        className="absolute"
        style={{
          left: "8%",
          right: "8%",
          bottom: "16%",
          height: 20,
          background: "linear-gradient(180deg, #8d6a4c, #6d4f37)",
          borderRadius: 10,
          boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.18)",
        }}
        aria-hidden
      >
        {/* dirt clods */}
        <div
          className="absolute left-0 right-0 -top-2 h-4"
          style={{
            background: `
              radial-gradient(circle at 10% 50%, #4a3320 5px, transparent 6px),
              radial-gradient(circle at 30% 50%, #3a2818 4px, transparent 5px),
              radial-gradient(circle at 50% 50%, #4a3320 5px, transparent 6px),
              radial-gradient(circle at 70% 50%, #3a2818 4px, transparent 5px),
              radial-gradient(circle at 90% 50%, #4a3320 5px, transparent 6px)
            `,
          }}
        />
      </div>
      {/* vegetables */}
      <div className="absolute inset-0">
        {Array.from({ length: visible }).map((_, i) => {
          const x = 12 + (i % max) * (76 / max);
          const offset = i % 2 === 0 ? 4 : 12;
          return (
            <span
              key={i}
              className="veg-pop-anim absolute"
              style={{
                left: `${x}%`,
                bottom: `${20 + offset}%`,
                fontSize: 24 + (i % 3) * 2,
                animationDelay: `${i * 60}ms`,
              }}
            >
              {VEG[i % VEG.length]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
