# AbundanceAI — MVP

A humanity-first web app that helps everyday experts turn their expertise into a
sellable online program. Built for the **Build with Gemini XPRIZE**.

**Gemini runs in production** for three jobs — structuring the program, writing
the marketing, and delivering mindset reflections — and it is called **only via
Vertex AI on Google Cloud**, so the "≥1 Google Cloud product" and "live Gemini
call" requirements are satisfied by the same component. Every AI call is logged
to `ai_usage_logs` for submission evidence.

---

## Monorepo layout

```
abundance-ai/
├── apps/web/            # React + Vite + Tailwind frontend (mobile-first, all 14 screens)
├── packages/shared/     # TS types + zod schemas + typed API client (source of truth)
├── supabase/
│   ├── migrations/      # Postgres schema, RLS, storage, triggers
│   ├── functions/       # Deno Edge Functions (all server logic + AI)
│   └── seed.sql         # shared seed data (expert talks)
├── scripts/
│   ├── seed-demo.mjs        # creates the populated JUDGE DEMO ACCOUNT
│   └── export-ai-usage.mjs  # exports ai_usage_logs to CSV (submission evidence)
└── README.md
```

The frontend and Edge Functions both depend on `packages/shared`, so the data
model and API contracts cannot drift.

---

## Quick start (mock mode — no backend, no keys)

The frontend ships with an in-memory **mock adapter**, so you can run the entire
app — all flows, AI build, mindset cap, circle — with zero backend.

```bash
npm install
npm run build:shared        # build the shared package once
cp apps/web/.env.example apps/web/.env   # VITE_USE_MOCKS=true by default
npm run dev:web             # http://localhost:5173
```

Flip to the live backend by setting `VITE_USE_MOCKS=false` and the `VITE_SUPABASE_*`
/ `VITE_STRIPE_PUBLISHABLE_KEY` values in `apps/web/.env`. One flag, no code changes.

---

## Full local stack (live backend)

Requires **Docker Desktop running** (Supabase boots Postgres + Auth + Storage +
the Edge runtime in containers).

```bash
# 1. Start Supabase locally
supabase start                       # prints local URL + anon/service_role keys

# 2. Apply schema + RLS + storage + triggers + seed
supabase db reset                    # runs all migrations/*.sql then seed.sql

# 3. Configure function secrets for local serve
cp supabase/functions/.env.example supabase/functions/.env
#   → paste the anon/service_role keys from `supabase status`
#   → add Stripe test keys + Vertex creds (or leave Vertex blank to use the AI mock)

# 4. Serve the Edge Functions
npm run functions:serve

# 5. Seed the populated judge demo account
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<service_role from supabase status> \
node scripts/seed-demo.mjs

# 6. Point the frontend at local Supabase
#    apps/web/.env:
#    VITE_USE_MOCKS=false
#    VITE_SUPABASE_URL=http://127.0.0.1:54321
#    VITE_SUPABASE_ANON_KEY=<anon from supabase status>
#    VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
npm run dev:web
```

---

## Environment variables / secrets

Secrets never reach the client. Only the two `VITE_` *publishable* values are
shipped to the browser.

### Supabase Edge Function secrets (`supabase/functions/.env` locally; `supabase secrets set` for deploy)

| Var | Purpose |
|-----|---------|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | injected automatically in deploys; set locally for `functions serve` |
| `APP_URL` | public app origin (CORS + Stripe redirect URLs) |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | $25 checkout, webhook, Connect |
| `GOOGLE_VERTEX_PROJECT_ID`, `GOOGLE_VERTEX_LOCATION`, `GOOGLE_VERTEX_MODEL` | Vertex AI target (e.g. `gemini-2.0-flash-001`) |
| `GOOGLE_VERTEX_SA_KEY` | service-account JSON for Vertex auth (full JSON string) |

> Leave `GOOGLE_VERTEX_SA_KEY` empty locally to use a deterministic AI **mock** so
> flows are testable offline. The **deployed** app must have real creds — that's
> what makes the live Gemini calls.

### Frontend (`apps/web/.env`)

| Var | Purpose |
|-----|---------|
| `VITE_USE_MOCKS` | `true` = in-memory mock; `false` = live backend |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | client auth + RLS-scoped reads |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Payment Element |

---

## How the Google Cloud requirement is met

- **Vertex AI (Google Cloud)** is the product of record. `supabase/functions/_shared/vertex.ts`
  authenticates with a Google Cloud service account and POSTs to the Vertex
  `generateContent` REST endpoint. We deliberately do **not** use the AI Studio key.
