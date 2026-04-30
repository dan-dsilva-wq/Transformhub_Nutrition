"use client";

import { clsx } from "clsx";

export function TypingDots({ className }: { className?: string }) {
  return (
    <span
      className={clsx("inline-flex items-center gap-1 py-1", className)}
      aria-label="thinking"
      role="status"
    >
      <span
        className="block h-1.5 w-1.5 rounded-full bg-muted"
        style={{ animation: "typing-bounce 1.2s ease-in-out infinite" }}
      />
      <span
        className="block h-1.5 w-1.5 rounded-full bg-muted"
        style={{
          animation: "typing-bounce 1.2s ease-in-out infinite",
          animationDelay: "0.15s",
        }}
      />
      <span
        className="block h-1.5 w-1.5 rounded-full bg-muted"
        style={{
          animation: "typing-bounce 1.2s ease-in-out infinite",
          animationDelay: "0.3s",
        }}
      />
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}
