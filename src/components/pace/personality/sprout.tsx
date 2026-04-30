"use client";

import { clsx } from "clsx";

export type SproutMood = "happy" | "calm" | "concerned" | "sleepy" | "proud";

export function Sprout({
  size = 96,
  mood = "calm",
  className,
  withPot = true,
  withFloat = true,
}: {
  size?: number;
  mood?: SproutMood;
  className?: string;
  withPot?: boolean;
  withFloat?: boolean;
}) {
  const mouth = mouthPath(mood);
  const eyeShape = eyeFor(mood);

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={size * (240 / 200)}
      className={clsx(withFloat && "sprout-float", className)}
      style={{ filter: "drop-shadow(0 12px 22px rgba(13,148,136,0.16))" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="sproutPot" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c89372" />
          <stop offset="100%" stopColor="#8e5e44" />
        </linearGradient>
        <linearGradient id="sproutLeaf" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#86d39b" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="sproutBody" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#9be0a8" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <radialGradient id="sproutCheek" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#f3a8c0" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f3a8c0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {withPot ? (
        <>
          <path
            d="M50 200 L150 200 L142 232 Q142 240 134 240 L66 240 Q58 240 58 232 Z"
            fill="url(#sproutPot)"
          />
          <ellipse cx="100" cy="200" rx="50" ry="6" fill="#3a2818" />
          <rect x="46" y="194" width="108" height="10" rx="2" fill="#a87a5a" />
        </>
      ) : null}

      {/* left leaf */}
      <g className="sprout-sway-rev">
        <path
          d="M100 130 Q60 120 50 90 Q70 100 96 120 Z"
          fill="url(#sproutLeaf)"
        />
        <path
          d="M100 130 Q70 120 56 96"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1.4"
          fill="none"
        />
      </g>
      {/* right leaf */}
      <g className="sprout-sway">
        <path
          d="M100 138 Q140 130 152 102 Q132 110 105 130 Z"
          fill="url(#sproutLeaf)"
        />
        <path
          d="M100 138 Q130 130 148 108"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1.4"
          fill="none"
        />
      </g>

      {/* body / face */}
      <ellipse cx="100" cy="100" rx="56" ry="52" fill="url(#sproutBody)" />
      <ellipse
        cx="78"
        cy="80"
        rx="22"
        ry="14"
        fill="rgba(255,255,255,0.18)"
      />

      {/* cheeks */}
      <ellipse cx="68" cy="112" rx="11" ry="6" fill="url(#sproutCheek)" />
      <ellipse cx="132" cy="112" rx="11" ry="6" fill="url(#sproutCheek)" />

      {/* eyes */}
      {eyeShape === "round" ? (
        <>
          <g className="sprout-blink-anim">
            <ellipse cx="82" cy="96" rx="6" ry="8" fill="#0f1714" />
            <ellipse cx="84" cy="92" rx="2" ry="3" fill="#fff" />
          </g>
          <g className="sprout-blink-anim">
            <ellipse cx="118" cy="96" rx="6" ry="8" fill="#0f1714" />
            <ellipse cx="120" cy="92" rx="2" ry="3" fill="#fff" />
          </g>
        </>
      ) : eyeShape === "happy" ? (
        <>
          <path
            d="M76 96 Q82 90 88 96"
            stroke="#0f1714"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M112 96 Q118 90 124 96"
            stroke="#0f1714"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : eyeShape === "sleepy" ? (
        <>
          <path
            d="M76 96 Q82 99 88 96"
            stroke="#0f1714"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M112 96 Q118 99 124 96"
            stroke="#0f1714"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        // concerned: slightly tilted
        <>
          <ellipse cx="82" cy="96" rx="5" ry="7" fill="#0f1714" />
          <ellipse cx="118" cy="96" rx="5" ry="7" fill="#0f1714" />
          <path
            d="M72 86 L92 90"
            stroke="#0f1714"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M128 90 L108 86"
            stroke="#0f1714"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      {/* mouth */}
      <path
        d={mouth}
        stroke="#0f1714"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill={mood === "happy" || mood === "proud" ? "#0f1714" : "none"}
      />

      {/* top sprig */}
      <path
        d="M100 50 Q96 32 88 26 Q98 30 100 44 Q102 30 112 26 Q104 32 100 50 Z"
        fill="url(#sproutLeaf)"
      />
    </svg>
  );
}

function mouthPath(mood: SproutMood) {
  switch (mood) {
    case "happy":
      return "M86 116 Q100 134 114 116 Q100 124 86 116 Z";
    case "proud":
      return "M88 116 Q100 132 112 116 Q100 122 88 116 Z";
    case "concerned":
      return "M90 122 Q100 116 110 122";
    case "sleepy":
      return "M92 122 Q100 124 108 122";
    case "calm":
    default:
      return "M88 118 Q100 130 112 118";
  }
}

function eyeFor(mood: SproutMood): "round" | "happy" | "sleepy" | "concerned" {
  switch (mood) {
    case "happy":
    case "proud":
      return "happy";
    case "sleepy":
      return "sleepy";
    case "concerned":
      return "concerned";
    default:
      return "round";
  }
}

/* Compact head-only avatar for chat / small contexts */
export function SproutAvatar({
  size = 36,
  mood = "calm",
  className,
}: {
  size?: number;
  mood?: SproutMood;
  className?: string;
}) {
  const eyeShape = eyeFor(mood);
  return (
    <svg
      viewBox="0 0 60 60"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="sproutAvatarBody" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#9be0a8" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="32" r="26" fill="url(#sproutAvatarBody)" />
      <ellipse cx="30" cy="22" rx="14" ry="3" fill="rgba(255,255,255,0.2)" />
      {eyeShape === "round" ? (
        <>
          <ellipse cx="22" cy="30" rx="3" ry="4" fill="#0f1714" />
          <ellipse cx="38" cy="30" rx="3" ry="4" fill="#0f1714" />
          <ellipse cx="23" cy="28.5" rx="0.9" ry="1.2" fill="#fff" />
          <ellipse cx="39" cy="28.5" rx="0.9" ry="1.2" fill="#fff" />
        </>
      ) : (
        <>
          <path
            d="M19 30 Q22 27 25 30"
            stroke="#0f1714"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M35 30 Q38 27 41 30"
            stroke="#0f1714"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
      <path
        d="M22 40 Q30 46 38 40"
        stroke="#0f1714"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* sprig */}
      <path
        d="M30 8 Q26 0 20 -2 Q26 2 30 8 Q34 2 40 -2 Q34 0 30 8 Z"
        fill="#0d9488"
        transform="translate(0,4)"
      />
    </svg>
  );
}
