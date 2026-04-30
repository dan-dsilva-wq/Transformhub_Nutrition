"use client";

import { clsx } from "clsx";
import type { CSSProperties } from "react";

type Family =
  | "eggs"
  | "pancake"
  | "bagel"
  | "oats"
  | "yogurt"
  | "shake"
  | "bowl"
  | "salad"
  | "curry"
  | "chilli"
  | "fish"
  | "wrap"
  | "burrito"
  | "soup"
  | "tofu"
  | "muffin"
  | "hummus"
  | "sandwich"
  | "pasta"
  | "chicken";

function familyFor(key: string): Family {
  const k = key.toLowerCase();
  if (k.includes("pancake")) return "pancake";
  if (k.includes("muffin")) return "muffin";
  if (k.includes("bagel")) return "bagel";
  if (k.includes("burrito")) return "burrito";
  if (k.includes("wrap")) return "wrap";
  if (k.includes("oats") || k.includes("porridge") || k.includes("granola") || k.includes("parfait")) return "oats";
  if (k.includes("yogurt") || k.includes("cottage") || k.includes("chia")) return "yogurt";
  if (k.includes("shake") || k.includes("smoothie")) return "shake";
  if (k.includes("hummus")) return "hummus";
  if (k.includes("tofu")) return "tofu";
  if (k.includes("chilli")) return "chilli";
  if (k.includes("lentil") || k.includes("curry") || k.includes("dahl") || k.includes("dal")) return "curry";
  if (k.includes("salmon") || k.includes("cod") || k.includes("tuna") || k.includes("fish")) return "fish";
  if (k.includes("soup") || k.includes("broth") || k.includes("stew")) return "soup";
  if (k.includes("pasta") || k.includes("noodle") || k.includes("spaghetti")) return "pasta";
  if (k.includes("sandwich")) return "sandwich";
  if (k.includes("salad")) return "salad";
  if (k.includes("bowl") || k.includes("quinoa") || k.includes("rice") || k.includes("buddha")) return "bowl";
  if (k.includes("scramble") || k.includes("egg") || k.includes("shakshuka") || k.includes("hash") || k.includes("skillet") || k.includes("frittata") || k.includes("omelette")) return "eggs";
  return "chicken";
}

interface Palette {
  gradient: string;
  motif: string;
  shadow: string;
}

const palettes: Record<Family, Palette> = {
  eggs:     { gradient: "linear-gradient(135deg,#fde68a,#fbbf24 60%,#f59e0b)", motif: "rgba(255,255,255,.55)", shadow: "rgba(245,158,11,.28)" },
  pancake:  { gradient: "linear-gradient(135deg,#fef3c7,#fdba74 60%,#f87171)", motif: "rgba(255,255,255,.5)", shadow: "rgba(244,114,82,.26)" },
  bagel:    { gradient: "linear-gradient(135deg,#fde68a,#fb923c 60%,#c2410c)", motif: "rgba(255,255,255,.45)", shadow: "rgba(194,65,12,.28)" },
  muffin:   { gradient: "linear-gradient(135deg,#fbcfe8,#f472b6 60%,#be185d)", motif: "rgba(255,255,255,.55)", shadow: "rgba(190,24,93,.26)" },
  oats:     { gradient: "linear-gradient(135deg,#fef3c7,#fde68a 60%,#a8a29e)", motif: "rgba(255,255,255,.55)", shadow: "rgba(120,113,108,.26)" },
  yogurt:   { gradient: "linear-gradient(135deg,#f5d0fe,#c084fc 60%,#7e22ce)", motif: "rgba(255,255,255,.55)", shadow: "rgba(126,34,206,.28)" },
  shake:    { gradient: "linear-gradient(135deg,#fce7f3,#f9a8d4 60%,#db2777)", motif: "rgba(255,255,255,.55)", shadow: "rgba(219,39,119,.26)" },
  bowl:     { gradient: "linear-gradient(135deg,#a7f3d0,#6ee7b7 60%,#10b981)", motif: "rgba(255,255,255,.5)", shadow: "rgba(16,185,129,.26)" },
  salad:    { gradient: "linear-gradient(135deg,#bbf7d0,#86efac 60%,#16a34a)", motif: "rgba(255,255,255,.55)", shadow: "rgba(22,163,74,.26)" },
  curry:    { gradient: "linear-gradient(135deg,#fed7aa,#fb923c 55%,#c2410c)", motif: "rgba(255,255,255,.45)", shadow: "rgba(194,65,12,.30)" },
  chilli:   { gradient: "linear-gradient(135deg,#fecaca,#f87171 55%,#b91c1c)", motif: "rgba(255,255,255,.45)", shadow: "rgba(185,28,28,.30)" },
  fish:     { gradient: "linear-gradient(135deg,#bae6fd,#7dd3fc 55%,#0284c7)", motif: "rgba(255,255,255,.55)", shadow: "rgba(2,132,199,.28)" },
  wrap:     { gradient: "linear-gradient(135deg,#fde68a,#fcd34d 55%,#a16207)", motif: "rgba(255,255,255,.5)", shadow: "rgba(161,98,7,.28)" },
  burrito:  { gradient: "linear-gradient(135deg,#fed7aa,#fdba74 55%,#9a3412)", motif: "rgba(255,255,255,.5)", shadow: "rgba(154,52,18,.28)" },
  soup:     { gradient: "linear-gradient(135deg,#fef9c3,#fde047 55%,#ca8a04)", motif: "rgba(255,255,255,.5)", shadow: "rgba(202,138,4,.26)" },
  tofu:     { gradient: "linear-gradient(135deg,#d9f99d,#a3e635 55%,#4d7c0f)", motif: "rgba(255,255,255,.5)", shadow: "rgba(77,124,15,.26)" },
  hummus:   { gradient: "linear-gradient(135deg,#fef3c7,#fde68a 55%,#d97706)", motif: "rgba(255,255,255,.5)", shadow: "rgba(217,119,6,.26)" },
  sandwich: { gradient: "linear-gradient(135deg,#fed7aa,#fcd34d 55%,#92400e)", motif: "rgba(255,255,255,.5)", shadow: "rgba(146,64,14,.26)" },
  pasta:    { gradient: "linear-gradient(135deg,#fef3c7,#fde047 55%,#dc2626)", motif: "rgba(255,255,255,.5)", shadow: "rgba(220,38,38,.26)" },
  chicken:  { gradient: "linear-gradient(135deg,#fde68a,#f59e0b 60%,#92400e)", motif: "rgba(255,255,255,.5)", shadow: "rgba(146,64,14,.26)" },
};

