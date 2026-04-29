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
  Apple,
  Salad,
  BellRing,
  Activity,
  Menu,
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
];

const drawerItems: NavItem[] = [
  { href: "/you/coach", label: "Coach", icon: <MessageCircle size={18} aria-hidden /> },
  { href: "/you/plan", label: "Plan & targets", icon: <Target size={18} aria-hidden /> },
  { href: "/you/workouts", label: "Workouts", icon: <Dumbbell size={18} aria-hidden /> },
  { href: "/you/foods", label: "Food guide", icon: <Apple size={18} aria-hidden /> },
  { href: "/you/reminders", label: "Reminders", icon: <BellRing size={18} aria-hidden /> },
  { href: "/you/integrations", label: "Integrations", icon: <Activity size={18} aria-hidden /> },
  { href: "/you/settings", label: "Settings", icon: <SettingsIcon size={18} aria-hidden /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { auth, profile, actions } = useAppState();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initials = (() => {
    if (auth.kind === "signed-in" && auth.email) {
      return auth.email.slice(0, 2).toUpperCase();
    }
    if (profile.sexForCalories === "male") return "P";
    return "P";
  })();

  return (
    <div className="min-h-[100dvh]">
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-white/60 bg-white/40 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-5">
          <Link href="/today" aria-label="Pace home">
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
              className="grid h-10 w-10 place-items-center rounded-full bg-white/60 text-ink-2 hover:bg-white/80 border border-white/70 backdrop-blur"
            >
              <span className="font-display text-sm tracking-tight">{initials}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main
        key={pathname}
        className="fade-anim mx-auto max-w-md px-5 pt-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
      >
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-white/55 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Primary"
      >
        <div className="relative mx-auto grid h-16 max-w-md grid-cols-5 items-end">
          <NavTab item={tabs[0]} active={isActive(tabs[0].href)} />
          <NavTab item={tabs[1]} active={isActive(tabs[1].href)} />
          <span aria-hidden />
          <NavTab item={tabs[2]} active={isActive(tabs[2].href)} tourId="progress-tab" />
          <NavButton
            label="You"
            icon={<Menu size={20} aria-hidden />}
            onClick={() => setDrawerOpen(true)}
            active={drawerOpen}
          />
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
            <span className="tap-bounce cta-glow grid h-14 w-14 place-items-center rounded-full bg-forest text-white shadow-elevated transition">
              <Plus size={26} strokeWidth={2.4} aria-hidden />
            </span>
          </Link>
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
            className="sheet-anim absolute inset-y-0 right-0 w-[88%] max-w-sm overflow-y-auto bg-white/80 shadow-elevated backdrop-blur-2xl border-l border-white/70"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <Wordmark size="md" />
              <button
                type="button"
                data-tap
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-white/60 hover:text-ink"
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <div className="px-5 pt-2">
              <div className="rounded-2xl border border-white/70 bg-white/55 backdrop-blur-xl p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                  Signed in
                </div>
                <div className="mt-1 truncate font-display text-lg text-ink-2">
                  {auth.kind === "signed-in"
                    ? auth.email ?? "Member"
                    : auth.kind === "demo"
                      ? "Demo mode"
                      : "Not signed in"}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Goal {profile.goalWeightKg} kg · current {profile.currentWeightKg} kg
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
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-ink-2 hover:bg-white/60 transition",
                      isActive(item.href) && "bg-white/70 border border-white/70",
                    )}
                  >
                    <span className="text-muted">{item.icon}</span>
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
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/70 bg-white/55 backdrop-blur-xl px-4 py-3 text-sm font-medium text-muted hover:bg-white/75 hover:text-ink transition"
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

function NavButton({
  label,
  icon,
  onClick,
  active,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      data-tap
      onClick={onClick}
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
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
