"use client";

import Link from "next/link";
import { Check, Lock, Play } from "lucide-react";
import { clsx } from "clsx";
import type { LessonDef } from "./lessons";

export type LessonState = "completed" | "current" | "locked" | "available";

export function LessonGridCard({
  lesson,
  state,
}: {
  lesson: LessonDef;
  state: LessonState;
}) {
  const Icon = lesson.Icon;
  const locked = state === "locked";
  const completed = state === "completed";
  const current = state === "current";

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={clsx(
            "grid h-9 w-9 place-items-center rounded-full",
            completed
              ? "bg-forest text-white"
              : current
                ? "bg-cream text-forest"
                : locked
                  ? "bg-stone-2 text-faint"
                  : "bg-cream text-forest",
          )}
          aria-hidden
        >
          <Icon size={16} />
        </span>
        <span
          className={clsx(
            "grid h-6 w-6 place-items-center rounded-full",
            completed
              ? "bg-forest/15 text-forest"
              : current
                ? "bg-forest text-white"
                : "bg-stone-2 text-faint",
          )}
          aria-hidden
        >
          {completed ? (
            <Check size={12} />
          ) : current ? (
            <Play size={11} />
          ) : locked ? (
            <Lock size={11} />
          ) : (
            <span className="text-[10px] font-medium">{lesson.index + 1}</span>
          )}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
          Lesson {lesson.index + 1}
        </p>
        <p className="mt-0.5 font-display text-base leading-tight text-ink-2">
          {lesson.shortLabel}
        </p>
      </div>
    </>
  );

  const baseClass =
    "flex h-full flex-col rounded-2xl border border-white/70 bg-white/55 p-3.5 backdrop-blur-xl transition";

  if (locked) {
    return (
      <div
        aria-disabled
        className={clsx(baseClass, "cursor-not-allowed opacity-55")}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/you/foods/learn/${lesson.id}`}
      data-tap
      className={clsx(
        baseClass,
        "tap-bounce hover:bg-white/75",
        current && "ring-2 ring-forest/30",
      )}
    >
      {content}
    </Link>
  );
}
