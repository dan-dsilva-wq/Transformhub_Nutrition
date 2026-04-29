import type { Metadata } from "next";
import { DeleteAccountForm } from "./delete-account-form";

export const metadata: Metadata = {
  title: "Delete your Pace account",
  description:
    "Permanently delete your Pace account and all associated data, including profile, meals, weights, photos, and chat history.",
};

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
          Pace · Account deletion
        </p>
        <h1 className="font-display text-[36px] leading-[1.05] text-ink-2">
          Delete your account
        </h1>
        <p className="text-sm text-muted">
          This page lets you permanently delete your Pace account from any
          browser. Most users find it easier to use{" "}
          <strong>Settings → Delete account</strong> inside the app, but this
          flow exists so you can still close your account if you no longer have
          the app installed.
        </p>
      </header>

      <section className="rounded-2xl border border-hairline bg-paper p-5 text-sm text-ink-2">
        <h2 className="text-base font-semibold text-ink">What gets deleted</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Your sign-in (email + password)</li>
          <li>
            Your profile (age, sex, height, current and goal weight, activity
            level, dietary preferences)
          </li>
          <li>All meal logs, photos, hydration, steps, weights, and check-ins</li>
          <li>Coach chat history and any AI-generated nutrition plan</li>
          <li>Any uploaded progress photos</li>
        </ul>
        <p className="mt-3 text-sm text-muted">
          Deletion is immediate and cannot be undone. Anonymous, aggregated
          analytics that contain no personal identifiers may be retained.
        </p>
      </section>

      <DeleteAccountForm />

      <section className="text-xs text-faint">
        <p>
          Need help? Email{" "}
          <a
            className="underline underline-offset-4 hover:text-muted"
            href="mailto:vxvo.admin@gmail.com"
          >
            vxvo.admin@gmail.com
          </a>{" "}
          from the address on your account and we&apos;ll process the deletion
          within 30 days.
        </p>
      </section>
    </main>
  );
}
