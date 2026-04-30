"use client";

import { useRef, useState } from "react";

const DEFAULT_STICKERS = ["💪", "🔥", "🥗", "🎉", "☀️"];

export function StickerFlick({
  stickers = DEFAULT_STICKERS,
  className,
}: {
  stickers?: string[];
  className?: string;
}) {
  const [flying, setFlying] = useState<
    { id: number; emoji: string; left: number; top: number; fx: number }[]
  >([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(0);

  function flick(e: React.MouseEvent | React.PointerEvent, emoji: string) {
    if (!stageRef.current) return;
    const stageRect = stageRef.current.getBoundingClientRect();
    const target = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = ++idRef.current;
    const left = target.left - stageRect.left;
    const top = target.top - stageRect.top;
    // Deterministic-ish horizontal drift so each click feels different
    // without calling Math.random during render-adjacent paths.
    const fx = ((id * 37) % 161) - 80;
    setFlying((prev) => [...prev, { id, emoji, left, top, fx }]);
    window.setTimeout(() => {
      setFlying((prev) => prev.filter((p) => p.id !== id));
    }, 1300);
  }

  return (
    <div ref={stageRef} className={"relative " + (className ?? "")}>
      <div className="flex flex-wrap gap-2 justify-center">
        {stickers.map((emoji) => (
          <button
            key={emoji}
            type="button"
            data-tap
            onClick={(e) => flick(e, emoji)}
            className="tap-bounce grid h-12 w-12 place-items-center rounded-full bg-white text-2xl shadow-sm border border-white/70 transition-transform hover:-translate-y-1 hover:rotate-[-6deg]"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      {flying.map((f) => (
        <span
          key={f.id}
          className="sticker-fly-anim pointer-events-none absolute grid h-12 w-12 place-items-center rounded-full bg-white text-2xl shadow-sm border border-white/70"
          style={
            {
              left: f.left,
              top: f.top,
              "--fx": `${f.fx}px`,
            } as React.CSSProperties
          }
          aria-hidden
        >
          {f.emoji}
        </span>
      ))}
    </div>
  );
}
