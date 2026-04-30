"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";
import { clsx } from "clsx";

export function TiltCard({
  children,
  className,
  intensity = 10,
  style,
}: {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees. */
  intensity?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const raf = useRef<number | null>(null);

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const rx = (0.5 - y) * intensity;
      const ry = (x - 0.5) * intensity;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    });
  }

  function reset() {
    const el = ref.current;
    if (!el) return;
    if (raf.current != null) cancelAnimationFrame(raf.current);
    el.style.transform = "";
  }

  return (
    <div
      ref={ref}
      className={clsx("tilt-card relative", className)}
      style={style}
      onPointerMove={handleMove}
      onPointerLeave={reset}
    >
      {children}
    </div>
  );
}
