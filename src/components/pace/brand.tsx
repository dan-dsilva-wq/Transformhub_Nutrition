"use client";

import Image from "next/image";
import { clsx } from "clsx";

/* ──────────────────────────────────────────────────────────────
   Transform Hub brand primitives
   - <BrandMark /> : the official Transform Hub wheel as PNG (pixel-perfect)
   - <BrandLogo /> : full lockups (horizontal, stacked, wordmark)
   - <Wordmark />  : compact in-app type lockup with the wheel
   ────────────────────────────────────────────────────────────── */

type Color = "cyan" | "navy" | "white" | "duotone";

const MARK_SRC: Record<Color, string> = {
  cyan: "/brand/mark.png",
  navy: "/brand/mark-dark.png",
  white: "/brand/mark-white.png",
  duotone: "/brand/glyph-duotone.png",
};

interface BrandMarkProps {
  size?: number;
  color?: Color;
  /** Kept for API compatibility — ignored when using the official PNG. */
  strokeWidth?: number;
  className?: string;
  /** Adds a slow rotation that reads as ambient motion (use sparingly). */
  spin?: boolean;
  ariaLabel?: string;
  priority?: boolean;
}

/**
 * The official Transform Hub wheel — rendered from the supplied PNG so the
 * geometry is pixel-perfect against the brand assets. Recolour by picking a
 * variant; rotate by passing `spin` or composing `brand-spin-slow`.
 */
export function BrandMark({
  size = 96,
  color = "cyan",
  className,
  spin = false,
  ariaLabel,
  priority,
}: BrandMarkProps) {
  return (
    <Image
      src={MARK_SRC[color]}
      alt={ariaLabel ?? ""}
      aria-hidden={ariaLabel ? undefined : true}
      width={size}
      height={size}
      priority={priority}
      draggable={false}
      className={clsx(
        spin && "brand-spin-slow",
        "select-none",
        className,
      )}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

/**
 * The official PNG lockup. Use for hero moments where pixel-perfect brand
 * fidelity matters (auth, plan-reveal, splash). Pick a variant that matches
 * the surface — "white" on dark, "dark" on light, "cyan" anywhere.
 */
export function BrandLogo({
  variant = "horizontal",
  tone = "auto",
  width = 200,
  className,
  priority,
}: {
  variant?: "horizontal" | "stacked" | "wordmark" | "mark" | "glyph";
  tone?: "auto" | "white" | "dark" | "cyan";
  width?: number;
  className?: string;
  priority?: boolean;
}) {
  const file = (() => {
    const t = tone === "auto" ? "" : `-${tone === "cyan" ? "blue" : tone}`;
    if (variant === "horizontal") return `/brand/horizontal${tone === "auto" ? "" : t === "-blue" ? "" : t}.png`;
    if (variant === "stacked") return `/brand/stacked${tone === "auto" ? "" : t === "-blue" ? "" : t}.png`;
    if (variant === "wordmark") return `/brand/wordmark${tone === "auto" ? "" : t === "-blue" ? "" : t}.png`;
    if (variant === "mark") return `/brand/mark${tone === "auto" ? "" : t === "-blue" ? "" : t}.png`;
    if (variant === "glyph") return `/brand/glyph${tone === "auto" ? "" : t === "-blue" ? "-blue" : t}.png`;
    return "/brand/horizontal.png";
  })();

  // Reasonable height ratios for each lockup
  const aspect: Record<string, number> = {
    horizontal: 0.30,
    stacked: 0.84,
    wordmark: 0.30,
    mark: 1.0,
    glyph: 1.0,
  };
  const height = Math.round(width * (aspect[variant] ?? 0.3));

  return (
    <Image
      src={file}
      alt="Transform Hub"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}

/**
 * Compact in-app wordmark — the brand wheel followed by the Transform Hub
 * type lockup. Used in the app header and drawer. Sized to match the
 * existing Pace-era footprint so layout doesn't shift.
 */
export function Wordmark({
  size = "md",
  tone = "light",
}: {
  size?: "sm" | "md" | "lg";
  /** "light" = use white wordmark (over dark surfaces); "dark" = navy */
  tone?: "light" | "dark";
}) {
  const px = size === "lg" ? 36 : size === "sm" ? 22 : 28;
  const cyan = "#008fd0";
  const wordColor = tone === "light" ? "#ffffff" : "#001a26";
  const subColor = cyan;
  const word = "TRANSFORM";
  const sub = "HUB";

  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <BrandMark size={px} color="cyan" strokeWidth={8} />
      <span className="flex flex-col leading-none">
        <span
          className="font-display tracking-[-0.02em]"
          style={{
            color: wordColor,
            fontWeight: 700,
            fontSize: size === "lg" ? 18 : size === "sm" ? 11.5 : 14,
            lineHeight: 1,
            letterSpacing: "0.04em",
            fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {word}
        </span>
        <span
          style={{
            color: subColor,
            fontWeight: 700,
            fontSize: size === "lg" ? 16 : size === "sm" ? 10 : 12,
            letterSpacing: "0.32em",
            lineHeight: 1.2,
            marginTop: 2,
            fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {sub}
        </span>
      </span>
    </span>
  );
}

/**
 * Hero brand lockup — large stacked wheel + wordmark with ambient sheen.
 * For the auth screen and plan-reveal.
 */
export function BrandHero({
  className,
  tone = "light",
  size = 120,
}: {
  className?: string;
  tone?: "light" | "dark";
  size?: number;
}) {
  const tagColor = tone === "light" ? "rgba(255,255,255,0.78)" : "rgba(0,26,38,0.65)";
  return (
    <div className={clsx("flex flex-col items-center text-center", className)}>
      <div className="relative">
        {/* soft glow halo behind the mark */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(0,143,208,0.55) 0%, rgba(0,143,208,0.0) 65%)",
            transform: "scale(1.6)",
            filter: "blur(8px)",
          }}
        />
        <BrandMark size={size} color="cyan" strokeWidth={7} className="float-anim" />
      </div>
      <div className="mt-5 flex flex-col items-center">
        <span
          className="numerals"
          style={{
            color: tone === "light" ? "#ffffff" : "#001a26",
            fontWeight: 800,
            letterSpacing: "0.18em",
            fontSize: 28,
          }}
        >
          TRANSFORM
        </span>
        <span
          className="numerals"
          style={{
            color: "#008fd0",
            fontWeight: 800,
            letterSpacing: "0.62em",
            fontSize: 22,
            marginTop: 4,
            paddingLeft: "0.62em",
          }}
        >
          HUB
        </span>
        <span
          className="font-eyebrow mt-3"
          style={{ color: tagColor }}
        >
          Performance Nutrition
        </span>
      </div>
    </div>
  );
}
