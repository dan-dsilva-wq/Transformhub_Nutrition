# Auth email + OAuth branding setup

Project ref: `kvdkfyiwwqftyahrudwt`
Support email: `vxvo.admin@gmail.com`

The two complaints — "the email looks fake" and "the Google screen says `kvdkfy…supabase.co`" — are both fixed by dashboard config, not code. Steps below, in priority order.

---

## 1. Custom SMTP (kills the "fake email" feeling) — 15 min

The default Supabase sender is `noreply@mail.app.supabase.io`, which is rate-limited and trips spam filters.

**Use Resend** (easiest free option, 3 000 emails/month free):

1. Sign up at https://resend.com using `vxvo.admin@gmail.com`.
2. Add a domain you own (e.g. `pace.app` or whatever you have). Resend gives you DNS records — add them at your registrar (TXT for SPF, CNAMEs for DKIM). Wait for verification (~5 min).
3. Create an API key. Note: `re_…`.
4. In Supabase: https://supabase.com/dashboard/project/kvdkfyiwwqftyahrudwt/settings/auth → scroll to **SMTP Settings** → **Enable Custom SMTP**.
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: your Resend API key
   - Sender email: `noreply@<your-domain>` (must match a verified Resend domain)
   - Sender name: `Pace`
5. Click **Save**, then hit **Send test email** to confirm.

If you don't own a domain yet, buy one (Cloudflare, Namecheap ~£8/yr) — without one, custom SMTP can't work.

---

## 2. Branded email templates — 5 min

I've written four templates in this folder:

- `confirm-signup.html`
- `magic-link.html`
- `reset-password.html`
- `change-email.html`

For each one, paste it into the matching Supabase template:

https://supabase.com/dashboard/project/kvdkfyiwwqftyahrudwt/auth/templates

| Supabase template          | File                  | Suggested subject                     |
| -------------------------- | --------------------- | ------------------------------------- |
| Confirm signup             | `confirm-signup.html` | `Confirm your Pace email`             |
| Magic Link                 | `magic-link.html`     | `Your Pace sign-in link`              |
| Reset Password             | `reset-password.html` | `Reset your Pace password`            |
| Change Email Address       | `change-email.html`   | `Confirm your new Pace email`         |

The templates use Pace's mint/teal palette and `{{ .ConfirmationURL }}` / `{{ .Email }}` / `{{ .NewEmail }}` variables that Supabase already supports.

---

## 3. Google OAuth consent screen (kills the `kvdkfy…supabase.co` shadiness) — 10 min

The shady-looking URL on the Google sign-in screen comes from two places: the OAuth consent screen branding, and the redirect domain. Polish the consent screen first — that alone removes the "what is this" feeling.

1. Open https://console.cloud.google.com/apis/credentials/consent (signed in as `vxvo.admin@gmail.com`, in the project that owns the OAuth client used by Supabase).
2. **Edit App** and set:
   - **App name**: `Pace`
   - **User support email**: `vxvo.admin@gmail.com`
   - **App logo**: upload a 120×120 PNG of the Pace launcher icon (`android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` works).
   - **Application home page**: your marketing URL (or `https://kvdkfyiwwqftyahrudwt.supabase.co` as a placeholder).
   - **Application privacy policy link** + **Terms of service**: required for verification — add public URLs even if simple.
   - **Authorized domains**: add `supabase.co` (and your custom auth domain once step 4 below is done).
   - **Developer contact**: `vxvo.admin@gmail.com`.
3. Save. The consent screen will now read **"Sign in to Pace"** with the Pace logo, and the supabase URL becomes a small "to continue to kvdkfy…supabase.co" line that most users skim past.
4. If you're still in **Testing** mode, click **Publish App** → **In production**. Google may require verification (a few days) since you're using sensitive scopes. Until then, only test users can sign in.

---

## 4. (Optional, $10/mo) Custom auth domain — fully removes `supabase.co`

Only needed if step 3 alone isn't enough. Requires the **Pro plan**.

1. https://supabase.com/dashboard/project/kvdkfyiwwqftyahrudwt/settings/general → **Custom Domains** → add e.g. `auth.pace.app`.
2. Add the CNAME record Supabase shows you. Wait for verification.
3. In Google Cloud → OAuth credentials → Edit your Web client → **Authorized redirect URIs**: add `https://auth.pace.app/auth/v1/callback` (keep the old supabase.co one until everything is verified working).
4. In Supabase Auth settings, set **Site URL** to your custom domain.
5. The Google consent screen now shows `auth.pace.app` instead of `kvdkfyiwwqftyahrudwt.supabase.co`.

---

## What I couldn't do from here

The keys file has the anon + service_role keys, which only let me hit the data API. The Supabase **Management API** (which would let me apply SMTP config and templates programmatically) needs a Personal Access Token from https://supabase.com/dashboard/account/tokens — that's not in the file. Same for Google Cloud — those changes are dashboard-only.

If you generate a PAT (Supabase → Account → Access Tokens) and drop it into the keys file, I can write a script that pushes the templates into the project automatically next session.
