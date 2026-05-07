"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { clsx } from "clsx";
import {
  Home,
  Plus,
  TrendingUp,
  X,
  MessageCircle,
  Target,
  Dumbbell,
  Salad,
  BellRing,
  Activity,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { useAppState } from "@/lib/state/app-state";
import { Wordmark } from "./primitives";
import { AppTour } from "./app-tour";
import { TrialBanner } from "./trial-banner";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const tabs: NavItem[] = [
  { href: "/today", label: "Today", icon: <Home size={20} aria-hidden /> },
  { href: "/you/foods", label: "Food", icon: <Salad size={20} aria-hidden /> },
  { href: "/progress", label: "Progress", icon: <TrendingUp size={20} aria-hidden /> },
  { href: "/you/coach", label: "Coach", icon: <MessageCircle size={20} aria-hidden /> },
];

const drawerItems: NavItem[] = [
  { href: "/you/plan", label: "You & targets", icon: <Target size={18} aria-hidden /> },
  { href: "/you/workouts", label: "Workouts", icon: <Dumbbell size={18} aria-hidden /> },
  { href: "/you/reminders", label: "Reminders", icon: <BellRing size={18} aria-hidden /> },
  { href: "/you/integrations", label: "Integrations", icon: <Activity size={18} aria-hidden /> },
  { href: "/you/settings", label: "Settings", icon: <SettingsIcon size={18} aria-hidden /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { auth, profile, onboardingExtras, actions } = useAppState();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  const isCoachRoute = isActive("/you/coach");

  const initials = (() => {
    const name = onboardingExtras.name?.trim();
    if (name) {
      const parts = name.split(/\s+/);
      const first = parts[0]?.[0] ?? "";
      const second = parts[1]?.[0] ?? "";
      const combined = `${first}${second}`.toUpperCase();
      if (combined) return combined;
    }
    if (auth.kind === "signed-in" && auth.email) {
      return auth.email.slice(0, 2).toUpperCase();
    }
    return "P";
  })();

  return (
    <div className="min-h-[100dvh]">
      {/* Header — frosted dark glass over the navy canvas */}
      <header
        className="sticky top-0 z-30 border-b border-white/10 bg-[#001a26]/65 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-5">
          <Link href="/today" aria-label="Transform Hub home">
            <Wordmark size="md" />
          </Link>
          <div className="flex items-center gap-2">
            <TrialBanner />
            <button
              type="button"
              data-tap
              data-tour="drawer-trigger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12] backdrop-blur"
            >
              <span className="font-display text-sm tracking-tight">{initials}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main
        key={pathname}
        className={clsx(
          "fade-anim mx-auto max-w-md",
          isCoachRoute
            ? "flex h-[calc(100dvh_-_env(safe-area-inset-top,0px)_-_env(safe-area-inset-bottom,0px)_-_120px)] min-h-0 flex-col overflow-hidden px-5 pt-3"
            : "px-5 pt-5",
        )}
        style={{
          paddingBottom: isCoachRoute
            ? "0px"
            : "calc(env(safe-area-inset-bottom, 0px) + 96px)",
        }}
      >
        {children}
      </main>

      {/* Bottom nav — frosted dark over the navy canvas */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#001a26]/75 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Primary"
      >
        <div className="relative mx-auto grid h-16 max-w-md grid-cols-5 items-end">
          <NavTab item={tabs[0]} active={isActive(tabs[0].href)} />
          <NavTab item={tabs[1]} active={isActive(tabs[1].href)} />
          <div className="relative h-full">
            <Link
              href="/log"
              data-tap
              data-tour="log-button"
              aria-label="Log a meal"
              className={clsx(
                "absolute left-1/2 -top-5 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full",
                isActive("/log") && "ring-4 ring-forest/15",
              )}
            >
              <span
                className="tap-bounce cta-glow grid h-14 w-14 place-items-center rounded-full text-white transition border border-[#00c9ff]/45"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, #1ec0ff 0%, #00aef0 38%, #008fd0 65%, #0078b8 100%)",
                  boxShadow:
                    "0 18px 40px -10px rgba(0,143,208,0.70), 0 1px 0 rgba(255,255,255,0.45) inset, 0 -2px 6px rgba(0,40,60,0.45) inset",
                }}
              >
                <Plus size={26} strokeWidth={2.4} aria-hidden />
              </span>
            </Link>
          </div>
          <NavTab item={tabs[2]} active={isActive(tabs[2].href)} tourId="progress-tab" />
          <NavTab item={tabs[3]} active={isActive(tabs[3].href)} />
        </div>
      </nav>

      {/* "You" drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            className="fade-anim absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="sheet-anim absolute inset-y-0 right-0 w-[88%] max-w-sm overflow-y-auto border-l border-white/10 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,8,19,0.55)]"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              background:
                "linear-gradient(180deg, rgba(0,38,53,0.95) 0%, rgba(0,8,19,0.95) 100%)",
            }}
          >
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <Wordmark size="md" />
              <button
                type="button"
                data-tap
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="grid h-10 w-10 place-items-center rounded-full text-white/55 hover:bg-white/[0.08] hover:text-white"
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <div className="px-5 pt-2">
              <div className="relative overflow-hidden rounded-2xl border border-white/12 p-4 backdrop-blur-xl"
                   style={{ background: "linear-gradient(135deg, rgba(0,143,208,0.16) 0%, rgba(0,60,83,0.30) 100%)" }}>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.20em] text-[#66c8e8]">
                  {onboardingExtras.name ? `Hi, ${onboardingExtras.name}` : "Signed in"}
                </div>
                <div className="mt-1 truncate font-display text-lg text-white">
                  {auth.kind === "signed-in"
                    ? auth.email ?? "Member"
                    : auth.kind === "demo"
                      ? "Demo mode"
                      : "Not signed in"}
                </div>
                <p className="mt-1 text-xs text-white/55">
                  Goal {profile.goalWeightKg} kg · now {profile.currentWeightKg} kg
                </p>
              </div>
            </div>

            <ul className="mt-4 px-2">
              {drawerItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/85 hover:bg-white/[0.06] transition",
                      isActive(item.href) && "bg-white/[0.08] border border-white/12 text-white",
                    )}
                  >
                    <span className="text-[#66c8e8]">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-2 px-5">
              <button
                type="button"
                data-tap
                onClick={async () => {
                  setDrawerOpen(false);
                  await actions.signOut();
                  router.push("/");
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/65 hover:bg-white/[0.08] hover:text-white transition"
              >
                <LogOut size={16} aria-hidden />
                {auth.kind === "demo" ? "Reset demo data" : "Sign out"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <AppTour />
    </div>
  );
}

function NavTab({
  item,
  active,
  tourId,
}: {
  item: NavItem;
  active: boolean;
  tourId?: string;
}) {
  return (
    <Link
      href={item.href}
      data-tap
      data-tour={tourId}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex flex-col items-center gap-1 pt-2 pb-1 text-[11px] font-medium tracking-tight",
        active ? "text-ink-2" : "text-faint hover:text-muted",
      )}
    >
      <span
        className={clsx(
          "transition-transform duration-300",
          active ? "text-forest scale-110" : "scale-100",
        )}
      >
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}