function Glyph({ family, size }: { family: Family; size: number }) {
  const s = size;
  switch (family) {
    case "eggs":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <ellipse cx="20" cy="36" rx="14" ry="10" fill="#fff" />
          <circle cx="20" cy="36" r="5" fill="#fbbf24" />
          <ellipse cx="42" cy="34" rx="12" ry="9" fill="#fff" />
          <circle cx="42" cy="34" r="4.5" fill="#fbbf24" />
        </svg>
      );
    case "pancake":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <ellipse cx="32" cy="44" rx="22" ry="4" fill="rgba(0,0,0,.12)" />
          <ellipse cx="32" cy="40" rx="22" ry="6" fill="#92400e" />
          <ellipse cx="32" cy="36" rx="22" ry="6" fill="#fbbf24" />
          <ellipse cx="32" cy="32" rx="22" ry="6" fill="#fcd34d" />
          <path d="M22 30c4-3 16-3 20 0-4 6-16 6-20 0z" fill="#92400e" opacity=".55" />
          <circle cx="32" cy="22" r="3.5" fill="#fff" />
        </svg>
      );
    case "bagel":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <circle cx="32" cy="34" r="20" fill="#d97706" />
          <circle cx="32" cy="34" r="20" fill="none" stroke="#7c2d12" strokeWidth="1" opacity=".4" />
          <circle cx="32" cy="34" r="7" fill="rgba(0,0,0,.15)" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const x = 32 + Math.cos(a) * 14;
            const y = 34 + Math.sin(a) * 14;
            return <circle key={i} cx={x} cy={y} r="1.4" fill="#fef3c7" />;
          })}
        </svg>
      );
    case "muffin":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M16 36h32v14a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z" fill="#a16207" />
          <path d="M16 38h32M22 38v16M32 38v16M42 38v16" stroke="#7c2d12" strokeWidth="1" />
          <path d="M14 40c0-12 8-22 18-22s18 10 18 22z" fill="#fbbf24" />
          <circle cx="24" cy="30" r="2" fill="#9d174d" />
          <circle cx="38" cy="26" r="2" fill="#7c2d12" />
        </svg>
      );
    case "oats":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <ellipse cx="32" cy="44" rx="22" ry="4" fill="rgba(0,0,0,.1)" />
          <path d="M10 34c0-3 4-6 22-6s22 3 22 6v6c0 6-10 10-22 10s-22-4-22-10z" fill="#fff" />
          <circle cx="22" cy="34" r="2.5" fill="#9a3412" />
          <circle cx="32" cy="32" r="2.5" fill="#a16207" />
          <circle cx="42" cy="34" r="2.5" fill="#9d174d" />
          <circle cx="28" cy="38" r="2" fill="#a16207" />
          <circle cx="38" cy="38" r="2" fill="#7c2d12" />
        </svg>
      );
    case "yogurt":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M14 24h36l-3 28a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4z" fill="#fff" />
          <path d="M14 24h36" stroke="#a855f7" strokeWidth="2" />
          <circle cx="22" cy="20" r="3" fill="#9d174d" />
          <circle cx="32" cy="18" r="3.5" fill="#7c3aed" />
          <circle cx="42" cy="22" r="3" fill="#9d174d" />
          <circle cx="28" cy="22" r="2" fill="#be185d" />
        </svg>
      );
    case "shake":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M22 14h20l-2 6H24z" fill="#f9a8d4" />
          <path d="M22 18h20l-3 36a4 4 0 0 1-4 4H29a4 4 0 0 1-4-4z" fill="#fce7f3" />
          <path d="M24 22h16l-2 12H26z" fill="#f472b6" />
          <path d="M30 8c0 4-4 6-4 10 0-4 4-6 4-10z" fill="#10b981" />
        </svg>
      );
    case "bowl":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M8 30h48c0 14-10 22-24 22S8 44 8 30z" fill="#fff" />
          <ellipse cx="32" cy="30" rx="24" ry="3" fill="#f5f5f4" />
          <circle cx="22" cy="28" r="3" fill="#16a34a" />
          <circle cx="32" cy="26" r="3.5" fill="#fbbf24" />
          <circle cx="42" cy="28" r="3" fill="#dc2626" />
          <circle cx="28" cy="32" r="2" fill="#7c3aed" />
          <circle cx="38" cy="32" r="2.5" fill="#16a34a" />
        </svg>
      );
    case "salad":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M8 32h48c0 12-10 20-24 20S8 44 8 32z" fill="#f5f5f4" />
          <path d="M16 30c0-10 6-16 12-16 0 8-4 16-12 16z" fill="#16a34a" />
          <path d="M24 32c0-8 8-14 20-14 0 8-8 14-20 14z" fill="#22c55e" />
          <circle cx="40" cy="34" r="3" fill="#dc2626" />
          <circle cx="22" cy="34" r="2.5" fill="#fbbf24" />
        </svg>
      );
    case "curry":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <ellipse cx="32" cy="46" rx="24" ry="4" fill="rgba(0,0,0,.15)" />
          <path d="M8 32h48c0 12-10 20-24 20S8 44 8 32z" fill="#9a3412" />
          <ellipse cx="32" cy="32" rx="24" ry="4" fill="#ea580c" />
          <circle cx="22" cy="30" r="2.4" fill="#fde68a" />
          <circle cx="36" cy="28" r="2" fill="#fff" />
          <circle cx="42" cy="32" r="2" fill="#fff7ed" />
          <circle cx="28" cy="34" r="1.8" fill="#fcd34d" />
        </svg>
      );
    case "chilli":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <ellipse cx="32" cy="46" rx="24" ry="4" fill="rgba(0,0,0,.15)" />
          <path d="M8 32h48c0 12-10 20-24 20S8 44 8 32z" fill="#7f1d1d" />
          <ellipse cx="32" cy="32" rx="24" ry="4" fill="#dc2626" />
          <circle cx="22" cy="30" r="2.2" fill="#a16207" />
          <circle cx="40" cy="32" r="2" fill="#fde68a" />
          <circle cx="32" cy="28" r="1.8" fill="#fff" />
          <circle cx="46" cy="30" r="1.6" fill="#a16207" />
        </svg>
      );
    case "fish":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M8 32c10-14 30-14 40 0-10 14-30 14-40 0z" fill="#fb923c" />
          <path d="M48 32l12-10v20z" fill="#fb923c" />
          <circle cx="20" cy="30" r="2" fill="#1d2a22" />
          <path d="M14 30c4-2 12-2 16 2" stroke="#7c2d12" strokeWidth="1.2" fill="none" opacity=".5" />
          <path d="M30 32c2-2 8-2 12 0" stroke="#fef3c7" strokeWidth="1" fill="none" opacity=".7" />
        </svg>
      );
    case "wrap":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M16 18l32 4v22l-32 4z" fill="#fde68a" />
          <path d="M16 18l32 4M16 44l32-4" stroke="#a16207" strokeWidth="1" />
          <path d="M22 24h22M22 30h22M22 36h22" stroke="#dc2626" strokeWidth="1.5" />
          <circle cx="26" cy="32" r="1.5" fill="#16a34a" />
          <circle cx="40" cy="28" r="1.5" fill="#16a34a" />
        </svg>
      );
    case "burrito":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M14 22l36 4-2 18-34-2z" fill="#fcd34d" />
          <path d="M14 22l36 4M14 42l34-2" stroke="#92400e" strokeWidth="1" />
          <path d="M20 28h22M20 34h20" stroke="#7c2d12" strokeWidth="1" opacity=".5" />
          <circle cx="28" cy="32" r="1.6" fill="#16a34a" />
          <circle cx="38" cy="30" r="1.4" fill="#dc2626" />
        </svg>
      );
    case "soup":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <ellipse cx="32" cy="46" rx="26" ry="4" fill="rgba(0,0,0,.15)" />
          <path d="M6 32h52c0 12-12 20-26 20S6 44 6 32z" fill="#fff" />
          <ellipse cx="32" cy="32" rx="26" ry="4" fill="#fde68a" />
          <path d="M14 32c4-2 8-2 12 0M30 32c4-2 8-2 12 0M44 32c2-1 6-1 8 0" stroke="#a16207" strokeWidth="1" fill="none" opacity=".6" />
        </svg>
      );
    case "tofu":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <rect x="14" y="22" width="14" height="14" rx="2" fill="#fef3c7" />
          <rect x="30" y="26" width="12" height="14" rx="2" fill="#fff" />
          <rect x="44" y="22" width="10" height="14" rx="2" fill="#fef3c7" />
          <path d="M10 38c4-4 10-2 14 2s10 4 14 0 10-4 16-2" stroke="#16a34a" strokeWidth="2" fill="none" />
          <circle cx="22" cy="44" r="2" fill="#16a34a" />
          <circle cx="40" cy="46" r="2" fill="#16a34a" />
        </svg>
      );
    case "hummus":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <ellipse cx="32" cy="44" rx="26" ry="4" fill="rgba(0,0,0,.12)" />
          <ellipse cx="32" cy="34" rx="26" ry="10" fill="#fef3c7" />
          <ellipse cx="32" cy="32" rx="20" ry="6" fill="#fde68a" />
          <circle cx="26" cy="30" r="1.6" fill="#a16207" />
          <circle cx="34" cy="32" r="1.4" fill="#16a34a" />
          <circle cx="40" cy="30" r="1.4" fill="#dc2626" />
        </svg>
      );
    case "sandwich":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M10 22h44v6H10z" fill="#fde68a" />
          <path d="M10 28h44v4H10z" fill="#16a34a" />
          <path d="M10 32h44v4H10z" fill="#dc2626" />
          <path d="M10 36h44v4H10z" fill="#fff" />
          <path d="M10 40h44v6H10z" fill="#fde68a" />
          <path d="M10 22h44v24H10z" fill="none" stroke="#92400e" strokeWidth="1.2" />
        </svg>
      );
    case "pasta":
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M8 32h48c0 12-10 20-24 20S8 44 8 32z" fill="#fff" />
          <ellipse cx="32" cy="32" rx="24" ry="4" fill="#fcd34d" />
          <path d="M14 30c8-3 16-3 22 0M16 32c10-2 20-2 24 1M14 34c10-3 22-3 26 0" stroke="#fbbf24" strokeWidth="1.4" fill="none" />
          <circle cx="34" cy="28" r="2.4" fill="#dc2626" />
          <circle cx="22" cy="32" r="1.6" fill="#16a34a" />
        </svg>
      );
    case "chicken":
    default:
      return (
        <svg viewBox="0 0 64 64" width={s} height={s}>
          <path d="M22 18c-6 0-10 4-10 10 0 4 2 6 4 8l-4 6 8-2 8 6 12-2 6-12c0-8-6-14-14-14z" fill="#fdba74" />
          <path d="M22 22c-2 2-4 4-4 8M30 22c-2 2-2 6-2 8" stroke="#92400e" strokeWidth="1" fill="none" opacity=".4" />
          <ellipse cx="38" cy="36" rx="10" ry="4" fill="#92400e" opacity=".25" />
        </svg>
      );
  }
}

export function RecipeIcon({
  recipeKey,
  size = 56,
  rounded = 18,
  className,
  style,
  showSheen = true,
}: {
  recipeKey: string;
  size?: number;
  rounded?: number;
  className?: string;
  style?: CSSProperties;
  showSheen?: boolean;
}) {
  const fam = familyFor(recipeKey);
  const palette = palettes[fam];
  const glyphSize = Math.round(size * 0.7);
  return (
    <span
      aria-hidden
      className={clsx("relative inline-grid place-items-center overflow-hidden", className)}
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        background: palette.gradient,
        boxShadow: `0 ${Math.round(size * 0.18)}px ${Math.round(size * 0.36)}px -${Math.round(size * 0.22)}px ${palette.shadow}, inset 0 0 0 1px rgba(255,255,255,.35)`,
        ...style,
      }}
    >
      {showSheen ? (
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(120% 80% at 80% 10%, ${palette.motif}, transparent 55%), radial-gradient(60% 50% at 10% 100%, rgba(0,0,0,.18), transparent 55%)`,
          }}
        />
      ) : null}
      <span className="relative" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,.18))" }}>
        <Glyph family={fam} size={glyphSize} />
      </span>
    </span>
  );
}

export { familyFor as recipeFamilyFor };
