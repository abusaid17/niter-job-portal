# Agent Prompts — first 12 roadmap tasks (Sprint 0 + Sprint 1 start)

Paste one per session. Context: NITER Job Portal (React+Vite `client/`, Supabase/Postgres + RLS, Vercel + Supabase cloud).

## P-01 — S0-01 Signup role allowlist

Task: close privilege escalation A-01 with a NEW Supabase migration (never edit old ones).
Rules: no git checkout/reset/restore/stash; read files first (`supabase/migrations/20260831000002_rls_policies.sql:28-43`); small edits; `npm run build` after every two edits; stop after two failed builds for same reason; cloud Supabase only; no realtime changes.
Requirements: new migration `..._signup_role_allowlist.sql` that rewrites `handle_new_user()` so `users.role` is allowlisted to STUDENT/ALUMNI/RECRUITER/FACULTY (anything else, incl. ADMIN, becomes STUDENT); existing users untouched; keep fixed `search_path`.
Acceptance: (1) crafted `auth.signUp` with `{"role":"ADMIN"}` yields STUDENT; (2) valid roles unchanged; (3) migration re-runnable (`create or replace`).
Run lint and build once. Report in 4 lines.

## P-02 — S0-02 FK index migration

Task: add missing FK indexes (A-02) in ONE new migration.
Rules: no git checkout/reset/restore/stash; read `20260831000001_initial_schema.sql` index section first; small edits; build after every two edits; stop after two same-reason failures; cloud Supabase only; no realtime changes.
Requirements: `CREATE INDEX IF NOT EXISTS` on `cvs/education/experience/projects/student_skills/event_registrations/interviews/recommendations/referrals/alumni_*` FK columns; nothing else in the file.
Acceptance: (1) all indexes created; (2) file applies twice cleanly; (3) no table/column/policy touched.
Run lint and build once. Report in 4 lines.

## P-03 — S0-03 Seed uploads bucket

Task: make fresh deploys able to upload (A-03) via a NEW migration.
Rules: no git checkout/reset/restore/stash; read `20260831000003_storage_policies.sql` first; small edits; build after every two edits; stop after two same-reason failures; cloud Supabase only; no realtime changes.
Requirements: insert private bucket `uploads` (`on conflict do nothing`); do not duplicate existing storage policies.
Acceptance: (1) re-runnable; (2) student CV upload + download works; (3) other roles' files unreadable.
Run lint and build once. Report in 4 lines.

## P-04 — S0-04 CI workflow

Task: add GitHub CI running lint + build (A-04).
Rules: no git checkout/reset/restore/stash; read `client/package.json` scripts first; small edits; stop after two same-reason failures.
Requirements: new `.github/workflows/ci.yml` (push + PR, Node LTS, `npm ci`, `npm run lint`, `npm run build` in `client/`); no code changes.
Acceptance: (1) YAML valid; (2) runs the exact repo scripts; (3) red build would fail the job.
Run lint and build once. Report in 4 lines.

## P-05 — S0-05 Silent admin list failures

Task: AdminApplications + AdminInterviews must show errors, never fake-empty lists.
Rules: no git checkout/reset/restore/stash; read both files fully first; small edits, one section at a time; build after every two edits; stop after two same-reason failures; no migrations, no realtime changes.
Requirements: capture query errors into state; error alert + Retry button; keep filters, data mapping, and read-only design identical.
Acceptance: (1) forced failure shows message + retry; (2) retry reloads; (3) success path pixel-identical.
Run lint and build once. Report in 4 lines.

## P-06 — S0-06 Replace blocking alert()

Task: replace `alert()` in `RecruiterDashboardPage.jsx:195,206` and `MessagesPage.jsx:57` with inline feedback. Do NOT touch messaging logic/routes.
Rules: no git checkout/reset/restore/stash; read both call sites first; small edits; build after every two edits; stop after two same-reason failures; no migrations/realtime changes.
Requirements: same messages via existing flash/alert state; no behavior change besides non-blocking display.
Acceptance: (1) zero `alert(` in `client/src`; (2) each error still visible; (3) build green.
Run lint and build once. Report in 4 lines.

