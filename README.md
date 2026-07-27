# Nyaruka — E-Bicycle Delivery Platform for Kigali

Nyaruka is a last-mile delivery platform connecting customers and businesses in
Kigali with e-bicycle riders. It covers registration and login for four account
types (Customer, Rider, Business, Admin), placing/tracking/cancelling orders,
simulated MTN Mobile Money payment, a rider job-acceptance and status-update
flow, admin rider verification and manual dispatch, and post-delivery ratings.

The project has two parts:

- **Frontend** — Next.js 14 (App Router) + TypeScript + Tailwind, at the repo root.
- **Backend** — Express + Prisma + PostgreSQL, in [`server/`](server/).

This README assumes no prior familiarity with the project.

## Live demo

- **App:** [https://nyaruka-web.onrender.com](https://nyaruka-web.onrender.com)
- **API:** [https://nyaruka-api.onrender.com/api/health](https://nyaruka-api.onrender.com/api/health)
- **SRS:** [Software Requirements Specification](https://docs.google.com/document/d/1-BVO4HhYgLe_hq1IVuHykHNGaJQxcV-TGSpHbjJhTtQ/edit?usp=sharing)

Both are hosted on Render (free tier — the API may take ~30–60 seconds to
wake up on the very first request after a period of inactivity; subsequent
requests are fast). The database is seeded, so the demo credentials below
work immediately, no sign-up required. See [Demo login credentials](#demo-login-credentials).

## Prerequisites

- **Node.js 18.18+** (Node 20 LTS recommended) and npm
- **Docker** (for a local PostgreSQL instance) — or any PostgreSQL 14+ instance
  you already have running, local or remote
- Internet access on first `npm install` / first build (the frontend pulls
  Google Fonts at build time via `next/font/google`)

## 1. Clone and install dependencies

```bash
git clone https://github.com/igorntwari/nyaruka.git
cd nyaruka

# Frontend deps (repo root)
npm install

# Backend deps
cd server
npm install
cd ..
```

## 2. Configure environment variables

The backend reads its config from `server/.env`. Copy the example and fill it in:

```bash
cd server
cp .env.example .env
```

`server/.env`:

```env
DATABASE_URL="postgresql://nyaruka:nyaruka@localhost:5434/nyaruka"
PORT=4000

# Optional — Africa's Talking sandbox credentials for real SMS/USSD delivery.
# Leave AT_API_KEY blank to run with SMS simulated (messages are logged to the
# server console instead of actually sent — this is the default and is fine
# for grading/demo purposes).
AT_USERNAME=sandbox
AT_API_KEY=
```

The frontend talks to the backend via `NEXT_PUBLIC_API_URL`, which defaults to
`http://localhost:4000/api` if unset — so **no frontend env file is needed for
local development**. Only set one if you're pointing the frontend at a
deployed backend (see [Deployment](#deployment) below):

```bash
# repo root, .env.local — only needed when NOT running the backend on localhost:4000
echo "NEXT_PUBLIC_API_URL=https://your-backend-url.example.com/api" > .env.local
```

## 3. Start PostgreSQL

The backend's `docker-compose.yml` spins up Postgres on port `5434` (chosen to
avoid clashing with a Postgres install you might already have on `5432`):

```bash
cd server
npm run docker:up
```

This starts a `postgres:14` container with user/password/db all set to
`nyaruka`, matching the default `DATABASE_URL` above. If you're pointing at
your own Postgres instance instead, just set `DATABASE_URL` accordingly and
skip this step.

## 4. Run migrations and seed data

Still inside `server/`:

```bash
npx prisma migrate deploy   # applies the committed migrations
npm run prisma:seed         # populates demo accounts, orders, ratings
```

`prisma:seed` **wipes and recreates** all data — safe to re-run any time you
want a clean demo state. It creates:

- 1 admin, 13 riders (mixed verified/pending/suspended), 5 businesses, 26 customers
- 55 orders spanning every status (placed, assigned, picked up, delivered,
  cancelled, and a few with failed payments), so every dashboard and filter
  has something to show
- Ratings on ~85% of delivered orders

## 5. Run the app

Two terminals, both from the repo root:

```bash
# Terminal 1 — backend, listens on the PORT set in server/.env (default 4000)
cd server
npm run dev

# Terminal 2 — frontend (http://localhost:8000, per the "dev" script in package.json)
npm run dev
```

Open **http://localhost:8000**. Best viewed at mobile width — the UI is
mobile-first, matching how most users would actually access this in Kigali.

> If you change `PORT` in `server/.env` away from its default (4000), the
> frontend won't find the backend automatically — set
> `NEXT_PUBLIC_API_URL=http://localhost:<your-port>/api` in a `.env.local`
> file at the repo root to match (see [step 2](#2-configure-environment-variables)).

## Demo login credentials

All seeded accounts use the password **`password123`**. Log in at `/login`
with any of these, or browse `server/prisma/seed.js` for the full list:

| Role | Phone | Name | Notes |
|---|---|---|---|
| Admin | `0720000000` | Nyaruka Admin | Full dashboard: stats, riders, orders |
| Rider (verified) | `0720000001` | Eric Mugisha | Can see and accept jobs immediately |
| Rider (pending) | `0720000010` | — | Shows the "awaiting verification" state |
| Rider (suspended) | `0720000012` | — | Shows the "suspended" state |
| Business | `0720000014` | Aimee Kagoyire (Paka Juice) | Business dashboard + history |
| Customer | `0720000019` | Alice Umuhoza | Has existing order history to browse |

You can also register a brand-new account for any role from `/register` —
registration works end-to-end against the real backend, no seed data required.

## What's implemented vs. simulated

Everything below runs against the real Express/Prisma/PostgreSQL backend —
none of it is mocked in the frontend.

**Fully working:**
- Registration and login for all 4 roles, with server-side validation and
  clear error messages (invalid phone, weak password, duplicate phone, wrong
  credentials)
- Customer/Business: place an order, pay, track live status, cancel (only
  while unassigned), rate a completed delivery
- Rider: browse available jobs (search + zone filter), accept a job
  (race-safe — two riders can't accept the same job), advance status
  (assigned → picked up → delivered), view earnings
- Admin: verify/suspend riders, browse and filter all orders, manually assign
  a rider to any paid, unassigned order, view platform stats (revenue,
  deliveries, busiest zones, monthly trends)
- Role-based access control — every route rejects the wrong role or a missing/
  invalid session

**Simulated by design (not a live integration):**
- **MTN Mobile Money** — payment confirmation is simulated server-side (an
  ~88% success rate, matching real-world MoMo prompt behavior) rather than
  calling MTN's real API. No real payment gateway integration was in scope
  for this project.
- **SMS notifications & USSD** — the app includes a real Africa's Talking
  webhook handler (`server/src/routes/ussd.js`) implementing the full USSD
  menu flow (register, place an order, check jobs, mark delivered, etc.) for
  feature-phone users, and it works against the Africa's Talking sandbox
  simulator if you supply your own `AT_API_KEY`. It is **not** wired to a live
  telco short code — that requires a paid Africa's Talking production
  account and business registration with a Rwandan telco, which is out of
  scope for this school project.

**Known limitations:**
- Auth is a simple bearer token with no expiry (one active session per user;
  logging in elsewhere invalidates the old session). This is a deliberate
  scope cut for a school project, documented in `schema.prisma`.
- No real-time push (WebSockets) — the tracking page polls the API every 3
  seconds while an order is in progress, which is sufficient for demo purposes.

## Testing the USSD flow

The USSD webhook (`POST /api/ussd`) speaks the exact protocol Africa's
Talking uses to call your app, so you can exercise the whole feature-phone
menu — register, place an order, check available jobs, mark delivered — with
plain `curl`, no Africa's Talking account required. Africa's Talking sends
`sessionId`, `phoneNumber` (E.164), and `text` (everything the user has typed
so far, joined by `*`); the response is `CON ...` if the menu continues or
`END ...` once the session is over. When testing by hand you re-send the same
`sessionId` and append the new digit to `text` yourself each step (Africa's
Talking's own gateway does this automatically for a real user).

Register a new customer from a phone that's never used the app:

```bash
curl -s -X POST http://localhost:4000/api/ussd \
  -d "sessionId=demo1&phoneNumber=%2B250788000111&text="
# → CON Welcome to Nyaruka
#   1. Register as Customer
#   2. Register as Rider

curl -s -X POST http://localhost:4000/api/ussd \
  -d "sessionId=demo1&phoneNumber=%2B250788000111&text=1"
# → CON Enter your full name:

curl -s -X POST http://localhost:4000/api/ussd \
  -d "sessionId=demo1&phoneNumber=%2B250788000111&text=1*Jane Doe"
# → END Welcome to Nyaruka, Jane Doe! Dial in again any time to place a delivery.
```

Place an order as an already-registered customer (e.g. seeded customer
`0720000019` → E.164 `+250720000019`), picking pickup zone 1, drop-off zone 2,
an item, and a weight:

```bash
curl -s -X POST http://localhost:4000/api/ussd \
  -d "sessionId=demo2&phoneNumber=%2B250720000019&text="              # → root menu
curl -s -X POST http://localhost:4000/api/ussd \
  -d "sessionId=demo2&phoneNumber=%2B250720000019&text=1"              # → pickup zone menu
curl -s -X POST http://localhost:4000/api/ussd \
  -d "sessionId=demo2&phoneNumber=%2B250720000019&text=1*1"           # → dropoff zone menu
curl -s -X POST http://localhost:4000/api/ussd \
  -d "sessionId=demo2&phoneNumber=%2B250720000019&text=1*1*2"         # → "what are you sending?"
curl -s -X POST http://localhost:4000/api/ussd \
  -d "sessionId=demo2&phoneNumber=%2B250720000019&text=1*1*2*Documents"  # → weight prompt
curl -s -X POST http://localhost:4000/api/ussd \
  -d "sessionId=demo2&phoneNumber=%2B250720000019&text=1*1*2*Documents*1"  # → END order placed
```

A verified rider can similarly dial in and pick `1` (available jobs near
them) or `2` (their active delivery, to mark it picked up / delivered) —
same pattern, see `server/src/routes/ussd.js` for the full menu tree.

### Testing against the real Africa's Talking sandbox simulator (optional)

The curl calls above exercise identical logic to a real dial-in, so this step
isn't needed for grading — it's here if you want to see it through Africa's
Talking's own phone simulator:

1. Create a free account at [africastalking.com](https://account.africastalking.com)
   and switch to the **Sandbox** app.
2. Under **USSD**, create a channel and set its callback URL to your
   backend's public `/api/ussd` endpoint. This must be reachable from
   Africa's Talking's servers — for local development, expose your backend
   with a tunnel (e.g. `ngrok http 4000`) and use the ngrok URL; for a
   deployed backend, use its public URL directly.
3. This project's own sandbox channel is registered to the code **`*384*58128#`**
   (visible in `server/.env` — a sandbox test code, not a real production
   MTN/Airtel short code, so it only works from within Africa's Talking's own
   simulator, never from a real handset).
4. Open the **Simulator** tab in the Africa's Talking dashboard, enter any
   test phone number, dial `*384*58128#`, and press "Send" — you'll see the
   same CON/END menus as the `curl` examples above, rendered as an actual
   phone simulator, driven by your running backend.

If you register your own channel instead of reusing this one, dial whatever
code Africa's Talking assigns to it — the menu logic is identical either way.

`AT_API_KEY` only affects outgoing SMS notifications, not the USSD webhook
itself (Africa's Talking calls *your* server for USSD, so no API key is
needed on your end for that direction) — it's fine to leave it unset for
both grading and the simulator test above.

## Design system

Token choices are documented as comments in `tailwind.config.js`:

- **Color** — `route` green (#0F6B4C) as the brand primary, paired with a
  warm `amber` accent (#C98A1F) reserved for MoMo/currency moments, on a
  warm-paper background.
- **Type** — Sora (display) + Inter (body) + IBM Plex Mono (prices, order
  IDs, phone numbers).
- **Signature element** — the dashed "route line," a bicycle-route motif used
  both as the full status stepper (`components/ui/RouteStepper.tsx`) and a
  compact indicator on order cards (`components/ui/RouteMini.tsx`).

## Deployment

Both services are deployed on [Render](https://render.com), each as its own
free-tier Web Service, plus a free-tier managed Postgres instance. This is
exactly how the live demo above is running, so you can reproduce it (or fork
it to your own Render account) with these settings:

**Backend — `nyaruka-api` (Render Web Service):**
- Root directory: `server`
- Build command: `npm install && npx prisma generate`
- Start command: `npm start`
- Env vars: `DATABASE_URL` (the Postgres instance's connection string —
  Render's *external* connection string works even from outside Render's
  network, which is what let this be seeded from a local machine), plus
  optionally `AT_USERNAME`/`AT_API_KEY` if you want real SMS delivery.
- Render's Postgres free tier denies external connections by default — add
  an IP allow-list entry (`0.0.0.0/0` for "anywhere", or narrower if you
  prefer) on the database before trying to reach it from outside Render.
- Render's free plan doesn't support pre-deploy commands or one-off jobs, so
  `prisma migrate deploy` and the seed script were run directly from a local
  machine against the database's external connection string, once, after
  the schema/allow-list were in place:
  ```bash
  DATABASE_URL="<external connection string>" npx prisma migrate deploy
  DATABASE_URL="<external connection string>" npm run prisma:seed
  ```

**Frontend — `nyaruka-web` (Render Web Service):**
- Root directory: repo root (not `server/`)
- Build command: `npm install && npm run build`
- Start command: `next start -p $PORT` (Render assigns the port at runtime
  via the `PORT` env var — the `next start -p 5050` in `package.json` is
  for local use only and is overridden by this start command on Render)
- Env var: `NEXT_PUBLIC_API_URL=https://nyaruka-api.onrender.com/api` — this
  is a build-time value for Next.js, so it must be set *before* the build
  runs, not just at runtime.

**Notes if you redeploy or fork this:**
- Free-tier Render web services spin down after inactivity, so the very
  first request after a quiet period can take 30–60 seconds — normal, not a bug.
- The free Postgres instance expires 30 days after creation; recreate it
  (and re-run migrate + seed) if it's been longer than that.
- Whatever platform you use, always confirm the deployed frontend is
  actually calling the deployed backend and not `localhost` — the browser's
  network tab (or `curl`) should show requests going to your backend's real
  URL — and make sure the seed step has run against the production database
  so graders see a populated app rather than an empty one.
