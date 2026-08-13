# The Celebration Society — Warehouse Dashboard

A daily warehouse operations board, designed to live full-screen on a TV in the
warehouse all day, plus a small admin form one person fills in each morning.

Two screens, one job: anybody walking past the TV should understand the day in
about five seconds.

| Route             | Who uses it         | What it does                                               |
| ----------------- | ------------------- | ---------------------------------------------------------- |
| `/`               | Everyone (no login) | The warehouse display. Auto-refreshes every 20 seconds.    |
| `/admin`          | Office / admin      | The morning update. Sets the day's targets. Password protected. |
| `/admin/check-in` | Office / admin      | The 9 AM / 12 PM / 3 PM check-ins, and notes added during the day. |
| `/history`        | Office / admin      | Previously published days. Admins can reopen and edit one.  |

**V1 is manual input only.** No Shopify connection — the morning admin sets the
day's operational truth. The code is structured so Shopify can be layered in
later without redesigning anything; see
[`docs/SHOPIFY-INTEGRATION.md`](docs/SHOPIFY-INTEGRATION.md).

---

## Technology

| Layer      | Choice                                       |
| ---------- | -------------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19            |
| Language   | TypeScript (strict)                           |
| Styling    | Tailwind CSS v4                               |
| Database   | SQLite via Prisma (swap to Postgres — see below) |
| Validation | Zod (shared by the browser form and the API)  |
| Icons      | lucide-react                                  |

No state library, no component library, no realtime infrastructure. The
dashboard has to run untouched for a whole shift, so the moving parts are kept
to a minimum deliberately.

---

## Getting started

Requires **Node 20 or newer**.

```bash
git clone <this repo>
cd tcs-warehouse-dashboard

npm install
cp .env.example .env          # then edit ADMIN_PASSWORD + ADMIN_SESSION_SECRET

npm run setup                 # creates the database and loads demo data
npm run dev                   # http://localhost:3000
```

`npm run setup` is shorthand for `prisma migrate dev` followed by the seed.
On an existing database use the individual commands instead.

### Environment variables

Every variable lives in [`.env.example`](.env.example). Copy it to `.env` — the
real `.env` is gitignored and must never be committed.

| Variable               | Required | Purpose                                               |
| ---------------------- | -------- | ----------------------------------------------------- |
| `DATABASE_URL`         | Yes      | Prisma connection string. `file:./dev.db` locally.    |
| `ADMIN_PASSWORD`       | Yes      | The single shared password for `/admin`.              |
| `ADMIN_SESSION_SECRET` | Yes      | Signs the admin cookie. 32+ random characters.        |

Generate a session secret with:

```bash
openssl rand -base64 32
```

### Useful commands

| Command               | Does                                                    |
| --------------------- | ------------------------------------------------------- |
| `npm run dev`         | Development server                                       |
| `npm run build`       | Production build (runs `prisma generate` first)          |
| `npm start`           | Serve the production build                               |
| `npm run typecheck`   | TypeScript, no emit                                      |
| `npm run lint`        | ESLint                                                   |
| `npm run db:migrate`  | Create/apply a migration in development                  |
| `npm run db:deploy`   | Apply existing migrations (use this in production)       |
| `npm run db:seed`     | Load demo data (refuses if real data exists)             |
| `npm run db:studio`   | Browse the database in Prisma Studio                     |

---

## The daily rhythm

The day has two kinds of update, and they get two separate screens on purpose.

### Morning — `/admin` (about 2 minutes)

Sets the day's **plan**: which order batches are being personalised and shipped,
**the targets** for each, exceptions, courier cut-off, who is on, and the
heads-up message. Today's record opens automatically — existing if already
published, otherwise pre-filled from yesterday (roster, courier cut-off, who
updated it, and batch dates offset by a day). Press **PUBLISH TODAY'S DASHBOARD**.

### During the day — `/admin/check-in` (about 15 seconds)

Records **progress** against those targets at 9 AM, 12 PM and 3 PM. It asks for
two numbers and nothing else, so a check-in never becomes a chore. The same
screen is where notes get added to the board — a heads up, low stock, or a
delivery expected.

Enter the **running total for the day**, not the number since the last
check-in. Cumulative is what people can actually count on the floor, and it
means one miscount doesn't corrupt every later figure. The board works out and
displays the gain itself ("+94 since 12 PM").

Both screens sit behind one shared password. The session lasts 30 days, so it
is normally just "open, type, save". There is no user management and no roles —
by design.

The display at `/` is deliberately **not** protected: the warehouse TV cannot be
asked to log in every morning, and the board holds no sensitive data.

### Targets vs progress

This split is the core of the data model:

- The **target** (`personalisedOrderCount`, `shippingOrderCount`) is set once in
  the morning and then left alone.
