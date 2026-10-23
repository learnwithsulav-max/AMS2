# Learn With Sulav platform

One Next.js app, four portals, one brand. `middleware.ts` maps the host name to a portal:

| Address | Portal | Folder |
|---|---|---|
| sulavs.com.np | Landing page | `app/sites/root` |
| agency.sulavs.com.np | Agent dashboard | `app/sites/agency` |
| exam.sulavs.com.np | Practice exam | `app/sites/exam` |
| admin.sulavs.com.np | Master admin | `app/sites/admin` |

The app lives in `lsw-platform/lsw` in this workspace. Its `next.config.js` pins the
Turbopack root to this directory so the separate workspace-level lockfile is not mistaken
for the app's dependency root.

## Setup (about 20 minutes)

1. **Supabase**: create a free project. SQL Editor > paste `supabase/schema.sql` > Run.
   Authentication > Providers > Email: turn off "Confirm email" so agents can log in right after registering.
2. **Question bank**: `data/questions.json` contains 250 questions across 10 topics. Every exam selects five
   questions from each topic and shuffles their order and answer choices. To replace the bank, export a CSV with
   columns `Category, Question, Option A, Option B, Option C, Option D, Correct` to `data/NIA_Question_Bank.csv`,
   then run `npm run import:questions`. Category values must match the keys in `lib/questions.ts`; every topic
   needs at least five questions for exams to start.
3. **Environment**: configure `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Supabase Project Settings > API. The public publishable key is
   safe for browser use. Set `SUPABASE_SERVICE_ROLE_KEY` separately for the protected server-side admin and exam
   APIs; never expose it to the browser or commit it. The Supabase helpers live in `utils/supabase/`.
4. **Run locally**: `npm run dev`, then open `localhost:3000` (landing), `exam.localhost:3000`,
   `agency.localhost:3000`, `admin.localhost:3000`. Set `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000` for local links.
5. **Deploy**: push to GitHub, import into Vercel, add the same env variables (with `NEXT_PUBLIC_ROOT_DOMAIN=sulavs.com.np`).
   In Vercel > Domains add `sulavs.com.np`, `www`, `agency`, `exam` and `admin`.
6. **Cloudflare**: your CNAME records already point to Vercel. If a page shows a redirect loop, set the records to
   "DNS only" (grey cloud) or set SSL/TLS mode to Full (strict).
7. **First admin**: create the admin user in Supabase Authentication > Users, then run in the SQL Editor:
   `update profiles set role = 'admin', membership = 'premium' where email = 'learnwithsulav@gmail.com';`
   Set the account password in Supabase; never put it in source code, `.env` files, or Git. Admin data and
   mutations are served through authenticated server routes; keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## Things to adjust

- `lib/brand.ts`: exam length, pass percentage, links, contact details.
- `lib/rules.ts`: plan descriptions, weighted premium table, TDI/BDI layer rates.
- `public/certificate-template.jpg`: certificate artwork. Field positions are in `components/exam/certificate.ts`.
- Premium access: Admin > Agents > Membership. Free members get Leads and Plans; premium adds TDI/BDI and Monthly scheme.

## Product specification

The four portals are an existing functional prototype, not yet the complete SaaS described
in the Learn With Sulav master architecture. Continue implementation in staged increments:
shared security and domain foundations first, then the public gateway and agent portfolios,
agency workflows, paid exam passes, and SuperAdmin operations. Do not expose sensitive
profile fields through public portfolio queries; add public-facing profile data in a separate
RLS-protected surface.
