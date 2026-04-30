"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import { Sprout } from "./sprout";
import type { SproutMood } from "./sprout";

export type DayPart = "dawn" | "morning" | "noon" | "afternoon" | "dusk" | "night";

export function getDayPart(date = new Date()): DayPart {
  const h = date.getHours();
  if (h < 6) return "night";
  if (h < 8) return "dawn";
  if (h < 11) return "morning";
  if (h < 14) return "noon";
  if (h < 17) return "afternoon";
  if (h < 20) return "dusk";
  return "night";
}

const palette: Record<
  DayPart,
  { bg: string; sun: string; sunBg: string; text: string; subtle: string; mood: SproutMood }
> = {
  dawn: {
    bg: "linear-gradient(180deg, #f6c875 0%, #e29bb5 50%, #d6e8f0 100%)",
    sun: "9%, 65%",
    sunBg: "radial-gradient(circle, #fff5d8, #f3b04a)",
    text: "#3a2233",
    subtle: "rgba(58,34,51,0.7)",
    mood: "sleepy",
  },
  morning: {
    bg: "linear-gradient(180deg, #cfe9f8 0%, #e7f0e2 50%, #f7f3ec 100%)",
    sun: "20%, 28%",
    sunBg: "radial-gradient(circle, #fff5d8, #f3b04a)",
    text: "#0f1714",
    subtle: "rgba(91,104,99,0.95)",
    mood: "calm",
  },
  noon: {
    bg: "linear-gradient(180deg, #b8dbef 0%, #e9f2e8 60%, #fbfaf6 100%)",
    sun: "50%, 12%",
    sunBg: "radial-gradient(circle, #fff5d8, #f3b04a)",
    text: "#0f1714",
    subtle: "rgba(91,104,99,0.95)",
    mood: "happy",
  },
  afternoon: {
    bg: "linear-gradient(180deg, #ffd7a0 0%, #ffe8cc 50%, #fbfaf6 100%)",
    sun: "72%, 22%",
    sunBg: "radial-gradient(circle, #fff5d8, #f59e0b)",
    text: "#0f1714",
    subtle: "rgba(91,104,99,0.95)",
    mood: "calm",
  },
  dusk: {
    bg: "linear-gradient(180deg, #5a4373 0%, #c46e5a 60%, #f3b04a 100%)",
    sun: "82%, 62%",
    sunBg: "radial-gradient(circle, #ffd24a, #c4527c)",
    text: "#fdf2e7",
    subtle: "rgba(253,242,231,0.85)",
    mood: "calm",
  },
  night: {
    bg: "linear-gradient(180deg, #0e1429 0%, #1a2540 50%, #2a3b5c 100%)",
    sun: "82%, 22%",
    sunBg: "radial-gradient(circle, #f7f3ec, #c8def0)",
    text: "#f7f3ec",
    subtle: "rgba(247,243,236,0.7)",
    mood: "sleepy",
  },
};

export function DayCycleHeader({
  greeting,
  title,
  subtitle,
  showSprout = true,
  className,
}: {
  /** Override the auto-greeting. */
  greeting?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  showSprout?: boolean;
  className?: string;
}) {
  const part = useMemo(() => getDayPart(), []);
  const tone = palette[part];
  const autoGreet = greeting ?? defaultGreeting(part);
  const [sunX, sunY] = tone.sun.split(",").map((s) => s.trim());

  return (
    <div
      className={clsx(
        "relative -mx-5 mb-1 overflow-hidden",
        "rounded-b-[36px] px-5 pt-3 pb-5",
        className,
      )}
      style={{ background: tone.bg, color: tone.text }}
      data-tour="today-header"
    >
      {/* sun / moon */}
      <div
        className="sun-pulse-anim pointer-events-none absolute"
        style={{
          left: sunX,
          top: sunY,
          width: 90,
          height: 90,
          background: tone.sunBg,
          borderRadius: "50%",
          filter: part === "night" ? "blur(0.5px)" : "blur(2px)",
          opacity: part === "night" ? 0.85 : 0.95,
        }}
        aria-hidden
      />
      {/* clouds (only daytime) */}
      {part !== "night" && part !== "dusk" ? (
        <>
          <div
            className="cloud-anim pointer-events-none absolute rounded-full"
            style={{
              top: 28,
              left: "-30%",
              width: 140,
              height: 28,
              background: "rgba(255,255,255,0.55)",
              filter: "blur(8px)",
              opacity: 0.7,
              "--cloud-dur": "60s",
            } as React.CSSProperties}
            aria-hidden
          />
          <div
            className="cloud-anim pointer-events-none absolute rounded-full"
            style={{
              top: 76,
              left: "-50%",
              width: 200,
              height: 36,
              background: "rgba(255,255,255,0.45)",
              filter: "blur(10px)",
              opacity: 0.55,
              animationDelay: "-22s",
              "--cloud-dur": "82s",
            } as React.CSSProperties}
            aria-hidden
          />
        </>
      ) : (
        // stars at night
        <>
          {[20, 35, 55, 70, 85].map((x, i) => (
            <span
              key={i}
              className="pointer-events-none absolute rounded-full bg-white"
              style={{
                left: `${x}%`,
                top: `${10 + (i % 3) * 12}%`,
                width: 2,
                height: 2,
                opacity: 0.85,
                boxShadow: "0 0 6px rgba(255,255,255,0.7)",
              }}
              aria-hidden
            />
          ))}
        </>
      )}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-medium uppercase tracking-[0.22em]"
            style={{ color: tone.subtle }}
          >
            {autoGreet}
          </p>
          <h1
            className="font-display mt-2 text-[34px] leading-[1.05]"
            style={{ color: tone.text }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm" style={{ color: tone.subtle }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {showSprout ? (
          <div className="shrink-0" style={{ marginTop: -4 }}>
            <Sprout size={92} mood={tone.mood} withPot={false} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function defaultGreeting(part: DayPart) {
  switch (part) {
    case "dawn":
      return "EARLY START";
    case "morning":
      return "GOOD MORNING";
    case "noon":
      return "MIDDAY";
    case "afternoon":
      return "AFTERNOON";
    case "dusk":
      return "EVENING";
    case "night":
      return "LATE NIGHT";
  }
}
