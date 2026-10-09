# NITER Job Portal — Audit Report

READ-ONLY audit (React + Vite client, Supabase/PostgreSQL + RLS, edge functions, Vercel + Supabase cloud).
Severity: Critical / High / Medium / Low. Status: Working / Partial / Broken / Placeholder.

## Executive summary

Health scores (out of 10): Features 8 · Database & security 6 · Frontend quality 7 · UX & design 8 · Performance & deployment 6 · Vision completeness 7. Overall the app is a coherent, working MVP; one Critical security hole dominates the risk.

10 most important problems: (1) signup role escalation — anyone can self-register as ADMIN (Critical); (2) zero tests and no CI (High); (3) missing indexes on all profile-table FKs (High); (4) `uploads` bucket not versioned in migrations (High); (5) 1.29 MB single JS bundle, no code splitting (Medium); (6) admin application/interview lists swallow query errors (Medium); (7) blocking `alert()` in RecruiterDashboard + Messages (Medium); (8) recruiter "Create Company Profile" dead-end (Medium); (9) reminder cron likely never activated (placeholder ref) (Medium); (10) duplicated UI kit across the three profile pages (Medium).

10 best improvements: application withdraw (High impact, S) · saved jobs + alerts (High, M) · CI with lint+build (High, S) · signup role allowlist (Critical, S) · FK index migration (High, S) · route-level code splitting (Medium, S) · public company pages (Medium, M) · reports CSV export (Medium, S) · profile photo upload (Medium, S) · notification preferences (Medium, S).

`npm run lint`: passes with warnings only (unused identifiers in RecruiterDashboardPage, pre-existing set-state-in-effect notes). `npm run build`: green in ~0.6s, one 1.2 MB chunk (`dist/assets/index-*.js`).

## PASS 1 — Feature inventory per role

