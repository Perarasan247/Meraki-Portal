# Claude Code Build Prompt — Meraki Portal (Multi-Tenant Internship Management System)

> Copy everything below into Claude Code as your project brief.

---

## 1. Project Overview

Build a full-stack, multi-tenant **Internship & Training Management Portal** called **Meraki Portal**.

The platform is used by a head office ("Admin") that oversees multiple branches. Each branch has its own login and can only see and manage its own data. The Admin can see and manage everything across all branches, switch between branch views, create new branch logins, and control what modules/permissions each login has.

Design the UI/UX to feel modern, premium, and polished — this is a real SaaS product, not an internal tool. You have creative freedom on visual design (colors, layout, typography, animations, dashboard card styling) as long as every functional requirement below is implemented. Think: clean sidebar navigation, card-based dashboards, subtle motion/transitions, good empty states, responsive design, and a cohesive design system (not default unstyled components).

---

## 2. Tech Stack (required)

- **Frontend:** React (Vite), TypeScript, TailwindCSS, TanStack Query (React Query) for data fetching/caching, React Router, Recharts (or similar) for charts, shadcn/ui or a similarly clean component library as a base to customize.
- **Backend:** FastAPI (Python), Pydantic v2 models, async endpoints.
- **Database & Auth:** Supabase (Postgres + Supabase Auth + Row Level Security).
- **File exports:** Excel export (xlsx generation) and JSON backup/restore.
- **AI Reports feature:** integrate an LLM call (server-side, via FastAPI) that can answer natural-language questions about the portal's live data.

---

## 3. Multi-Tenancy & Access Model (CRITICAL — implement this first)

This is the foundation of the whole app. Get this right before building UI screens.

### Roles
- **Super Admin** (head office): sees and manages ALL branches' data, can switch into "view as branch X" mode, creates/edits/deletes branch logins, sets per-user module access and permission level (Full Access / custom).
- **Branch Admin / Staff** (branch login): can only see and act on their own branch's data. Cannot see other branches exist. Module access can be restricted per user (e.g., a staff user might only get Enquiry + Enrollment, not Finance).

