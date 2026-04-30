"use client";

import { clsx } from "clsx";

const DEFAULT_BITS = ["🥕", "🥑", "🍎", "🥦", "🍇", "🍋", "🌿"];

export function AmbientDrift({
  bits = DEFAULT_BITS,
  className,
  density = 6,
}: {
  bits?: string[];
  className?: string;
  density?: number;
}) {
  return (
    <div
      className={clsx("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      {Array.from({ length: density }).map((_, i) => {
        const dur = 14 + (i % 4) * 3;
        const left = ((i * 17) % 90) + 4;
        return (
          <span
            key={i}
            className="ambient-drift-anim absolute"
            style={
              {
                left: `${left}%`,
                top: 0,
                fontSize: 22 + (i % 3) * 4,
                opacity: 0.4,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.06))",
                animationDelay: `${(i * 1.6) % 14}s`,
                "--drift-dur": `${dur}s`,
              } as React.CSSProperties
            }
          >
            {bits[i % bits.length]}
          </span>
        );
      })}
    </div>
  );
}
