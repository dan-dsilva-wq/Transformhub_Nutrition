"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

export function Odometer({
  value,
  digits = 4,
  className,
  size = "lg",
}: {
  value: number;
  digits?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  // Reduce flicker by tracking the value once mounted so the first
  // animation rolls from 0.
  const [display, setDisplay] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      const t = window.setTimeout(() => setDisplay(value), 60);
      return () => window.clearTimeout(t);
    }
    setDisplay(value);
  }, [value]);

  const padded = String(Math.max(0, Math.round(display))).padStart(digits, "0");
  const sizeClass =
    size === "sm" ? "h-7 text-[28px]" : size === "md" ? "h-10 text-[40px]" : "h-14 text-[56px]";
  const widthClass =
    size === "sm" ? "w-[18px]" : size === "md" ? "w-[26px]" : "w-[36px]";

  return (
    <div
      className={clsx("inline-flex items-center gap-[3px]", className)}
      aria-label={`${value}`}
    >
      {padded.split("").map((ch, i) => (
        <Digit key={i} digit={Number(ch)} sizeClass={sizeClass} widthClass={widthClass} />
      ))}
    </div>
  );
}

function Digit({
  digit,
  sizeClass,
  widthClass,
}: {
  digit: number;
  sizeClass: string;
  widthClass: string;
}) {
  return (
    <span
      className={clsx(
        "relative inline-block overflow-hidden rounded-lg",
        sizeClass,
        widthClass,
      )}
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f4eddd 100%)",
        boxShadow:
          "inset 0 3px 6px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.6)",
      }}
      aria-hidden
    >
      <span
        className="numerals block text-center text-ink-2"
        style={{
          transform: `translateY(-${digit * 100}%)`,
          transition: "transform 1.0s cubic-bezier(.2,.8,.2,1)",
          lineHeight: 1,
        }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className="block" style={{ height: "1em", lineHeight: 1 }}>
            {i}
          </span>
        ))}
      </span>
    </span>
  );
}