### Data isolation
- Every business table has a `branch_id` foreign key.
- Enforce isolation with **Postgres Row Level Security (RLS) policies** in Supabase — branch users can only `SELECT/INSERT/UPDATE/DELETE` rows where `branch_id` matches their own; Super Admin role bypasses the branch filter.
- Store `role` and `branch_id` as custom claims on the Supabase JWT (via a Postgres trigger/function) so RLS policies and FastAPI middleware can both read them without extra DB round-trips.
- FastAPI must ALSO enforce role/branch checks in application code (defense in depth — don't rely on RLS alone). Every endpoint validates the JWT, extracts role + branch_id, and scopes queries accordingly.
- Admin-only actions (creating users, cross-branch exports) go through FastAPI endpoints using the Supabase **service role key** — this key must never be exposed to the frontend.

### Auth flow
- Supabase Auth for login (email/password, or email/mobile — match the screenshots which show mobile numbers as a key identifier for students but email/password for portal logins).
- `profiles` table linked to `auth.users`: stores `full_name`, `role` (super_admin / branch_admin / staff / custom), `branch_id`, `modules` (array/JSON of which modules this user can access), `permission_level`, `last_login`, `registered_at`.
- Super Admin can create new branch logins from the User Management screen (New User flow), assigning: name, email, mobile, role, branch, and which modules they can access.

---

## 4. Core Data Model (tables to design in Supabase)

- `branches` — id, name, address, created_at, created_by
- `profiles` — id (fk auth.users), branch_id, full_name, email, mobile, role, modules[], permission_level, last_login, registered_at
- `enquiries` — branch_id, student name, mobile, program, year_of_study, reference_source, status (New / Contacted / Interested / Converted), created_at
- `enrollments` — branch_id, student info, program, batch_id (fk), total_fee, paid_amount, pending_amount, fee_status (Paid/Partial/Pending), year_of_study, created_at
- `batches` — branch_id, batch_name, program, trainer, start_date, end_date, seats_total, seats_filled, mode (Online/Offline/Hybrid), status (Upcoming/Active/Completed)
- `curricula` — branch_id, program, title, status (Draft/Published), phases[] (each phase: title, description, order)
- `batch_execution` — links a batch_id to a curriculum_id, tracks per-phase/session completion status and progress %
- `expenses` — branch_id, title, category, amount, vendor, date, status (Pending/Approved), created_by
- `campaigns` — branch_id, name, type (Email/WhatsApp/General), target_audience, budget, leads_generated, status (Draft/Active/Completed)
- `email_campaigns` / `whatsapp_blasts` — branch_id, campaign_id, content, recipients count, sent_at, delivery stats
- `lead_sources` — branch_id, source_name, count (or derive this from enquiries.reference_source via aggregation)
- `audit_log` — user_id, branch_id, action, entity, entity_id, timestamp (track key changes for admin oversight)

Every table above must carry `branch_id` and be covered by RLS policies.

---

## 5. Functional Requirements by Module

### 5.1 Dashboard (landing page after login)
- Welcome header with logged-in user's name.
- Grid of module cards (Enquiry, Enrollment, Batch Management, Batch Execution, Curriculum, Expense Management, AI Reports, My Profile, Marketing Hub), each showing a live count/stat (e.g., "0 enquiries", "₹0 this month") and navigating to that module on click.
- A "Summary View" section below the cards with filters (Filter by Year, Filter by Month, Filter by Program) and a Clear button, plus three summary stat cards: Total Enquiries (with conversion count), Students Enrolled (with revenue), Total Expenses (with record count).
- An "Export Excel" button in the top-right of every module screen that exports that module's current data to an .xlsx file.
- For Super Admin: a branch selector/switcher so the dashboard can show aggregated data across all branches OR be scoped to one selected branch. For a branch login: no switcher, just their own data.

### 5.2 Enquiry Management
- Stat cards: Total Enquiries, New, Contacted, Interested, Converted.
- "Enquiries by Program" breakdown (cards per program, e.g. Robotics, IIoT, AI/ML, Cloud/DevOps, Full Stack — but make the program list configurable/dynamic, not hardcoded, since different businesses will offer different programs).
- "Enquiries by Reference Source" panel (or "No data yet" empty state).
- "Enquiries by Year of Study" horizontal bar breakdown (1st–4th year).
- "Recent Enquiries" table (last 5) with columns: Name, Mobile, Program, Year, Reference, Status, Date; a "View All" link to a full List View.
- Toggle between Dashboard view and List View (full table with search/filter/sort/pagination).
- "New Enquiry" form to capture a lead.
- Status pipeline: New → Contacted → Interested → Converted (should be updatable per enquiry, and converting an enquiry should be able to create a linked Enrollment record).

### 5.3 Enrollment Management
- Stat cards: Total Enrolled, Fee Pending, Partial Payment, Fully Paid, Total Revenue.
- "Enrollments by Program" breakdown cards.
- "Fee Collection Status" bar breakdown (Paid/Partial/Pending) and "Enrollments by Year of Study" breakdown.
- "Students with Pending/Partial Fees" table: Name, Program, Batch, Total Fee, Paid, Pending, Status; "View All" link.
- "New Enrollment" form; List View with full CRUD.
- Recording a payment against an enrollment should update fee_status and pending_amount automatically, and should feed into Finance/revenue totals.

### 5.4 Batch Management
- Stat cards: Total Batches, Active, Upcoming, Completed.
- "Batches by Program" breakdown.
- "Batches by Mode" breakdown (Online/Offline/Hybrid) and "Seat Utilisation by Batch" panel.
- "All Batches (Quick View)" table: Batch, Program, Trainer, Start, End, Seats, Mode, Status; "View All" link.
- "New Batch" form; List View with full CRUD.

### 5.5 Batch Execution Tracker
- Two dropdowns: "Select Batch" and "Linked Curriculum" — choosing a batch auto-suggests/links its curriculum (based on program match), user can override.
- Once both are selected, show a session/phase-by-phase tracker: each curriculum phase listed with checkboxes/status (Not started/In progress/Completed), completion %, and notes per session.
- Before selection: friendly empty state ("Select a batch above to view and track its curriculum progress").
- Progress here should roll up into the Batch Management "Active/Completed" status and the Dashboard's Batch Execution card.

### 5.6 Curriculum Management
- Stat cards: Curricula (total), Published, Drafts, Total Phases.
- "By Program" breakdown cards.
- Empty state: "No curricula yet. Click New Curriculum to get started."
- "New Curriculum" builder: title, program, list of phases (each with title, description, order, estimated duration) — support drag-to-reorder phases.
- Ability to Publish/unpublish (Draft ↔ Published) and edit an existing curriculum. List View with all curricula and their program/status.

### 5.7 Marketing Hub
- Top nav within module: Dashboard / Campaigns / Email / WhatsApp / Lead Sources tabs.
- Dashboard tab stat cards: Campaigns, Email Campaigns, WhatsApp Blasts, Leads Tracked.
- "Recent Campaigns" table: Campaign, Type, Target, Budget, Leads, Status; empty state "No campaigns yet. Click Campaign to create one."
- "Lead Source Breakdown" panel (empty state: "No lead source data yet. Tag enquiries with a campaign source.") — should populate from enquiries' `reference_source`/campaign tagging once data exists.
- "Campaign Status Overview" panel.
- Campaigns tab: create/edit campaigns (name, type, target audience, budget, linked program).
- Email tab: compose/send email campaigns to a segment (e.g., all pending-fee enrollments), basic template + recipient count.
- WhatsApp tab: compose/send WhatsApp blasts similarly (can be a stub/integration point for a WhatsApp Business API provider — build the UI and data model fully, backend can call a real provider or a mock service depending on what's configured).

### 5.8 Finance / Expense Management
- Stat cards: Total Expenses, This Month, Total Records, Approved.
- "By Category" section (bar/pie breakdown once data exists).
- "Recent Expenses" table: Title, Category, Amount, Date, Vendor, Status; "View All" link; empty state "No expenses yet."
- "New Expense" form with category, amount, vendor, date, receipt/notes, and an approval status workflow (Pending → Approved, with the approver recorded).
- Should feed into the Dashboard's Total Expenses summary card.

### 5.9 Reports & Analytics — AI Reports Assistant
- Conversational UI: chat bubble interface, an assistant greeting message, and a row of suggested-question chips (e.g., "How many enquiries do we have?", "Which program has the most enrollments?", "What is the total revenue collected?", "List all active batches", "Show pending fee summary", "What is the conversion rate?").
- Text input at the bottom ("Ask a question about your data…") with Enter-to-send.
- Backend: a FastAPI endpoint that takes the natural-language question + the requesting user's branch scope, retrieves relevant live data from Supabase (scoped correctly — branch users only ever see their own branch's data even through this assistant), and sends a prompt to an LLM to generate a grounded, accurate answer. Must not hallucinate numbers — construct the prompt so the model answers strictly from the retrieved data.
- "Export Excel" button available here too (export the underlying report data).

### 5.10 My Account
- Profile card: name, User ID, email, mobile, role, registered date, last login.
- "Data Backup & Restore" section:
  - Export Backup: shows live counts (Enquiries, Enrollments, Batches, Expenses, Curricula) and a "Download Backup (.json)" button that exports all of that user's/branch's (or, for Admin, all) data as JSON.
  - Import Backup: "Choose Backup File" — preview the file contents before confirming restore, then restore records via the backend (validate structure before writing to DB; never blindly trust the uploaded JSON).
- Note: unlike the reference screenshot (which mentions "stored in this browser's localStorage"), your version should be backed by real Supabase data — reframe this section as a genuine export/import of the user's actual database records, not a localStorage gimmick.

### 5.11 User Management (Super Admin primary; branch admins may get a limited view for their own branch's staff)
- Stat cards: Total Users, Super Admins, Staff, Custom Role.
- "Users by Role" breakdown chart.
- "Module Access Coverage" panel — horizontal bars showing how many users have access to each module (Enquiry, Enrollment, Batch Mgmt, Batch Execution, Curriculum, Expenses, Reports, Marketing, Profile).
- "All Users" table: Name, User ID, Email, Role, Modules (list/summary), Permissions (Full Access/Custom), Last Login; "View All" link.
- "New User" flow: create a login for a new branch or staff member — assign name, email, mobile, password (or invite-link flow), branch, role, and which specific modules they can access. This is the endpoint that must use the Supabase service-role key server-side via FastAPI (never client-side).
- Super Admin can edit/deactivate/delete any user; branch admins (if given this permission) can only manage users within their own branch.

---

## 6. Cross-Cutting Requirements

- **Branch switcher for Super Admin**: a persistent control (e.g., in the top bar) letting the admin view "All Branches" (aggregated) or drill into a specific branch's exact view as that branch would see it.
- **Export Excel**: every module dashboard/list screen needs a working Excel export of its current (filtered) dataset.
- **Empty states**: every list/table needs a clear, friendly empty state (as shown throughout the screenshots) rather than a blank area.
- **Loading states**: use skeleton loaders or spinners consistent with the rest of the design system, not the default browser spinner.
- **Responsive design**: sidebar collapses to a mobile-friendly nav on small screens.
- **Consistent module pattern**: each module should follow the same shape — Dashboard sub-view (stat cards + breakdowns + recent table) and List View sub-view (full searchable/sortable/paginated table) — so the codebase stays consistent and maintainable.
- **Notifications/toasts** for success/error states on all create/update/delete actions.
- **Form validation** on every create/edit form (required fields, correct formats for mobile numbers, amounts, dates).
- **Audit trail**: log key mutating actions (who created/edited/deleted what and when) — at least for financial and user-management actions.

---

## 7. Suggested Build Order (for Claude Code to follow)

1. Set up the monorepo structure (`/frontend`, `/backend`), environment configs, and Supabase project (tables, RLS policies, auth triggers for JWT claims) — get multi-tenancy correct before any UI.
2. Build FastAPI skeleton: JWT verification middleware/dependency, health check route, and one complete vertical slice (Enquiry CRUD) through all three layers (React → FastAPI → Supabase) to prove the pattern end-to-end.
3. Build the React shell: login page, auth context (role + branch_id from session), sidebar navigation, dashboard layout, branch switcher (hidden for non-admins).
4. Implement modules in this order, each following the proven vertical-slice pattern: Enquiry → Enrollment → Batch Management → Curriculum → Batch Execution (depends on Batches + Curriculum) → Finance → Marketing Hub → Reports/AI Assistant → User Management → My Account (backup/restore).
5. Wire up Excel export and JSON backup/restore.
6. Implement the AI Reports Assistant backend (data retrieval + LLM prompt construction, scoped by branch).
7. Polish: empty states, loading states, responsive pass, toasts, final design pass on the dashboard cards/visual identity.
8. Write a README covering: environment variables needed, how to run locally, how Supabase RLS policies are structured, and the roles/permissions model.

---

## 8. Deliverable Expectations

- Full working codebase (frontend + backend), not a prototype/mock.
- Supabase schema + RLS policy SQL included (as migration files).
- Seed script to create one Super Admin account for first login.
- Clear separation between admin-only and branch-scoped functionality, enforced at both the database (RLS) and API (FastAPI) layers.
- A visually distinctive, professional UI — improve on the reference screenshots' look and feel while preserving 100% of the functionality described above.
