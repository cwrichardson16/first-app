# Cut — personal fitness tracker

Self-hosted, single-user-per-account fitness tracker for managing a weight cut. Tracks diet, training, water, sleep, weight, and progress photos. Includes a bare-bones partner view so two linked accounts can see each other's day.

Mobile-first. Dark mode. Built to actually get used.

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + shadcn/ui-style primitives
- **Supabase** — Postgres, Auth (magic link), Storage
- **Recharts** for charts
- **react-hook-form** + **zod** for forms / validation
- **date-fns** + **date-fns-tz** for timezone-correct dates
- **pnpm**

## Setup

### 1. Install
```sh
pnpm install
```

### 2. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. From the project's **SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql` and run it. This creates the schema, RLS policies, and the `progress-photos` storage bucket.
3. In **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:3000` (and your production URL when deployed)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and your production callback.

### 3. Configure environment

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>      # server-only; never client-side
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` is only used by the "delete account" action. If you don't need that, leave it blank.

### 4. Run

```sh
pnpm dev          # http://localhost:3000
```

## Usage notes

- **First sign-in** creates a `user_settings` row via a Postgres trigger with the defaults. Edit them at `/settings`.
- **The 4 AM rule.** Before 4 AM in your local timezone, `/today` defaults to yesterday's date (because you're probably still logging "today"). Use the date picker to override.
- **Computed totals.** `daily_logs` does NOT denormalize macro/water totals. Calories, P/F/C, and water are computed on read by summing `food_entries` / `water_entries` for the day. Cheaper to maintain, no trigger surface area.
- **Goal projection.** `/dashboard` shows a projected goal date only after you log ≥10 weights in the last 30 days. Linear regression over the recent window.
- **Workouts.** Type a workout name you've used before, and a "Repeat last X" button appears that copies all exercises and sets. Per-exercise hint shows "Last time: 185×8, 8, 7" once you start typing the exercise name.

## Linking a partner

There's no invite UI. To link two accounts (you and your wife):

```sql
-- both rows are required so each side can see the other
insert into partner_link (user_id, partner_id) values
  ('<your_user_id>', '<their_user_id>'),
  ('<their_user_id>', '<your_user_id>');
```

User IDs are visible in Supabase's **Authentication → Users**. RLS policies grant SELECT on the partner's `daily_logs`, `food_entries`, `water_entries`, `workouts`, `exercise_sets`, `progress_photos`, and `user_settings`. Writes are still self-only.

After linking, the **Partner** tab appears in the bottom nav.

## Deployment

### Vercel
1. Push this repo to GitHub.
2. Import in Vercel.
3. Set the four env vars from `.env.local` in **Project Settings → Environment Variables**.
4. Deploy.
5. In Supabase, add your Vercel domain to the **Site URL / Redirect URLs**.

### Linux VPS
```sh
pnpm install
pnpm build
pnpm start                      # binds to :3000 by default
```
Front it with nginx + a TLS cert. For process supervision, use `pm2`:
```sh
pm2 start "pnpm start" --name cut
pm2 save && pm2 startup
```
Or systemd:
```ini
# /etc/systemd/system/cut.service
[Unit]
After=network.target

[Service]
WorkingDirectory=/opt/cut
EnvironmentFile=/opt/cut/.env.local
ExecStart=/usr/bin/pnpm start
Restart=on-failure
User=cut

[Install]
WantedBy=multi-user.target
```

## Project structure

```
app/
  actions/          server actions (food, water, workout, daily-log, ...)
  api/              JSON endpoints used by client components
  auth/             magic-link callback + signout
  today/            home screen
  dashboard/        weight & calorie charts, projections
  workouts/         list, new, edit
  photos/           grid, upload, compare
  partner/          read-only side-by-side
  settings/         targets, quick-meals, profile
components/
  ui/               primitives (button, card, dialog, ...)
  today/            screen-specific components
  workouts/         workout form (the most complex client piece)
  photos/           upload + grid
  settings/         forms
  dashboard/        recharts wrappers
  BottomNav.tsx
  MacroBars.tsx
lib/
  supabase/         client + server + middleware
  date.ts           timezone-aware "today" helpers (4 AM rule)
  workouts.ts       workout queries (groupSetsByExercise, repeat-last)
  dashboard.ts      analytics aggregation (linear regression for projection)
  queries.ts        per-day rollups (compute on read)
  image.ts          client-side resize before upload
  auth.ts           requireUser, getSettings
types/
  database.ts       hand-written until `supabase gen types typescript` is run
supabase/
  migrations/0001_init.sql
```

## What was deliberately skipped

- Tests. Personal app, ship-first.
- Notifications.
- Barcode/food database lookup. Manual macros + quick-meals only.
- Service worker (manifest only). App-shell caching is low-value here and adds a debugging tax.
- Invite UI for partners. Manual SQL is fine for two people.
- Metric units. Schema supports it, UI doesn't yet.
