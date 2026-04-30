"use client";

import { useEffect, useState } from "react";
import { Sprout, type SproutMood } from "./sprout";

const MESSAGES = [
  "Morning! Let's keep it gentle today.",
  "Hit your protein early. Easy day from here.",
  "Halfway through your week. Proud of you.",
  "Water's been napping. A glass before lunch?",
  "That breakfast looked sturdy. Nicely done.",
  "One photo, one tap. That's the whole job.",
];

/**
 * Floating mascot anchored bottom-right of the viewport.
 * Cycles a chat bubble every 18s and tilts when tapped.
 */
export function FloatingSprout({
  mood = "happy",
  size = 86,
}: {
  mood?: SproutMood;
  size?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % MESSAGES.length);
      setOpen(true);
      // auto-hide so it doesn't sit forever
      window.setTimeout(() => setOpen(false), 6000);
    }, 22000);
    // initial hide after 8s
    const h = window.setTimeout(() => setOpen(false), 8000);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(h);
    };
  }, []);

  return (
    <div className="sprout-float-anchor pointer-events-auto select-none">
      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="bubble-anim absolute right-[68px] bottom-[58px] max-w-[200px] rounded-2xl rounded-br-sm border border-white/70 bg-white/85 px-3 py-2 text-left text-[12px] leading-snug text-ink-2 shadow-elevated backdrop-blur-xl"
          aria-label="Dismiss"
        >
          <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-forest">
            Sprout
          </span>
          {MESSAGES[idx]}
        </button>
      ) : null}
      <button
        type="button"
        data-tap
        onClick={() => setOpen((o) => !o)}
        className="tap-bounce relative grid place-items-center pointer-events-auto"
        style={{ width: size, height: size }}
        aria-label="Sprout the mascot"
      >
        <Sprout size={size * 0.92} mood={mood} withPot={false} withFloat />
      </button>
    </div>
  );
}