- **Gemini powers three production features**, each through Vertex:
  - `program-build` — structures raw content into 3–6 modules.
  - `marketing-generate` — writes social posts (+ optional email).
  - `mindset-checkin` — category-aware courage reflections.
- Every model call funnels through `_shared/gemini.ts → callGemini()`, which
  checks the response cache, calls Vertex, validates output against the shared
  zod schema, and **logs usage**.

## AI usage evidence (`ai_usage_logs`)

Every Gemini call (live or cache hit) writes one row: `feature, model,
prompt_tokens, completion_tokens, latency_ms, cache_hit, created_at, user_id`.
The table is **service-role insert only** (RLS).

Export for submission:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/export-ai-usage.mjs > ai_usage_logs.csv
```

Revenue evidence: the $25 sign-ups appear in the Stripe dashboard. Any
family/team test purchases are flagged `orders.is_related_party = true` so
arms-length revenue can be reported separately.

---

## Judge test instructions

The deployed build is **login-gated**. Use the seeded demo account (created by
`scripts/seed-demo.mjs`):

- **URL:** _<your deployed frontend URL>_
- **Email:** `judge@demo.abundance.ai`
- **Password:** `AbundanceDemo!2025`

The demo account is fully populated: a built program (4 modules), 3 marketing
posts, a saved Google Meet link, a **matched** circle of 3, and a mindset
check-in. New visitors can also run the full **Flow A** ($25 Stripe test
checkout → create account → home) and **Flow B** (choose path → add content →
AI builds the program → marketing kit) live.

> Stripe is in **test mode** — use card `4242 4242 4242 4242`, any future expiry, any CVC.

### < 3-minute demo plan
1. Land on `/`, tap **Start for $25**, pay with the test card → **Create Account** → **Home**.
2. From Home, **Build your program** → choose a path → add a note/recording →
   watch the narrated loader → see the **AI-built program** (WOW).
3. Continue to **Marketing Kit** (AI-written posts, copy one).
4. Open **Mindset**, run a check-in (Gemini reflection; try it twice to see a
   cache-instant response), then hit the 3/week limit → warm redirect to **Circle**.
5. Open **Circle** (matched peers + weekly expert talk). Export `ai_usage_logs.csv`
   to show the logged Gemini calls.

---

## Security model (RLS)

- Every user-owned table has Row Level Security: a user can only read/write rows
  where `user_id = auth.uid()` (profiles keyed by `id`).
- `expert_talks` is readable by all authenticated users.
- `ai_usage_logs` and `response_cache` are **service-role only**.
- Circle members can read peers in their own circle (via a `SECURITY DEFINER`
  helper to avoid recursive RLS).
- The **$25 gate**: a DB trigger (`handle_new_user`) blocks account creation
  unless a `paid` order exists for that email, links the order to the new user,
  and bootstraps their per-user rows.
- Storage: a private `content` bucket; objects live under `{user_id}/…` and are
  readable only by their owner. Signed upload URLs are issued by an Edge Function.

**RLS smoke test:** sign in as two demo users (`maya@…` / `tom@…`, both seeded)
and confirm one cannot read the other's `programs` / `marketing_posts` rows via
the Supabase client. (Service-role scripts bypass RLS by design.)

---

## Deploy

- **Frontend:** Vercel or Firebase Hosting (`npm run build:web`, output in
  `apps/web/dist`). Set the `VITE_*` env vars in the host.
- **Backend:** `supabase link` to your project, `supabase db push`,
  `supabase functions deploy`, `supabase secrets set …`. Configure the Stripe
  webhook endpoint to `…/functions/v1/stripe-webhook`.
- **AI:** enable the Vertex AI API on your Google Cloud project; create a service
  account with the *Vertex AI User* role; put its JSON in `GOOGLE_VERTEX_SA_KEY`.

---

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run build:shared` | build the shared contract package |
| `npm run dev:web` | run the frontend (Vite) |
| `npm run build:web` | typecheck + production build of the frontend |
| `npm run db:reset` | apply all migrations + seed (needs Docker) |
| `npm run functions:serve` | serve Edge Functions locally |
| `node scripts/seed-demo.mjs` | create the populated judge demo account |
| `node scripts/export-ai-usage.mjs` | export AI usage evidence to CSV |
| `node scripts/rls-smoke-test.mjs` | assert cross-user RLS isolation (needs `SUPABASE_URL` + `SUPABASE_ANON_KEY`) |

> If `supabase start` reports port 54322 already allocated, another local
> Supabase project is running — stop it with `supabase stop --project-id <id>`
> (the error message prints the id).

Build MVP scope only. Vertex AI is the Google Cloud product of record; Gemini
powers program structuring, marketing, and mindset in production; every AI call
is logged.