- **Progress** lives on the checkpoints, not on the day record.

That is what makes the progress meters and the "how are we tracking?" question
answerable at all. If you change one thing about this app, don't collapse them
back together.

### Pace

Each meter draws a marker showing how far through the working day it is, so the
gap between the fill and the marker answers "are we keeping up?" at a glance.
The working day defaults to **08:00–16:00**; change `PRODUCTION_DAY` in
`src/lib/dashboard/types.ts` if the shift moves — every pace calculation reads
from there.

Pace is forgiving on purpose: anything within 5 points of the expected line
counts as ON PACE. Warehouse work is lumpy, and a board that cried BEHIND over
two orders would be trained out within a week.

Why a meter and not a pie chart: a two-slice pie can show how much is done, but
it cannot show where you *should* be by now — which is the actual question. A
track can show both on one scale, and it stays readable from across the
warehouse.

---

## How the data is stored

One row per warehouse day in `DailyDashboard`, keyed by `dashboardDate`, plus
three child tables:

| Table                 | Holds                                                    |
| --------------------- | -------------------------------------------------------- |
| `DailyDashboard`      | The day's plan: batch dates, targets, exceptions, message |
| `DashboardCheckpoint` | The 9 AM / 12 PM / 3 PM check-ins and their counts        |
| `DashboardNote`       | Timestamped notes added during the day                   |
| `StaffAssignment`     | Who is on today and their role                           |

Publishing performs an upsert on the date, so nobody has to "create today's
record" — pressing Publish is always the right move, whether it is the first
save of the day or the fifth. The three default check-ins are created with the
day and are **never clobbered by a re-publish**, so redoing the morning update
at 2 PM cannot wipe progress already recorded. Past days are kept, which is
what `/history` reads.

The roster is re-entered per day rather than kept as an employee table: it is a
roster for one day, and the warehouse should never have to maintain a people
database to use the board.

### Dates and times

The business runs on **Australia/Sydney** time, and the server may not.
Calendar dates are therefore stored as plain strings, never as `DateTime`:

- `dashboardDate`, `personalisingOrderDate`, `shippingOrderDate` → `"YYYY-MM-DD"`
- `courierCutoff` → `"HH:mm"` (24-hour)

A `DateTime` would force a UTC round-trip, and "13 August 00:00 Sydney" is
"12 August 13:00 UTC" — enough to shift the board by a day. Only `createdAt` and
`updatedAt` are true instants; they are stored in UTC and rendered into Sydney
time for display. All of this lives in [`src/lib/dates.ts`](src/lib/dates.ts),
including the Christmas countdown, which is computed from the Sydney date and
handles Christmas Day and Boxing Day rollover.

### Blank vs zero

Numeric fields are nullable and blank means "not entered". The display hides a
blank production figure entirely rather than showing a misleading `0`, and an
exception card with no value shows an em-dash. An explicit `0` is kept and
shown muted — "no redos today" is real information.

### Moving to Postgres

The *schema* is portable — it avoids SQLite-specific types, and the status enum
is a validated string (SQLite has no enums). The **migration files are not**:
Prisma generates them in the dialect of whatever provider was set, so the
existing `prisma/migrations/` folder contains SQLite SQL (`TEXT NOT NULL PRIMARY
KEY`, `DATETIME`) that Postgres will reject. Regenerate them, don't reuse them.

1. In `prisma/schema.prisma` change `provider = "sqlite"` to `"postgresql"`.
2. Point `DATABASE_URL` at the Postgres server.
3. Replace the SQLite migration history with a Postgres one:

   ```bash
   rm -rf prisma/migrations
   npx prisma migrate dev --name init      # generates Postgres SQL
   ```

   Safe to do here because there is no production SQLite data worth keeping —
   the local database is demo data. **If that ever stops being true, dump the
   data first.**

4. Deploy, then apply with `npx prisma migrate deploy` on the host.

For a throwaway prototype you can skip migration files entirely with
`npx prisma db push`, which creates the schema straight from `schema.prisma`.
Fine for a demo; use real migrations once the board is in daily use.

---

## Deploying

Any Node host works. On Vercel:

1. Import the repository.
2. Set `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` in project settings.
3. Deploy.

**Vercel note:** serverless filesystems are ephemeral, so SQLite will not
survive there — use a hosted Postgres (Vercel Postgres, Neon, Supabase) and
follow the swap above. SQLite is fine for local development or a small
always-on box in the warehouse.

Run `npm run db:deploy` as part of the release step so migrations are applied
before the new build serves traffic.

---

## Architecture

