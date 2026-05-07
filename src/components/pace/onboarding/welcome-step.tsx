"use client";

import { ArrowRight, Activity, Target, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button, BrandMark } from "../primitives";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative flex h-full flex-col">
      {/* Ambient mark behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-8 z-0 opacity-[0.07] brand-spin-slow"
      >
        <BrandMark size={420} color="cyan" strokeWidth={5} />
      </div>

      <div className="relative z-10 mt-6 flex items-center gap-3">
        <BrandMark size={56} color="cyan" strokeWidth={8} className="float-anim" />
        <span className="font-eyebrow text-white/55">
          Performance Nutrition
        </span>
      </div>

      <div className="relative z-10 mt-8">
        <h1 className="font-display text-[44px] leading-[1.02] text-white">
          Build a body that{" "}
          <span className="italic" style={{ color: "#00aef0" }}>
            holds the work
          </span>
          .
        </h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-white/65">
          Engineered tracking for high performers. Two minutes from now,
          you&apos;ll have numbers that fit the body you&apos;re building and the
          life you actually live.
        </p>
      </div>

      <ul className="relative z-10 mt-10 space-y-3.5">
        <Bullet icon={<Target size={18} />}>A daily target built from your numbers.</Bullet>
        <Bullet icon={<Activity size={18} />}>Three habits that move the needle.</Bullet>
        <Bullet icon={<Sparkles size={18} />}>A coach that supports without nagging.</Bullet>
      </ul>

      <div className="relative z-10 mt-auto pt-10">
        <Button onClick={onNext} size="lg" fullWidth className="cyan-halo">
          Begin <ArrowRight size={18} />
        </Button>
        <p className="mt-3 text-center text-[11px] uppercase tracking-[0.22em] text-white/35">
          Takes about 2 minutes
        </p>
      </div>
    </div>
  );
}

function Bullet({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[14.5px] text-white/85">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#00aef0]"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,143,208,0.20) 0%, rgba(0,60,83,0.40) 100%)",
          border: "1px solid rgba(0,174,240,0.28)",
        }}
      >
        {icon}
      </span>
      <span className="pt-1">{children}</span>
    </li>
  );
}
