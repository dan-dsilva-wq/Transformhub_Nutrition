// One-off: pushes branded email templates + subjects to Supabase Auth config
// via the Management API. Requires SUPABASE_PAT env var.
//
// Usage:  node scripts/push-supabase-auth-config.mjs
//
// Reads templates from supabase/email-templates/*.html.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "kvdkfyiwwqftyahrudwt";
const PAT = process.env.SUPABASE_PAT;

if (!PAT) {
  console.error("Set SUPABASE_PAT env var to your sbp_... token.");
  process.exit(1);
}

const tplDir = resolve(__dirname, "../supabase/email-templates");
const read = (f) => readFileSync(resolve(tplDir, f), "utf8");

const body = {
  mailer_subjects_confirmation: "Confirm your Pace email",
  mailer_templates_confirmation_content: read("confirm-signup.html"),
  mailer_subjects_magic_link: "Your Pace sign-in link",
  mailer_templates_magic_link_content: read("magic-link.html"),
  mailer_subjects_recovery: "Reset your Pace password",
  mailer_templates_recovery_content: read("reset-password.html"),
  mailer_subjects_email_change: "Confirm your new Pace email",
  mailer_templates_email_change_content: read("change-email.html"),
};

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  },
);

const text = await res.text();
console.log("Status:", res.status);
console.log(text.slice(0, 1000));
if (!res.ok) process.exit(1);
console.log("\n✓ Templates and subjects pushed.");