```
src/
  app/
    page.tsx                     Warehouse display (server-rendered, dynamic)
    admin/page.tsx               Morning update — auth check, then the form
    admin/check-in/page.tsx      During-the-day check-ins and notes
    history/page.tsx             Past days
    api/dashboard/today/route.ts Read-only JSON feed for the 20s poll
    api/dashboard/route.ts       Publish the morning update
    api/checkpoint/route.ts      Record a check-in
    api/notes/route.ts           Add / remove a note
    api/admin/login|logout       Session cookie
  components/
    dashboard/                   Display components
      ProgressMeter.tsx          Target vs done, with the pace marker
      CheckpointTimeline.tsx     9 AM / 12 PM / 3 PM strip with gains
      StaffOnDeck.tsx            Today's roster
    admin/                       Admin form components
  lib/
    dates.ts                     Australia/Sydney date + time logic
    auth.ts                      Password check + signed cookie
    db.ts                        Shared Prisma client
    dashboard/
      types.ts                   DashboardView, PRODUCTION_DAY, checkpoints
      schema.ts                  Zod rules, shared client + server
      service.ts                 The only module that touches the database
    shopify/service.ts           Placeholder for the future integration
```

Two boundaries matter:

**Components never touch the database.** They consume a `DashboardView`
assembled by `toDashboardView()` in `service.ts`. That function is the single
seam where Shopify data will eventually be merged in, which is why no screen
will need redesigning when it is.

**Validation is defined once.** `schema.ts` is imported by both the browser form
and the API route. The client-side pass exists for fast feedback; the server
always re-validates regardless.

### Auto-refresh

The display polls `/api/dashboard/today` every 20 seconds and only swaps React
state when `updatedAt` actually changes, so the screen never flashes or
re-flows while someone is reading it. A failed request is ignored and the last
good data stays on screen — the board must never go blank. It also re-checks
whenever the tab becomes visible, so a TV waking from sleep catches up
immediately, and the Sydney date rollover is picked up by the same poll, so a
screen left running overnight corrects itself.

Polling was chosen over websockets on purpose: nothing to reconnect, nothing to
keep alive, and a 20-second delay is irrelevant to a board updated once a day.

### Display states

| State           | What triggers it                              | What the board shows                                        |
| --------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Published       | Today's record exists and is published        | Full board                                                   |
| Not updated today | Today unpublished, an earlier day exists    | Amber "HAS NOT BEEN UPDATED TODAY" bar, last published day's figures, and the last-updated line names the day it came from |
| Empty           | Nothing has ever been published               | "Not yet published" panel, keeping today's date and countdown |

---

## Accessibility

- Status is never colour alone — each state has a distinct icon and wording.
- Cream on evergreen and gold on evergreen both clear WCAG AA at display sizes.
- Icons are `aria-hidden` with text beside them; panels are labelled `<section>`s.
- The admin form is fully keyboard operable with visible gold focus rings,
  `aria-invalid` on failed fields, and errors announced via `role="alert"`.
- Number inputs ignore the scroll wheel, so an accidental scroll cannot silently
  change a published count.
- The only animation is a slow "live" dot, disabled under
  `prefers-reduced-motion`.

---

## Design notes

The palette is taken from the brand itself
([thecelebrationsociety.com.au](https://thecelebrationsociety.com.au/)):

| Token          | Hex       | Where it comes from            |
| -------------- | --------- | ------------------------------ |
| Charcoal       | `#231F20` | The logo wordmark              |
| Antique gold   | `#CB9D2D` | The logo's offset shadow       |
| Typeface       | Poppins   | The site's own font            |

The logo is heavy caps in charcoal with a gold offset, so the board is built the
same way round: warm ivory ground, charcoal type, gold accenting, and Christmas
red held back for genuine urgency. The "WAREHOUSE TODAY" line reuses the logo's
gold-offset treatment (`.tcs-wordmark`).

Ivory (`#F7F2E9`) rather than pure white: a full-brightness white panel on a
large TV is glaring across a working day, and the warm tint matches the brand's
paper feel while keeping charcoal-on-ivory contrast far above AA.

The logo file is `public/brand/tcs-logo.png`, pulled from the live site at
215×80. **Drop in a higher-resolution PNG or an SVG at the same path** when one
is available — it is displayed around 160px wide, so the current file is
adequate but not crisp on a 4K panel.

Status and pace colours were validated against the light surface (all ≥ 3:1) and
never carry meaning alone — every one ships with an icon and a word.

The display is built for a 1920×1080 TV viewed from several metres away and fits
one screen with no scrolling at that size. Type is sized in viewport units with
`clamp()` floors and ceilings, so it fills a TV and still degrades onto a laptop,
tablet or phone. If you change the type scale in `src/app/globals.css`, re-check
that the board still fits 1080px tall; the sizes there are tuned to that budget.
