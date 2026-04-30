"use client";

import { clsx } from "clsx";

export function LivingFlame({
  size = 110,
  intensity = 1,
  embers = true,
  className,
}: {
  size?: number;
  /** 0..1 — scales the visual fire / ember count. */
  intensity?: number;
  embers?: boolean;
  className?: string;
}) {
  const w = size;
  const h = size * (160 / 120);
  const opacity = 0.4 + Math.min(Math.max(intensity, 0), 1) * 0.6;
  const emberCount = embers ? Math.max(2, Math.round(intensity * 6)) : 0;

  return (
    <div
      className={clsx("relative", className)}
      style={{ width: w, height: h, opacity }}
      aria-hidden
    >
      {/* outer core */}
      <div
        className="flame-flicker absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: w * 0.58,
          height: h * 0.7,
          background:
            "radial-gradient(ellipse at 50% 80%, #fff7c2 0%, #ffd24a 30%, #ff8a3d 60%, #e84e2c 100%)",
          borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
          filter: "drop-shadow(0 0 16px rgba(255,138,61,0.55))",
        }}
      />
      {/* inner glow */}
      <div
        className="flame-flicker-fast absolute bottom-1 left-1/2 -translate-x-1/2"
        style={{
          width: w * 0.28,
          height: h * 0.36,
          background:
            "radial-gradient(ellipse at 50% 80%, #fffce8 0%, #ffd24a 70%, transparent 100%)",
          borderRadius: "50%",
          mixBlendMode: "screen",
        }}
      />
      {/* embers */}
      {Array.from({ length: emberCount }).map((_, i) => (
        <span
          key={i}
          className="ember-anim absolute"
          style={
            {
              bottom: `${50 + (i % 3) * 6}%`,
              left: "50%",
              width: 4,
              height: 4,
              background:
                "radial-gradient(circle, #ffd24a, #e84e2c 70%, transparent 100%)",
              borderRadius: "50%",
              animationDelay: `${i * 0.4}s`,
              "--ex": `${(i % 2 === 0 ? -1 : 1) * (8 + i * 4)}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
