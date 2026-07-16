# Supabase Setup — Meraki Portal

Complete, project-specific guide to stand up the database, auth, backend and
frontend. Follow the steps **in order** — Step 4 (the auth hook) is the one
people miss and everything silently breaks without it.

> Stack: **Supabase** (Postgres + Auth) → **FastAPI backend** → **React frontend**.
> Roles: `super_admin`, `branch_admin`, `trainer`, `student`.

---

## 0. Prerequisites

- A [supabase.com](https://supabase.com) account
- **Python 3.11+** and **Node 20.19+ / 22.12+**
- (Recommended) the [Supabase CLI](https://supabase.com/docs/guides/cli): `npm i -g supabase`

---

## 1. Create the project

1. Supabase dashboard → **New project**. Choose a name, a strong **DB password** (save it), a nearby region.
2. Wait for provisioning (~2 min).

## 2. Collect keys — **Project Settings → API**

| Value | Goes into |
|---|---|
| **Project URL** | `SUPABASE_URL` (backend) + `VITE_SUPABASE_URL` (frontend) |
| **anon public key** | `SUPABASE_ANON_KEY` + `VITE_SUPABASE_ANON_KEY` |
| **service_role key** (secret) | `SUPABASE_SERVICE_ROLE_KEY` — **backend only, never in frontend** |
| **JWT Secret** (API → *JWT Settings*, may say *Legacy JWT Secret*) | `SUPABASE_JWT_SECRET` |

> The backend verifies tokens locally with `SUPABASE_JWT_SECRET` (HS256), so it must match exactly.

## 3. Apply migrations (in order)

Schema lives in `supabase/migrations/`:
`0001_schema.sql` → `0002_rls.sql` → `0003_lms.sql` → `0004_students_portal.sql` → `0005_enquiry_email.sql`.
**Order matters** — later files extend earlier ones (including the auth hook).

**Option A — Supabase CLI (recommended)** — from the repo root:
```bash
supabase link --project-ref <your-project-ref>   # ref is in your project URL
supabase db push
```

**Option B — SQL Editor (manual):** open each file in `supabase/migrations/` **in numeric order**, paste into the dashboard **SQL Editor**, run one at a time.

## 4. ⚠️ Enable the Custom Access Token Hook — **DO NOT SKIP**

`0002_rls.sql` created `public.custom_access_token_hook`, which stamps **`role`** and
**`branch_id`** onto every JWT. The frontend's portal routing, role-based sidebar,
and **all** Row-Level Security depend on it. Skip this and users log in but look
like plain staff and see no data.

1. Dashboard → **Authentication → Hooks** (or *Auth Hooks*).
2. **Custom Access Token** → Enable → select function **`custom_access_token_hook`** (schema `public`).
3. Save.

## 5. Auth URL configuration — **Authentication → URL Configuration**

- **Site URL:** `http://localhost:5173` (dev) / your real domain (prod)
- **Redirect URLs:** add `http://localhost:5173/reset-password` (Forgot/Reset password flow) and `http://localhost:5173/**`
- Email confirmations can stay on — the seed auto-confirms its users.

## 6. Backend `.env`

```bash
cd backend
cp .env.example .env
```
Fill `backend/.env`:
```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SUPABASE_JWT_SECRET=<jwt secret>
FRONTEND_ORIGIN=http://localhost:5173
PUBLIC_ENQUIRY_BRANCH_ID=            # branch that website Contact-form enquiries attach to; blank = first branch
ANTHROPIC_API_KEY=                   # optional — AI Reports; blank = stub
```

## 7. Seed the first accounts

`supabase/seed/seed.py` creates a **Head Office** branch, a **Super Admin**, internship
**domains**, and a **demo Student**.
```bash
cd supabase/seed
pip install -r requirements.txt
# PowerShell:
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
python seed.py
```
Default logins it prints (⚠️ change after first login):
- **Admin:** `admin@meraki.local` / `ChangeMe123!`
- **Student:** `student@meraki.local` (or username `ai_student01`) / `Learn123!`

Run **once**. You can override defaults with `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`, etc.

## 8. Frontend env

**Dev** — `frontend/.env.local`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_API_BASE_URL=http://localhost:8000/api
VITE_DEV_BYPASS_AUTH=false      # ← MUST be false to use REAL auth (true = mock demo mode)
```
> `VITE_DEV_BYPASS_AUTH=true` is the offline demo mode. Set it to **false** to talk to the real backend.

**Production** — `frontend/.env.production` already sets `VITE_DEV_BYPASS_AUTH=false`. Set
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL` in your host's env vars.

## 9. Run it

**Backend:**
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Check `http://localhost:8000/api/health`.

**Frontend** (new terminal):
```bash
cd frontend
npm install
npm run dev
```

## 10. Log in
Open `http://localhost:5173/login`.
- Admin → lands on `/app` (full portal). Student → lands on `/learn`.
- Manage roles/branches/domains from inside the app (Users + Students → Domains).

---

## Roles & how access works
- **super_admin** — all branches; bypasses module checks.
- **branch_admin** — full access **within their branch** (RLS-scoped via the `branch_id` claim).
- **trainer** — same admin portal, **limited modules** (Batch Mgmt/Execution, Curriculum, Students, My Account). Created by the super admin in **Users → New User → Trainer**.
- **student** — student portal only.

Access is enforced two ways: **RLS** scopes rows by the `branch_id` JWT claim; the API's
`require_module` gates each module by the user's `modules` list.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Login works but user sees no data / wrong portal | **Custom Access Token Hook not enabled** (Step 4) — `role`/`branch_id` claims missing |
| API returns **401** | `SUPABASE_JWT_SECRET` doesn't match the project's JWT secret |
| **CORS** errors | `FRONTEND_ORIGIN` (backend) must equal the frontend URL |
| Blank screen, "supabaseUrl is required" | `frontend/.env.local` missing — Vite ignores `.env.example` |
| Password-reset link dead | Add `http://localhost:5173/reset-password` to Redirect URLs (Step 5) |
| Saving an enquiry **email** errors | Migration `0005_enquiry_email.sql` not applied |
| Branch user can only see some data | Working as intended — RLS scopes them to their branch |

---

## Production deploy notes
- **Frontend:** `npm run build` → deploy `dist/`. Host must serve `index.html` for all routes (SPA fallback). Set `VITE_*` env vars in the host.
- **Backend:** deploy FastAPI (uvicorn/gunicorn) with the `.env` values; set `FRONTEND_ORIGIN` to the real frontend domain.
- Never expose `SERVICE_ROLE_KEY` or `JWT_SECRET` to the browser.
