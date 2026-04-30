"use client";

import { useEffect, useRef, useState } from "react";

const PALETTE = [
  "#0d9488", // forest
  "#65a30d", // sage
  "#f3b04a", // sun
  "#c4527c", // berry
  "#0284c7", // sky
  "#f59e0b", // amber
];

interface Piece {
  id: number;
  color: string;
  x: number;
  xd: number;
  dur: number;
  delay: number;
}

export function ConfettiBurst({
  trigger,
  withCheck = true,
  withSplash = true,
}: {
  /** Increment / change to fire a burst. */
  trigger: number | string | null;
  withCheck?: boolean;
  withSplash?: boolean;
}) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [showStamp, setShowStamp] = useState(false);
  const lastRef = useRef<typeof trigger>(null);
  const idRef = useRef(0);

  useEffect(() => {
    if (trigger == null) return;
    if (lastRef.current === trigger) return;
    lastRef.current = trigger;

    const next: Piece[] = Array.from({ length: 48 }, (_, i) => {
      const id = ++idRef.current;
      return {
        id,
        color: PALETTE[i % PALETTE.length],
        x: 50,
        xd: Math.random() * 360 - 180,
        dur: 1.0 + Math.random() * 0.6,
        delay: Math.random() * 0.05,
      };
    });
    setPieces(next);
    setShowStamp(true);
    const t1 = window.setTimeout(() => setPieces([]), 1800);
    const t2 = window.setTimeout(() => setShowStamp(false), 1100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [trigger]);

  if (pieces.length === 0 && !showStamp) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[55] grid place-items-center"
      aria-hidden
    >
      <div className="relative" style={{ width: 1, height: 1 }}>
        {withSplash && showStamp ? (
          <div
            className="splash-anim absolute"
            style={{
              left: -34,
              top: -34,
              width: 68,
              height: 68,
              borderRadius: "50%",
              border: "3px solid var(--color-forest)",
            }}
          />
        ) : null}
        {withCheck && showStamp ? (
          <div
            className="check-pop-anim absolute grid place-items-center rounded-full text-white"
            style={{
              left: -42,
              top: -42,
              width: 84,
              height: 84,
              background:
                "linear-gradient(180deg, #11b3a4 0%, #0d9488 100%)",
              boxShadow:
                "0 12px 32px rgba(13,148,136,0.45), inset 0 -4px 0 rgba(0,0,0,0.15)",
              fontSize: 42,
              fontWeight: 700,
            }}
          >
            ✓
          </div>
        ) : null}
        {pieces.map((p) => (
          <span
            key={p.id}
            className="confetti-piece absolute block"
            style={
              {
                left: 0,
                top: -40,
                width: 10,
                height: 14,
                borderRadius: 2,
                background: p.color,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                "--x0": "0px",
                "--xd": `${p.xd}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
