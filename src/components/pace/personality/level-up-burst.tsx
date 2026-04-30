"use client";

import { useEffect, useRef, useState } from "react";

export function LevelUpBurst({
  trigger,
  label,
  size = 110,
}: {
  /** Increment to fire a new burst (e.g. weight goal hit). */
  trigger: number | string | null;
  label: string;
  size?: number;
}) {
  const [show, setShow] = useState(false);
  const [rays, setRays] = useState<number[]>([]);
  const lastRef = useRef<typeof trigger>(null);

  useEffect(() => {
    if (trigger == null) return;
    if (lastRef.current === trigger) return;
    lastRef.current = trigger;
    setShow(true);
    setRays(Array.from({ length: 12 }, (_, i) => i));
    const t = window.setTimeout(() => setShow(false), 1800);
    return () => window.clearTimeout(t);
  }, [trigger]);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center"
      style={{ paddingBottom: 80 }}
      aria-live="polite"
    >
      <div className="relative" style={{ width: size, height: size }}>
        {rays.map((i) => (
          <span
            key={i}
            className="ray-anim absolute left-1/2 top-1/2"
            style={
              {
                width: 4,
                height: 90,
                background:
                  "linear-gradient(180deg, transparent, var(--color-amber), transparent)",
                transformOrigin: "50% 0",
                "--rot": `${i * 30}deg`,
              } as React.CSSProperties
            }
          />
        ))}
        <div
          className="badge-pop-anim grid place-items-center rounded-full text-ink-2"
          style={{
            width: size,
            height: size,
            background:
              "linear-gradient(180deg, #fbd58c 0%, #f59e0b 100%)",
            boxShadow:
              "0 0 0 6px rgba(245,158,11,0.18), 0 0 60px rgba(245,158,11,0.55), inset 0 -6px 0 rgba(0,0,0,0.15)",
            fontFamily: "var(--font-body), serif",
            fontSize: size * 0.4,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
