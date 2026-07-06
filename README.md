# Meraki Portal

Multi-tenant Internship & Training Management Portal. A head office ("Super Admin")
oversees multiple branches; each branch logs in and only ever sees its own data.

## Stack

- **Frontend:** React 19 + Vite + TypeScript, Tailwind CSS v4, TanStack Query, React Router, Recharts, hand-rolled shadcn-style component kit.
- **Backend:** FastAPI (async), Pydantic v2.
- **Database & Auth:** Supabase (Postgres + Supabase Auth + Row Level Security).
- **Exports:** Excel (`openpyxl`) per module, JSON backup/restore for account data.
- **AI Reports Assistant:** retrieval pipeline is fully built; the actual LLM call is
  stubbed out for now (see [AI Reports Assistant](#ai-reports-assistant) below) — wire
  in `ANTHROPIC_API_KEY` when ready.

## Repository layout

```
backend/            FastAPI app
  app/core/          config, Supabase clients, JWT auth dependency, branch-scoping helpers
  app/api/routes/    one file per module (enquiries, enrollments, batches, ...)
  app/models/        Pydantic request/response models
  app/services/      excel export helper
frontend/            React app (Vite)
  src/lib/            supabase client, fetch wrapper (lib/api.ts), shared types
  src/context/        AuthContext (session, profile, branch-switcher state)
  src/components/ui/  shared design-system components (Button, Card, Table, Dialog, ...)
  src/layouts/         Sidebar, Topbar, AppLayout
  src/pages/<module>/  one folder per module, each with a Dashboard sub-view + List View
supabase/
  migrations/0001_schema.sql   all tables
  migrations/0002_rls.sql      RLS policies + JWT custom-claims hook
  seed/seed.py                  creates one Super Admin login + a demo branch
```

## Roles & permissions model

- **super_admin** — sees/manages every branch. Can switch the whole app into
  "view as branch X" via the branch switcher in the top bar, or view "All Branches"
  aggregated. Creates branch/staff logins and assigns per-user module access.
- **branch_admin / staff / custom** — pinned to their own `branch_id`. Never see that
  other branches exist. `profiles.modules` (a string array of module keys) controls
  which sidebar items/routes they can use; `require_module(...)` in
  `backend/app/core/auth.py` enforces this server-side on every request.

Role and `branch_id` are stamped onto the Supabase JWT as custom claims by a Postgres
**Custom Access Token Hook** (`custom_access_token_hook` in `0002_rls.sql`) reading
from `profiles` at token-mint time. Both Postgres RLS policies and the FastAPI
`get_current_user` dependency read these claims — enforcement is defense-in-depth,
not just RLS.

Admin-only mutations (creating branch logins, cross-branch reads) go through FastAPI
endpoints that use the Supabase **service role key** (`get_service_client()`), which
never reaches the browser.

## Environment variables

### Backend (`backend/.env`, copy from `backend/.env.example`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Anon key — used for all RLS-respecting queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — admin-only ops, server-side only |
| `SUPABASE_JWT_SECRET` | Same secret as Supabase Auth JWT settings — verifies tokens locally |
| `FRONTEND_ORIGIN` | CORS allow-origin, e.g. `http://localhost:5173` |
| `ANTHROPIC_API_KEY` | Optional. Leave blank to keep the AI Reports Assistant on its stub response |

### Frontend (`frontend/.env`, copy from `frontend/.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Same Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Same anon key |
| `VITE_API_BASE_URL` | FastAPI base URL, e.g. `http://localhost:8000/api` |

## Running locally

### 1. Supabase project

Create a project at supabase.com (or point at an existing one). In the SQL editor,
run the migrations in order:

```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
```

Then in **Dashboard → Authentication → Hooks**, wire up `public.custom_access_token_hook`
as the **Custom Access Token** hook — this is what stamps `role`/`branch_id` onto
every JWT.

### 2. Seed a Super Admin

```bash
cd supabase/seed
pip install -r requirements.txt
export SUPABASE_URL=...            # same project URL
export SUPABASE_SERVICE_ROLE_KEY=... # service role key, never share this
python seed.py
```

Prints a login email/password for the first Super Admin account (defaults to
`admin@meraki.local` / `ChangeMe123!` unless overridden via `SEED_SUPER_ADMIN_*` env
vars) — change the password after first login.

### 3. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your Supabase values
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in your Supabase + API base URL
npm run dev
```

Visit `http://localhost:5173` and log in with the seeded Super Admin credentials.

## AI Reports Assistant

`POST /api/reports/ask` already does the full job of resolving the caller's branch
scope, pulling live aggregate stats from Supabase, and building a context object —
it just doesn't call an LLM yet. The swap point is the `generate_answer(question,
context)` function in `backend/app/api/routes/reports.py`: replace its body with an
Anthropic API call (using `get_settings().anthropic_api_key`), passing `context` as
grounding so the model can't hallucinate numbers it wasn't given.

## Excel export & JSON backup/restore

Every module list screen has a working "Export Excel" button (`GET .../export` on
each router, using `backend/app/services/excel_export.py`). Data backup/restore is
scoped to the current user's branch (or all branches for Super Admin) under
**My Account → Data Backup & Restore** — restore always re-stamps `branch_id`
server-side rather than trusting the uploaded file, and never touches the DB without
first parsing/previewing the file client-side.
