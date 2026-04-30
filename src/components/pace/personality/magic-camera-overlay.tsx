"use client";

import { clsx } from "clsx";

export function MagicCameraOverlay({
  active,
  label,
  className,
}: {
  active: boolean;
  label?: string;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div className={clsx("pointer-events-none absolute inset-0", className)} aria-hidden>
      {/* scan line */}
      <div
        className="scan-anim absolute left-0 right-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--color-forest), transparent)",
          boxShadow: "0 0 12px var(--color-forest)",
        }}
      />
      {/* corner brackets */}
      <Corner placement="tl" />
      <Corner placement="tr" />
      <Corner placement="bl" />
      <Corner placement="br" />
      {label ? (
        <span
          className="tag-fade-anim absolute left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-ink-2 backdrop-blur"
          style={{ bottom: 16 }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

function Corner({ placement }: { placement: "tl" | "tr" | "bl" | "br" }) {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 32,
    height: 32,
    border: "3px solid var(--color-amber)",
    boxShadow: "0 0 14px rgba(245,158,11,0.85)",
    borderRadius: 4,
  };
  if (placement === "tl") {
    base.top = "30%";
    base.left = "22%";
    base.borderRight = "none";
    base.borderBottom = "none";
  } else if (placement === "tr") {
    base.top = "30%";
    base.right = "22%";
    base.borderLeft = "none";
    base.borderBottom = "none";
  } else if (placement === "bl") {
    base.bottom = "30%";
    base.left = "22%";
    base.borderRight = "none";
    base.borderTop = "none";
  } else {
    base.bottom = "30%";
    base.right = "22%";
    base.borderLeft = "none";
    base.borderTop = "none";
  }
  const delay =
    placement === "tl"
      ? "0s"
      : placement === "tr"
        ? "0.1s"
        : placement === "bl"
          ? "0.2s"
          : "0.3s";
  return <div className="corner-anim" style={{ ...base, animationDelay: delay }} />;
}
