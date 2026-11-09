# Learn With Sulav platform

One Next.js app, four portals, one brand. `middleware.ts` maps the host name to a portal:

| Address | Portal | Folder |
|---|---|---|
| sulavs.com.np | Landing page | `app/sites/root` |
| agency.sulavs.com.np | Agent dashboard | `app/sites/agency` |
| exam.sulavs.com.np | Practice exam | `app/sites/exam` |
| admin.sulavs.com.np | Master admin | `app/sites/admin` |

This repository contains the application. Its `next.config.js` pins the Turbopack root to
the application directory so workspace-level lockfiles are not mistaken for its dependency root.

## Setup (about 20 minutes)

1. **Supabase**: create a project. Run `supabase/schema.sql`, then apply each file in
   `supabase/migrations` in filename order. Keep **Confirm email** enabled so password
   registrations must verify their email before signing in.
2. **Question bank**: `data/questions.json` contains 250 questions across 10 topics. Every exam selects five
   questions from each topic and shuffles their order and answer choices. To replace the bank, export a CSV with
   columns `Category, Question, Option A, Option B, Option C, Option D, Correct` to `data/NIA_Question_Bank.csv`,
   then run `npm run import:questions`. Category values must match the keys in `lib/questions.ts`; every topic
   needs at least five questions for exams to start.
3. **Environment**: copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Supabase Project Settings > API. The public publishable key is
   safe for browser use. Set `SUPABASE_SERVICE_ROLE_KEY` separately for protected server-side routes; never
   expose it to the browser or commit it. Keep all provider credentials out of Git and browser-visible
   `NEXT_PUBLIC_` variables. The Supabase helpers live in `utils/supabase/`.
4. **Use the website and app on your domain**: set `NEXT_PUBLIC_ROOT_DOMAIN=sulavs.com.np` in `.env.local` and in the Vercel Production environment. All portal links use HTTPS on the production domains. Vercel preview deployments remain available on their `vercel.app` address.
5. **Deploy**: push to GitHub, import into Vercel, and add the Supabase variables plus `NEXT_PUBLIC_ROOT_DOMAIN=sulavs.com.np`.
   In Vercel > Domains add `sulavs.com.np`, `www`, `agency`, `exam` and `admin`.
6. **Supabase Auth URLs**: set the Site URL to `https://sulavs.com.np` and allow the deployed callback URLs:
   `https://agency.sulavs.com.np/api/auth/callback` and `https://exam.sulavs.com.np/api/auth/callback`.
   Add the equivalent localhost callback during development. Add the corresponding Supabase callback
   (`https://<project-ref>.supabase.co/auth/v1/callback`) to each identity provider's console.
7. **Social sign-in**: enable Google and Facebook under Supabase Authentication > Providers. Register the
   Supabase callback URL in Google Cloud and Meta's provider consoles. TikTok and Instagram require supported
   custom OAuth/OIDC provider configurations in Supabase; the buttons remain unavailable until those provider
   credentials and redirect settings are configured.
8. **Phone OTP**: enable phone sign-in in Supabase Authentication > Providers and configure a supported SMS
   provider. WhatsApp OTP is supported only with Twilio or Twilio Verify configured in Supabase. SMS/WhatsApp
   OTP sign-in is an alternative to password sign-in; email/password registrations still require email
   confirmation. Configure provider secrets only in Supabase/Vercel secret settings, never in source control.
9. **Passkeys**: enable passkey authentication in Supabase Authentication > Passkeys. Use the relying-party
   ID `sulavs.com.np` and allow origins `https://www.sulavs.com.np`, `https://agency.sulavs.com.np`,
   and `https://exam.sulavs.com.np`. Passkeys require HTTPS and must be enabled in the browser client.
10. **Install as an app**: visit the domain in a mobile browser and choose “Add to Home Screen” or “Install app”.
   The installed app opens the same HTTPS website in standalone mode.
11. **Cloudflare**: your CNAME records already point to Vercel. If a page shows a redirect loop, set the records to
   "DNS only" (grey cloud) or set SSL/TLS mode to Full (strict).
12. **First admin**: create the admin user in Supabase Authentication > Users, then run in the SQL Editor:
   `update profiles set role = 'admin', membership = 'premium' where email = 'learnwithsulav@gmail.com';`
   Set the account password in Supabase; never put it in source code, `.env` files, or Git. Admin data and
   mutations are served through authenticated server routes; keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## Existing AMS database update

For a new Supabase project, run `supabase/schema.sql` as above, then apply the remaining files in `supabase/migrations` in filename order. For an already-running AMS database, run `supabase/upgrade-portfolios-exam-passes.sql` once, then apply any unapplied migration files in `supabase/migrations` in filename order before deploying. The exam-access migration links passes and attempts to candidate accounts, and adds the email/WhatsApp notification queue. Paid exam access requires a signed-in candidate and a paid, approved pass; configure pass pricing and payment instructions in Admin > Exam passes.

For email/SMS/WhatsApp delivery, configure the Resend and Twilio values above as needed. SMS is limited to Supabase phone OTP and payment confirmations. WhatsApp requires Meta Cloud API credentials and an approved template with one body-text variable (`{{1}}`); set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE` and `WHATSAPP_API_VERSION` in the deployment environment. WhatsApp is queued only for users who opted in, and email remains the default for notifications.

Company-specific TDI and BDI layer rates can be edited or deleted in Admin > Configuration. Deleting a company rule returns calculations to the configured system defaults in `lib/rules.ts`; the BDI percentages remain editable values rather than a new formula.

## Portal dashboards

Agency, admin, and exam dashboards use grouped, expandable side navigation with the signed-in user's name and profile photo. The daily announcement strip appears above the portal header. Charts reflect records available to each account; admin tables indicate when a large dataset is only partially loaded.

## Things to adjust

- `lib/brand.ts`: exam length, pass percentage, links, contact details.
- `lib/rules.ts`: plan descriptions, weighted premium table, TDI/BDI layer rates.
- `public/certificate-template.jpg`: certificate artwork. Field positions are in `components/exam/certificate.ts`.
- Premium access: Admin > Agents > Membership. Free members get Leads and Plans; premium adds TDI/BDI and Monthly scheme.

`info@sulavs.com.np` is a sender address, not a mailbox. A login inbox requires separate email hosting;
Cloudflare Email Routing and Resend alone do not provide an inbox.
