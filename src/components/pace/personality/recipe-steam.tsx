"use client";

import { useEffect } from "react";

export function RecipeSteam({
  trigger,
  count = 6,
  height = 120,
  topOffset = 30,
}: {
  /** Increment to fire a new steam puff. */
  trigger: number | string;
  count?: number;
  height?: number;
  topOffset?: number;
}) {
  // Re-mount steam particles whenever trigger changes by keying on it externally.
  // We keep this pure CSS-driven so it is cheap.
  void height;
  useEffect(() => {
    // No-op; component is keyed by parent so simply rendering = firing.
  }, [trigger]);

  return (
    <div
      className="pointer-events-none absolute left-0 right-0"
      style={{ top: topOffset, height: 0 }}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => {
        const sx = (i % 2 === 0 ? -1 : 1) * (8 + i * 3);
        return (
          <span
            key={i}
            className="steam-anim absolute"
            style={
              {
                left: `${48 + i * 2}%`,
                top: 0,
                width: 8,
                height: 30,
                background:
                  "radial-gradient(ellipse, rgba(255,255,255,0.85), transparent 70%)",
                borderRadius: "50%",
                animationDelay: `${i * 0.12}s`,
                "--sx": `${sx}px`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