### Public
- `/` HomePage.jsx (50 lines) — landing page. Working (static; no data needed).
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` — Supabase Auth via AuthProvider (signIn/signUp/resetPassword/updatePassword). Working. VerifyEmailPage is static text only, no resend action (Partial).
- `/jobs`, `/jobs/:id` (STUDENT+ALUMNI) — search/filter + detail, apply with CV select, duplicate-apply (23505) and 70%-rule errors handled. Working.

### Student (`/student/*`)
- `/student/dashboard` (271 lines) — stats, completeness checklist (per-item booleans, scoped counts, error alert), recent apps, interviews, recommendations. Working.
- `/student/applications` (165) — list + withdraw?, error/empty states. Working (verify withdraw exists — see P3).
- `/student/profile` (1385) — header + completion, personal/social/education/skills/experience/projects/CV sections, confirm deletes, flash feedback. Working.
- `/student/interviews` (210) — loads via hook/effect, empty state. Working.
- `/student/events` (256) — browse + register with duplicate handling. Working.

### Alumni (`/alumni/*`)
- `/alumni/dashboard` (246) — posted jobs + submit-for-approval, referrals, applications. Working.
- `/alumni/jobs/new` (260) — creates job as DRAFT/ALUMNI; approval happens from dashboard. Working end-to-end.
- `/alumni/applications` (135), `/alumni/referrals` (204) — lists + actions, error states. Working.
- `/alumni/jobs/:jobId/applicants`, `/alumni/applicants/:applicationId` — reuse recruiter components. Working (same code path).
- `/alumni/profile` (825) — mirrors student profile sections + own completeness. Working.

### Recruiter (`/recruiter/*`)
- `/recruiter/dashboard` (486) — stats + lists (DashboardLists). Working.
- `/recruiter/company` (769) — view/edit modes, verification badges (read-only), completion. Working.
- `/recruiter/jobs` (176) — list + submit-for-approval + close. Working.
- `/recruiter/jobs/new`, `/:jobId/edit` (454) — DRAFT + approval note. Working.
- `/recruiter/jobs/:jobId/applicants` (581) — filters, per-row + bulk status changes (Promise.allSettled), flash. Working.
- `/recruiter/applicants/:applicationId` (377) — profile + CV review + decision. Working.
- `/recruiter/campus` (427) — request form inserts to campus_recruitment. Working.

### Faculty (`/faculty/*`)
- `/faculty/dashboard` (173), `/faculty/students` (151) — lists with is_verified flags. Working.
- `/faculty/students/:studentId` (389) — full profile review + verify/unverify + recommend. Working.
- `/faculty/events` (338) — create/manage + registrations. Working.
- `/faculty/reports` (323) — placement stats. Working (verify charts lib — see P5).

### Admin (`/admin/*`)
- `/admin/dashboard` (129) — counts + pending queues, links. Working.
- `/admin/users` (249) — search/filter/message/approve/suspend + recruiter verify. Working.
- `/admin/jobs` (142) — PUBLISHED/PENDING_APPROVAL/REJECTED/CLOSED transitions. Working.
- `/admin/companies` (139) — verify/reject. Working.
- `/admin/applications` (110), `/admin/interviews` (109) — read-only monitoring lists. Working (no actions by design).
- `/admin/events` (249) — CRUD. Working.
- `/admin/reports` (380), `/admin/analytics` (268) — charts/tables. Working (verify recharts — see P5).
- `/admin/campus` (108) — approve/reject requests. Working.

### Shared (all roles)
- `/messages`, `/messages/:conversationId`, `/notifications` — modern UI, sender-only message delete, owner-only notification delete + Clear all, realtime sync. Working.

### Dead code
- `DashboardPlaceholder.jsx` + `placeholderDashboards = []` (App.jsx:51) — route never registers. Low: delete file and dead map. `client/src/App.jsx:51`, `client/src/pages/DashboardPlaceholder.jsx`.

### Old known gaps (planning doc) — re-verified in code
- Notifications → FIXED (page + bell + realtime). Bulk actions → FIXED (applicants bulk, notifications Clear all, BulkInterviewModal). Applicant list/profile → FIXED. Unread message badge → FIXED (my_conversations unread_count + realtime). Notification delete → FIXED (owner-only RLS + UI). 70% rule → FIXED (DB trigger `trg_applications_guard_completeness` + friendly UI error). Recruiter dashboard → FIXED (real stats/lists page).

## PASS 2 — Database and security

- Critical: privilege escalation at signup. `handle_new_user()` casts client-supplied `raw_user_meta_data->>'role'` straight to `user_role` (`supabase/migrations/20260831000002_rls_policies.sql:28-43`); the UI dropdown excludes ADMIN (`client/src/utils/roles.js:18`) but anyone can call `auth.signUp` with `{"role":"ADMIN"}` and become admin. Fix: allowlist to STUDENT/ALUMNI/RECRUITER/FACULTY in the trigger (new migration).
- High: missing indexes on hot FK/filter columns — `cvs.student_id`, `education.student_id`, `experience.student_id`, `projects.student_id`, `student_skills(student_id, skill_id)`, `event_registrations`, `interviews.application_id`, `recommendations`, `referrals`, all `alumni_*` tables. Only jobs/applications/messages/members/notifications are indexed. Fix: one index migration.
- High: `uploads` storage bucket is not created in any migration (no `storage.buckets` insert found) — fresh deploys/clones break CV/photo uploads. Fix: add bucket-seed migration or document manual step.
- Medium: `skills` insert open to any authenticated user (`20260831000002_rls_policies.sql:443-444`) — junk skill names pollute the shared table (unique blocks dupes only). Fix: restrict inserts or add moderation/trim validation.
- Medium: `placements` read policy name says admin/faculty but also grants RECRUITER (`20260831000002_rls_policies.sql:410-413`) — works, but intent unclear; confirm or rename. Fix: align name with intent.
- Low: migration number gap — `...00015` then `...00017` (no 00016). Harmless but confusing. Fix: leave history alone; note in README.
- Low: `notifications.type` is free text, no constraint — typos fragment analytics/filters. Fix: enum or check constraint.
- Verified OK (PASS 2): RLS enabled on all 34 tables; all 27 SECURITY DEFINER functions set fixed `search_path`; `audit_logs`/`email_logs`/`interview_reminders` policy-less by design (service-role only); anon SELECT grant is neutralized by RLS policies; applications one-candidate CHECK + unique constraints present; no conversation/message delete-all (history preserved by design); `users.email`/`student_id` uniqueness enforced.

## PASS 3 — Frontend quality

- Medium: duplicated shared UI — `Section`/`Flash`/`Field`/`EmptyState`/`ConfirmDialog` copy-pasted across StudentProfilePage (1385 lines), AlumniProfilePage (825), CompanyProfilePage (769); `timeAgo` duplicated in DashboardLayout + NotificationsPage; `typeMeta` likewise. Fix: extract `components/ui/` kit (Section, Flash, EmptyState, ConfirmDialog, TimeAgo).
- Medium: silent query failures — AdminApplicationsPage (`.then(({data})`, ~line 18-27) and AdminInterviewsPage (~line 18-29) ignore errors, showing an empty list on failure. Fix: capture error state + retry UI like other pages.
- Medium: nested double route guards — every role route wraps DashboardLayout in ProtectedRoute AND each child page again (`client/src/App.jsx:65-234`). Harmless but noisy. Fix: guard once at layout level.
- Low: unused dependency `zustand` in `client/package.json` (zero imports in src). Fix: `npm uninstall zustand`.
- Low: dead identifiers — unused `MoreHorizontalIcon` import, `ConfirmDialog` + `confirmDialog` in `RecruiterDashboardPage.jsx:30,104,132` (lint warnings, build still green). Fix: delete them.
- Low: dead `console.log` realtime notice (`client/src/hooks/useMessages.js:69`); rest are console.error/warn which are fine. Fix: remove the log line.
- Low: wide `select('*')` on single-row/list fetches (AuthProvider, useProfiles hooks, JobsPage `select('*, companies(name))`). Works, but over-fetches. Fix: list needed columns.
- Low: sequential awaits in ApplicantDetailPage (~lines 53-124: app, alumni, update, notify, start_conversation) — could be parallelized where independent. Fix: Promise.all for independent reads.
- Low: weak client validation — CGPA/year/phone are free-text inputs with no range checks (StudentProfilePage, AlumniProfilePage). DB has numeric types but no range CHECKs either. Fix: add min/max validation + DB check constraints.
- Verified OK: realtime cleanup (`removeChannel` in effect returns), `active`-flag guards against set-state-after-unmount, no secrets in code (env via `import.meta.env`, `client/src/lib/supabase.js:1-11`), no N+1 fan-out (joins via PostgREST embeds), hooks reuse (useProfiles/useMessages/useAuth).

## PASS 4 — UX and design

- Medium: blocking `alert()` calls freeze the UI — `RecruiterDashboardPage.jsx:195,206`, `MessagesPage.jsx:57`. Fix: replace with inline alert/flash state like other pages.
- Medium: recruiter company dead-end — save button says "Create Company Profile" (`CompanyProfilePage.jsx:758`) but submit throws "No company linked… contact an admin" (`:239`); empty-state section exists (`:408`) yet the misleading button remains. Fix: hide save when unlinked, show admin-contact CTA only.
- Low: no toast system — all feedback is inline alerts/flashes (consistent, but success messages vanish on navigation). Fix: optional tiny toast context; not urgent.
- Low: DaisyUI + responsive grids + empty states are consistent across all 40+ pages; icon buttons carry aria-labels (10 in NotificationsPage, 9 in DashboardLayout); native `<dialog>` gives focus handling; `index.html` has lang/viewport/title. Contrast ratios not verified visually.
- Verified OK: role-based nav, back links, badge/status language consistent, read-only admin pages are correctly labeled "monitoring".

## PASS 5 — Performance and deployment

- High: no tests and no CI — zero `*.test.*`/`*.spec.*` files, no `.github/workflows`. A broken commit can ship silently. Fix: add CI running `npm run lint` + `npm run build`, then a few smoke tests (auth, apply flow).
- Medium: 1.29 MB single JS bundle (`client/dist/assets/index-*.js`), no code splitting in `client/vite.config.js`. Fix: `React.lazy` per route + `manualChunks` for vendor/recharts.
- Medium: interview-reminder cron likely not live — `supabase/cron-setup*.sql` still contains `<YOUR_PROJECT_REF>` placeholder; deployment state not verifiable from repo. Fix: fill ref, run in dashboard, confirm `cron.job_run_details`.
- Medium: duplicate fetching, no cache layer — DashboardLayout and each page mount separate `useNotifications`/`useConversations` instances (2 realtime channels + 2 fetches for the same data), no React Query. Fix: share one hook instance via context or add React Query.
- Low: `process-approval` and `validate-upload` edge functions have no callers in client or migrations (only `send-email` is invoked, via `client/src/utils/email.js:16`, secrets via env — good). Fix: wire them up or delete to avoid confusion.
- Low: email deliverability depends on Resend domain verification + dashboard secrets — not verifiable from repo. Fix: verify domain + set `RESEND_API_KEY` in Supabase + Vercel envs.
- Low: no error monitoring (Sentry etc.), console-only logging; backups depend on Supabase plan/PITR (verify in dashboard). Fix: add Sentry + confirm PITR.
- Verified OK: Vercel SPA rewrite present (`client/vercel.json`); CVs served via signed URLs; logos are hotlinked URLs (no storage cost); env vars via `import.meta.env` (confirm `VITE_*` set in Vercel dashboard).

## PASS 6 — Missing features and improvements (verified absent/weak; present items omitted)

- Application withdraw — no withdraw action in ApplicationsPage (status enum supports WITHDRAWN but UI never sets it). Impact High, effort S. Fix: "Withdraw" button updating status (RLS already allows student update).
- Saved jobs / job alerts — zero code (`saved_job`/`bookmark` absent). Impact High, effort M. Fix: saved_jobs table + bell/page section + alert emails via existing send-email.
- Public company pages — no `/companies` route; company info only inside job detail. Impact Medium, effort M. Fix: list + detail pages reusing CompanyProfile read paths.
- Reports export (CSV/PDF) — AdminReportsPage has no export. Impact Medium, effort S. Fix: CSV download of current tables.
- Notification preferences — no opt-out/granularity anywhere. Impact Medium, effort S. Fix: preferences column + toggles, checked in notify triggers.
- Profile photo upload — `students.profile_photo` column exists but zero UI usage (initials avatars instead). Impact Medium, effort S. Fix: storage upload in profile page (bucket + policy pattern already exists for CVs).
- Interview feedback / offer letters — scheduling + notes exist, no structured feedback or offer step. Impact Medium, effort M. Fix: feedback fields on interviews + offer status on applications.
- Audit log coverage — `audit_logs` table written only by the email trigger; no admin-action logging. Impact Medium, effort M. Fix: log verify/publish/suspend actions.
- Dark-mode toggle — themes configured (`light --default, dark --prefersdark`) but no user toggle. Impact Low, effort S. Fix: theme controller dropdown.
- Onboarding / Help-FAQ / Terms / Privacy — no routes or pages. Impact Low (Medium for institutional adoption), effort S-M. Fix: static pages + first-login checklist.
- Rate limiting — none beyond Supabase Auth defaults; forms/edge functions unguarded. Impact Low-Medium, effort S. Fix: Supabase Auth rate config + edge-function throttling.
- AI features (CV feedback, skill-gap, matching) — absent by design (roadmap-future); basic skill-match display exists via `utils/matching.js` in JobCard. Impact Low now, effort L. Fix: keep post-MVP.
- Present, not listed as gaps: faculty verification, admin charts, alumni parity, event registration, job filters, spam reporting, 70% gate.
