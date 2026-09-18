# Nics and Dan's Cub

A private pregnancy companion for Dani and Nico — a mobile-first PWA built with
Next.js, Supabase and Tailwind.

> **This app offers general information, not medical advice. Always follow
> Dra. Villafria's guidance. In an emergency, go to the Makati Med ER.**

## Status

Milestone 1 of 8 is complete: scaffold, theme, PWA shell, Supabase auth,
household and invite flow, onboarding, and the dating maths with unit tests.
The Week / Log / Memories / More tabs are navigable placeholders until their
milestones land.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase keys
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | Typecheck, lint and tests together |
| `npm run icons` | Regenerates the PWA icon set from source |

The app is pinned to webpack (`next build --webpack`) because Serwist, which
builds the service worker, does not yet support Turbopack.

## Environment variables

| Variable | Where it comes from | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Safe to expose; RLS is what protects the data |
| `NEXT_PUBLIC_SITE_URL` | Your deployed origin | Used to build magic-link callbacks in production |

No other secrets are needed. Never add the service-role key to this app — it
bypasses RLS entirely.

## Database setup

Run the migrations in order against your Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste `supabase/migrations/*.sql` into the SQL editor in filename order.

| Migration | Contents |
| --- | --- |
| `0001_core.sql` | Households, profiles, invites, pregnancy; RLS; the join/create household functions |
| `0002_tracking.sql` | Logs, memories, appointments, trips, expenses, milestones, checklists; RLS |
| `0003_storage.sql` | Private `memories` and `thumbnails` buckets and their policies |

### How the access model works

Every table is scoped by `household_id`, and every table has RLS. Policies all
reduce to one comparison against `current_household_id()`, a `SECURITY DEFINER`
function that looks up the caller's household.

Two details are worth knowing before changing anything here:

- **Membership cannot be self-assigned.** RLS lets you update your own profile
  row, which on its own would let anyone write another household's UUID into it
  and read that family's entire history. A trigger
  (`guard_profile_household_change`) blocks any change to `household_id` that
  does not come from `create_household_and_join()` or
  `join_household_with_token()`.
- **`0002` fails the migration if any public table lacks RLS.** That check is
  what keeps the guarantee true as the schema grows.

There is no seed script yet; the guide content pipeline arrives in M2.

## Dating maths

`src/lib/pregnancy.ts` is the single source of truth. Gestational age is
`280 − (EDD − today)`, evaluated on Manila calendar dates, plus a per-pregnancy
`dating_offset_days`.

That offset currently defaults to **2**, which is what makes 2026-09-16 read as
**Week 4, Day 5** against an EDD of 2027-05-23. Worth knowing:

- The bare 280-day subtraction gives **Week 4, Day 3** for that date.
- The offset is also how a dating-scan correction gets applied, so it is not
  dead weight — it is editable per pregnancy.
- One consequence is visible in the tests: the bare count places conception on
  **30 Aug 2026**, in the middle of the window the couple recall, while the
  offset moves it to **28 Aug**, just outside it. If Dra. Villafria confirms the
  later window at the dating scan, set `DEFAULT_DATING_OFFSET_DAYS` to `0`.

## Deploying to Vercel

1. Import the repo and set **Root Directory** to `apps/cub` — the repository
   root holds an unrelated app.
2. Add the three environment variables above.
3. Set `NEXT_PUBLIC_SITE_URL` to the production origin, and add
   `https://<your-domain>/auth/callback` to Supabase → Authentication → URL
   Configuration → Redirect URLs, or magic links will bounce.

## A note on storage cost

Supabase's free tier includes about **1GB** of storage, and video will outgrow
it quickly:

| | Typical size | 
| --- | --- |
| 100 compressed photos (max 2560px) | ~120–250MB |
| 20 iPhone videos at 60s, 1080p | ~1.2–2.4GB |

So roughly **20 minutes of video is enough to exceed the free tier on its own**.
Expect to move to Pro (about **$25/month**, 100GB included) once video uploads
start in earnest — realistically around the second trimester. Photos alone would
stay inside the free tier for the whole pregnancy.

Media lives in private buckets and is only ever served through short-lived
signed URLs.

## Privacy

- Private storage buckets, no public media URLs.
- No analytics and no third-party trackers.
- `robots: noindex` — this app is not meant to be found.
- Photo GPS metadata is stripped client-side before upload (M4).