## P-07 — S0-07 Company dead-end fix

Task: unlinked recruiters see guidance, never a throwing save button (`CompanyProfilePage.jsx:239,758`).
Rules: no git checkout/reset/restore/stash; read the file's empty-state + submit sections first; small edits; build after every two edits; stop after two same-reason failures; no migrations/realtime changes; do not change linked-company save logic.
Requirements: hide/disable save when no company linked; keep admin-contact CTA; linked flow byte-identical in behavior.
Acceptance: (1) unlinked account cannot reach the throw; (2) linked save still works; (3) verification badges untouched.
Run lint and build once. Report in 4 lines.

## P-08 — S0-08 Policy hygiene

Task: rename misleading `placements` read policy + restrict junk `skills` inserts (ONE new migration).
Rules: no git checkout/reset/restore/stash; read the two policies first; small edits; stop after two same-reason failures; cloud Supabase only; no realtime changes.
Requirements: `placements` policy name matches its ADMIN/FACULTY/RECRUiter intent with zero behavior change; `skills` insert rejects blank/overlong names (keep legit inserts working).
Acceptance: (1) recruiter reads still pass; (2) `' '` insert fails, `'React'`-style insert passes; (3) re-runnable.
Run lint and build once. Report in 4 lines.

## P-09 — S0-09 Cron + env correctness

Task: make reminders/emails actually fire; verify env (ops + checklist, minimal code).
Rules: no git checkout/reset/restore/stash; read `supabase/cron-setup-production.sql` + `supabase/functions/send-email/index.ts` first; small edits; stop after two same-reason failures.
Requirements: fill the real project ref in the cron SQL; document required Vercel (`VITE_*`) + Supabase (`RESEND_API_KEY`) vars + Resend domain check; change code only if a call is malformed.
Acceptance: (1) `cron.job_run_details` shows runs; (2) test interview email lands in inbox; (3) checklist committed to docs.
Run lint and build once. Report in 4 lines.

## P-10 — S0-10 Rate limiting baseline

Task: document + enable baseline throttling (no code rewrite).
Rules: no git checkout/reset/restore/stash; skim AuthProvider + apply/register submit paths first; small edits only if adding button-disable guards; stop after two same-reason failures.
Requirements: enable Supabase Auth rate limits (dashboard, documented); list unguarded forms in docs; add `disabled={saving}`-style guards only where missing.
Acceptance: (1) limits enabled + documented; (2) rapid double-submit cannot duplicate rows; (3) no UX regression.
Run lint and build once. Report in 4 lines.

## P-11 — S1-01 Faculty profile page

Task: add missing `/faculty/profile` self-service page + route.
Rules: no git checkout/reset/restore/stash; read `App.jsx` faculty routes + `useFacultyProfile` + one existing profile page for style first; small edits; build after every two edits; stop after two same-reason failures; no migrations/realtime changes.
Requirements: FACULTY-guarded route; view/edit own `faculty` row only (RLS already allows); match DaisyUI style; add nav entry if the pattern fits.
Acceptance: (1) save persists; (2) another faculty member's row unreadable/unwritable; (3) build green.
Run lint and build once. Report in 4 lines.

## P-12 — S1-02 Application stage tracker

Task: visual pipeline on `ApplicationsPage.jsx` (no logic/route/DB change).
Rules: no git checkout/reset/restore/stash; read the file fully first; small edits; build after every two edits; stop after two same-reason failures; no migrations/realtime changes.
Requirements: map every application status to steps Applied→Review→Shortlist→Interview→Selected, highlight current, handle Rejected/Withdrawn/Expired as end states; mobile wrap; statuses and queries untouched.
Acceptance: (1) 3+ different statuses render correct steps; (2) no horizontal scroll at 375px; (3) build green.
Run lint and build once. Report in 4 lines.
