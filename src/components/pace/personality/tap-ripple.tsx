"use client";

import { useRef, type ReactNode } from "react";
import { clsx } from "clsx";

/**
 * Wrap any interactive element to add a Material-style ripple on press.
 * The wrapper preserves layout — children render exactly where they would
 * have. Only adds an absolute ripple span on each click.
 */
export function TapRipple({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  function spawn(e: React.PointerEvent<HTMLDivElement>) {
    const host = ref.current;
    if (!host) return;
    const r = host.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.2;
    const span = document.createElement("span");
    span.className = "ripple-mark";
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    span.style.left = `${e.clientX - r.left - size / 2}px`;
    span.style.top = `${e.clientY - r.top - size / 2}px`;
    host.appendChild(span);
    window.setTimeout(() => span.remove(), 750);
    onClick?.(e);
  }

  return (
    <div
      ref={ref}
      className={clsx("ripple-host", className)}
      onPointerDown={spawn}
    >
      {children}
    </div>
  );
}
