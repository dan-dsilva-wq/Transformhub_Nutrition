"use client";

import { BellRing, Coffee, Droplets, Moon, Sun, Utensils } from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { Card, IconBadge, SectionHeader } from "./primitives";

const schedule: { time: string; label: string; icon: React.ReactNode; tone: "amber" | "sage" | "forest" }[] = [
  { time: "07:30", label: "Big breakfast — protein first", icon: <Sun size={16} aria-hidden />, tone: "amber" },
  { time: "11:00", label: "Water check — half a litre by lunch", icon: <Droplets size={16} aria-hidden />, tone: "sage" },
  { time: "12:30", label: "Lunch from the list", icon: <Utensils size={16} aria-hidden />, tone: "forest" },
  { time: "15:30", label: "Afternoon coffee + walk", icon: <Coffee size={16} aria-hidden />, tone: "amber" },
  { time: "19:00", label: "Dinner — keep it boring", icon: <Utensils size={16} aria-hidden />, tone: "forest" },
  { time: "21:30", label: "Wind down — log the day", icon: <Moon size={16} aria-hidden />, tone: "sage" },
];

export function RemindersScreen() {
  const { reminderState, actions } = useAppState();
  const on = reminderState === "on";

  return (
    <div className="stagger-up space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          YOU · REMINDERS
        </p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] text-ink-2">
          Six small <span className="text-forest">nudges.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          The rhythm of a normal day, set up for you.
        </p>
      </header>

      <Card>
        <div className="flex items-center gap-3">
          <IconBadge tone={on ? "forest" : "stone"}>
            <BellRing size={18} aria-hidden />
          </IconBadge>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg text-ink-2">
              Daily nudges
            </h2>
            <p className="text-xs text-muted">
              {on ? "On — six gentle prompts a day." : "Off — turn on to follow the rhythm."}
            </p>
          </div>
          <button
            type="button"
            data-tap
            onClick={() => actions.setReminderState(on ? "off" : "on")}
            aria-pressed={on}
            className={
              "relative h-7 w-12 rounded-full border transition " +
              (on ? "border-forest bg-forest" : "border-white/70 bg-white/65 backdrop-blur")
            }
          >
            <span
              className={
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition " +
                (on ? "left-[22px]" : "left-0.5")
              }
            />
          </button>
        </div>
      </Card>

      <section>
        <SectionHeader eyebrow="The day" title="Default schedule" />
        <ul className="space-y-2">
          {schedule.map((s) => (
            <li
              key={s.time}
              className="card-flat flex items-center gap-4 px-4 py-3"
            >
              <IconBadge tone={s.tone}>{s.icon}</IconBadge>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink-2">{s.label}</div>
              </div>
              <span className="numerals text-sm text-muted">{s.time}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted">
        Reminders are saved on this device only. Nothing is scheduled to a server.
      </p>
    </div>
  );
}
