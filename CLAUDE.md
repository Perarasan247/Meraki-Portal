# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Meraki AI Labs – Internship Portal. A single self-contained web app that manages
enquiries, enrollments, batches, curriculum, expenses, marketing, and users for an
AI-training / internship business.

## Structure

- **`meraki-alai-firebase (7).html`** — the entire application. One file (~27.8k lines)
  containing all HTML, CSS (inline `<style>`), and JavaScript (inline `<script>`).
  There is no build step, bundler, framework, or `package.json`. Open the file in a
  browser and it runs.

## Tech stack

- **Firebase (compat SDK, loaded from CDN):** `firebase-app-compat`,
  `firebase-auth-compat`, `firebase-firestore-compat`.
- **Auth:** Firebase Auth. Multiple sign-in paths are wired
  (email/password, email link, phone, popup/redirect, custom token).
  `onAuthStateChanged` gates the app — unauthenticated users see the landing/login,
  authenticated users see the role-based portal.
- **Database:** Cloud Firestore. Known collections: `users`, `enquiries`.
- **Export:** SheetJS (XLSX) for table export; a PDF viewer is embedded.

> The Firebase config in the file is still a placeholder (`YOUR_PROJECT_ID`).
> A real Firebase project's config must be filled in before auth/data work.

## Roles

`HR`, `Admin`, `Mentor`, `Intern`, `Student`. The `role` field on the `users`
document drives which navigation and views are shown.

## UI layout convention

The single file holds two shells:

1. **Public landing page** — `#lp` with nav `lpnav-home / lpnav-about /
   lpnav-services / lpnav-contact` and sections `lp-home / lp-about / lp-services /
   lp-contact`. Headings: "Welcome to Meraki Ai Labs", "About Meraki AI Labs",
   "Our Core Expertise", "Training & Internship Programs", "Get In Touch".
2. **Authenticated portal** — dashboard views prefixed per module, e.g.
   `en-*` (enquiry), `eq-*`, `cu-*` (curriculum), `ex-*` (expense),
   `mk-*` (marketing), `bt-*` (batch). Pattern per view:
   `*-vbtn-dash` (nav button), `*-v-dash` (view container),
   `*-view-title` / `*-view-sub` (heading).

## Working notes

- It is one giant file — use `grep`/offset reads, never read the whole thing at once
  (it exceeds the read size limit).
- No tests, no lint, no CI. "Run" = open in a browser (ideally served over
  `http://localhost` so Firebase Auth domains work, not `file://`).
- Preserve the existing inline-everything style unless the user explicitly asks to
  split the app into separate files.
