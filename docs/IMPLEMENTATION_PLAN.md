# NITER Job Portal — Implementation Plan

## Executive summary

Planned items: **15 Missing, 9 Partial** (≈30 Done). New recommendations: **20** (N-01…N-20). Roadmap: **6 sprints, 53 tasks** (all S/M sized, dependencies ordered).
10 most valuable new recommendations: N-01 saved jobs · N-02 job alerts · N-03 noticeboard · N-04 interview feedback · N-05 offer management · N-06 mentorship · N-07 bulk import · N-08 notification preferences · N-09 funnel analytics · N-10 event check-in.

| Sprint | Focus | Tasks |
| --- | --- | --- |
| 0 | Security and stability (A-01…A-04, cron/env, error handling) | 10 |
| 1 | Partial fixes + small missing pieces | 9 |
| 2 | Missing core features | 10 |
| 3 | Medium polish and parity | 10 |
| 4 | Quality, performance, trust | 9 |
| 5 | Smart features (post-data) | 5 |

## PASS 1 — Planned but not implemented (vs planning doc sections 1-39)

Done items (≈30, one line): auth + role guards; student/alumni/recruiter/company profiles + CV upload; faculty verification + recommendation; job search/filter/detail; job posting + approval flow (both roles); student+alumni applications + tracking; shortlisting (incl. bulk); interview scheduling + reminders; campus request/approve; events CRUD + register/cancel; alumni referrals + job posts; messaging + notifications + realtime + deletes; all 10 admin pages; analytics charts; spam reporting; completeness checklists + 70% DB gate; email triggers + send-email.

| Planning section | Feature | Status | Evidence | What is left | Depends on |
| --- | --- | --- | --- | --- | --- |
| Faculty module | Faculty own-profile page | Missing | No `/faculty/profile` route in `client/src/App.jsx` | Self-service profile edit page | — |
| Application module | Withdraw application | Missing | No WITHDRAWN set in `pages/student/ApplicationsPage.jsx` | Withdraw button | — |
| Application module | Tracking timeline | Partial | Status list only, `pages/student/ApplicationsPage.jsx:68` | Timeline UI of status history | — |
| Interviews | Structured feedback | Missing | No feedback/rating fields in `components/interviews/InterviewModal.jsx` | Feedback form + display | — |
| Interviews | Offer letters/offers | Missing | No offer step in code | Offer status + letter | Feedback |
| Alumni networking | Mentorship | Missing | Only passing mentions (`HomePage`, `JobFormPage`); no table/UI | Mentor directory + requests | — |
| Alumni | Career talks / alumni events registration | Partial | View-only on `AlumniDashboardPage.jsx:215`; `event_registrations` is student-keyed | Alumni registration + talks list | — |
| Campus recruitment | Eligibility-driven drives | Partial | `eligibility jsonb` column exists, drive pipeline basic | Verify eligibility UI/filtering | — |
| Placement | Placement records creation | Partial | UI reads `placements` but zero INSERTs in client/migrations | Create on SELECTED (trigger/action) | — |
| Placement | NAAC-style per-department stats | Partial | Reports read empty `placements` table | Works once records exist | Placement creation |
| Documents | Certificates | Missing | No table, no code found | Table + upload/verify UI | Bucket (A-03) |
| Documents | CV builder / PDF export | Missing | Upload-only (`StudentProfilePage.jsx`) | Builder + export | — |
| Profiles | Photo upload | Missing | `students.profile_photo` unused in UI | Storage upload in profile | Bucket (A-03) |
| Jobs | Saved jobs + alerts | Missing | No `saved_job`/`bookmark` code | Table + UI + emails | send-email live |
| Jobs | Internship tracking | Partial | `INTERNSHIP` type filterable, no dedicated flow | Internship board/stats | — |
| Jobs | Public company pages | Missing | Only `/admin/companies`; no public route | List + detail pages | — |
| Admin | Reports export CSV/PDF | Missing | No export in `AdminReportsPage.jsx` | CSV download | — |
| Admin | Audit-log coverage | Partial | `audit_logs` written only by email trigger | Log admin actions | — |
| Admin | Bulk student import CSV | Missing | No import code found | Upload + parse + invites | — |
| Faculty | Skills/certification verification | Missing | Only profile `is_verified` flag | Per-skill endorse UI | — |
| Notifications | Preferences/opt-out | Missing | No toggles anywhere | Column + UI + trigger checks | — |
| Portal | Announcements/noticeboard | Missing | No code found | Table + homepage widget | — |
| Portal | FAQ/help/feedback, legal pages | Missing | No routes in `App.jsx` | Static pages + form | — |
| Portal | Bangla language | Missing | English-only strings | i18n + toggle | — |
| Portal | Dark-mode toggle | Partial | Themes configured, no switch | Theme controller | — |
| Portal | SEO/landing polish | Partial | Basic title/meta only | OG tags, sitemap | — |
| Security | Rate limiting | Missing | Beyond Supabase Auth defaults, none | Throttle forms/edge fns | — |
| Phase 3/AI | Job matching, CV feedback, skill-gap | Missing | Only skill display in `utils/matching.js`+JobCard | Post-MVP services | Data volume |

## PASS 2 — What a university portal should also have (new, not already planned; sorted by value)

| ID | Recommendation | Why it matters | Impact | Effort | Risk | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| N-01 | Saved jobs (bookmark + list) | Students track interesting roles; standard expectation | High | M | Low (new table + RLS) | — |
| N-02 | Job alerts (digest emails) | Drives applications; students miss deadlines otherwise | High | M | Spam perception → frequency caps | N-01, send-email live |
| N-03 | Announcements/noticeboard | Career office broadcasts reach everyone, not just applicants | High | S | Low | — |
| N-04 | Structured interview feedback | Placement quality + records; recruiters currently use free notes | High | M | Low | — |
| N-05 | Offer management (status + letter) | Closes the loop student→selected→placed; feeds placements table | High | M | Low | N-04 (soft) |
| N-06 | Alumni mentorship directory + requests | Core alumni value beyond referrals | High | M | Abuse → reuse spam-report flow | — |
| N-07 | Bulk student import (CSV) | Admin onboarding of a whole batch in minutes | High | M | Validation errors → preview step | — |
| N-08 | Notification preferences | Users drowning in alerts disengage; granular opt-out | Medium | S | Must thread through notify triggers | — |
| N-09 | Recruiter funnel analytics | Recruiters need applied→screened→hired conversion | Medium | S | Low | — |
| N-10 | Event check-in / attendance | ATTENDED status exists but no check-in UI | Medium | S | Low | — |
| N-11 | Public company pages | Employer branding attracts students; currently job-detail only | Medium | M | Stale data → owner edit exists | — |
| N-12 | CV builder + PDF export | Many students have no CV file to upload | Medium | M | PDF lib bloat → lazy-load it | — |
| N-13 | Reports CSV export | Admin/NAAC reporting needs spreadsheets | Medium | S | Low | — |
| N-14 | Alumni career talks list | Reuses events table for alumni-led talks | Medium | S | Low | — |
| N-15 | Faculty skill endorsement | Verified skills beat self-claimed for recruiters | Medium | S | Low | — |
| N-16 | Verification-email resend | Static VerifyEmail page strands users | Medium | S | Low | Resend live |
| N-17 | FAQ / help / feedback + legal pages | Institutional adoption needs support + terms/privacy | Low | S | Low | — |
| N-18 | Dark-mode toggle | Themes configured, no switch | Low | S | Low | — |
| N-19 | SEO + landing polish | Public discovery (meta/OG/sitemap) | Low | S | Low | — |
| N-20 | Bangla language | Local accessibility | Low | L | String extraction across ~40 pages — split before starting | — |

## PASS 3 — Implementation roadmap (ordered sprints; every task fits one short session)

Conventions: Size S = 1 prompt, M = 2–3 prompts (never L — split instead). Every DB change is a NEW migration. Manual test always on two accounts (e.g. student + recruiter/admin).

### Sprint 0 — Security and stability

**S0-01 — Signup role allowlist.** Goal: close A-01; crafted `auth.signUp` with `{"role":"ADMIN"}` must not escalate. Files: new migration only. DB: `CASE` allowlist (STUDENT/ALUMNI/RECRUITER/FACULTY, default STUDENT) in `handle_new_user()`. UI: none. Accept: (1) ADMIN metadata → STUDENT row; (2) valid roles unchanged; (3) existing users untouched. Test: sign up twice via API (role ADMIN, role RECRUITER), check `users.role`. Size S. Risk: low.
**S0-02 — FK index migration.** Goal: fix A-02 slow scans/locks. Files: new migration. DB: indexes on `cvs/education/experience/projects/student_skills/event_registrations/interviews/recommendations/referrals/alumni_*` FK columns. UI: none. Accept: (1) `EXPLAIN` uses indexes; (2) migration is idempotent (`IF NOT EXISTS`). Test: apply twice, run dashboard queries. Size S. Risk: low (concurrent build on big tables — use plain CREATE INDEX, tables are small).
**S0-03 — Seed uploads bucket.** Goal: fix A-03 fresh-deploy breakage. Files: new migration (`storage.buckets` insert `on conflict do nothing`). DB: bucket `uploads`, private. UI: none. Accept: (1) re-runnable; (2) student CV upload works on fresh project. Test: upload + signed-URL download as student. Size S. Risk: low.
**S0-04 — CI workflow.** Goal: fix A-04 automation gap. Files: `.github/workflows/ci.yml` (new). DB: none. UI: none. Accept: (1) runs `npm run lint` + `npm run build` in `client/` on push/PR; (2) red build blocks merge. Test: open a PR, watch it run. Size S. Risk: none.
**S0-05 — Silent admin list failures.** Goal: AdminApplications/AdminInterviews never show fake-empty. Files: those 2 pages. DB: none. UI: error alert + Retry button. Accept: (1) forced error (offline/thrown) shows message; (2) retry reloads; (3) success path unchanged. Test: block network, load both pages as admin. Size S. Risk: low.
**S0-06 — Replace blocking alert().** Goal: unfreeze UI errors. Files: `RecruiterDashboardPage.jsx:195,206`, `MessagesPage.jsx:57`. DB: none. UI: inline flash/alert state. Accept: (1) zero `alert(` in src; (2) same messages shown inline. Test: trigger each error path. Size S. Risk: none.
**S0-07 — Company dead-end fix.** Goal: unlinked recruiters get guidance, not a throwing button. Files: `CompanyProfilePage.jsx`. DB: none. UI: hide save when unlinked, admin-contact CTA only. Accept: (1) no reachable throw; (2) linked flow unchanged. Test: recruiter without company vs with. Size S. Risk: low.
**S0-08 — Policy hygiene.** Goal: intent-matching policies. Files: new migration. DB: rename `placements` read policy; restrict `skills` insert (trim + length check or admin-only + seed list). UI: none. Accept: (1) recruiter reads still work; (2) junk-skill insert denied. Test: insert `' '` as student → rejected. Size S. Risk: low.
**S0-09 — Cron + env correctness.** Goal: reminders and emails actually fire. Files: `supabase/cron-setup-production.sql` (fill project ref) + env checklist in docs. DB: none (dashboard SQL run). UI: none. Accept: (1) `cron.job_run_details` shows hourly runs; (2) test interview email received; (3) Vercel `VITE_*` + Supabase `RESEND_API_KEY` confirmed. Test: schedule test interview, check inbox. Size S. Risk: needs dashboard access.
**S0-10 — Rate limiting baseline.** Goal: slow credential-stuffing/spam. Files: none (dashboard Auth rate limits) + submit-button disable audit (code read-only note). DB: none. UI: none. Accept: (1) Auth rate limits enabled; (2) list of unguarded forms documented. Test: rapid login attempts throttled. Size S. Risk: low.

### Sprint 1 — Partial fixes and small missing pieces

**S1-01 — Faculty profile page.** Goal: faculty self-service (currently no route). Files: new `FacultyProfilePage.jsx` + `App.jsx` route `/faculty/profile`. DB: none (RLS allows own row). UI: view/edit own faculty row. Accept: (1) route guarded FACULTY; (2) save persists; (3) others' rows unreadable. Test: two faculty accounts. Size S. Risk: low.
**S1-02 — Application stage tracker.** Goal: visual pipeline instead of status text. Files: `ApplicationsPage.jsx`. DB: none. UI: stage steps Applied→Review→Shortlist→Interview→Selected with current highlighted. Accept: (1) all statuses map to a step; (2) mobile wraps. Test: applications in 3 different states. Size S. Risk: none.
**S1-03 — Placement creation pipeline.** Goal: `placements` rows actually get created. Files: new migration (trigger on applications → SELECTED, one row, no dupes) — read placements def first. DB: trigger. UI: none. Accept: (1) setting SELECTED inserts exactly one row; (2) reverts/deletes don't duplicate; (3) existing rows untouched. Test: recruiter selects candidate → faculty sees record. Size S. Risk: medium — backfill decision documented, not auto-run.
**S1-04 — Withdraw application.** Goal: missing core student action. Files: `ApplicationsPage.jsx` (+ confirm dialog). DB: none (RLS allows student update). UI: Withdraw → WITHDRAWN with confirm. Accept: (1) withdrawn hidden from active counts; (2) re-apply still blocked correctly; (3) recruiter sees status. Test: student withdraws, recruiter checks pipeline. Size S. Risk: low.
**S1-05 — Verification-email resend.** Goal: unstrand new users. Files: `VerifyEmailPage.jsx` (+ `AuthProvider` passthrough if missing). DB: none. UI: resend button + cooldown message. Accept: (1) email arrives; (2) double-click safe. Test: fresh signup → resend → inbox. Size S. Risk: needs Resend live (S0-09).
**S1-06 — Notification preferences.** Goal: opt-out per category. Files: new migration (prefs column on users) + `NotificationsPage.jsx` toggles. DB: column. UI: toggles; triggers check prefs (follow-up: wire into `notify_user` callers or triggers). Accept: (1) prefs persist; (2) opted-out category produces nothing. Test: toggle off, trigger event, confirm silence. Size M. Risk: medium — touch notify paths carefully, one at a time.
**S1-07 — Event check-in.** Goal: use ATTENDED status. Files: `FacultyEventsPage.jsx`. DB: none. UI: mark-attended per registration. Accept: (1) status flips REGISTERED→ATTENDED; (2) counts update. Test: faculty checks in a registered student. Size S. Risk: low.
**S1-08 — Alumni event registration.** Goal: alumni can join events, not just view. Files: events UI + RLS check first. DB: migration only if RLS blocks (verify first). UI: register/cancel for alumni. Accept: (1) student flow untouched; (2) duplicate blocked. Test: alumni + student register for same event. Size S. Risk: low.
**S1-09 — Eligibility drives check.** Goal: confirm `eligibility jsonb` is saved, shown, and enforced (or document gap). Files: `CampusRecruitmentPage.jsx`, `AdminCampusPage.jsx`. DB: none (unless gap found). UI: fix/enforce display. Accept: (1) eligibility round-trips; (2) admin sees criteria. Test: request with criteria → approve → view. Size S. Risk: low.

### Sprint 2 — Missing core features

**S2-01 — Saved-jobs table + RLS.** Goal: storage for N-01. Files: new migration (`saved_jobs`, unique(user, job), owner-only policies). DB: table. UI: none. Accept: (1) RLS blocks cross-user reads; (2) dupe save rejected. Test: two students save same job. Size S. Risk: low.
**S2-02 — Saved-jobs UI.** Goal: bookmark toggle + Saved tab. Files: `JobCard.jsx`, `JobsPage.jsx`. DB: none. UI: bookmark button + filter. Accept: (1) toggle persists; (2) badge/count correct. Test: save/unsave, reload. Size M. Risk: low.
**S2-03 — Job deadline digests.** Goal: N-02 without spam. Files: new edge function or cron SQL reusing `send-email`. DB: none. UI: none (respects N prefs later). Accept: (1) digest lists closing jobs; (2) weekly cap. Test: force-run, check inbox. Size M. Risk: medium — needs S0-09 live.
**S2-04 — Noticeboard.** Goal: career-office broadcasts. Files: new migration (table) + homepage widget + admin post UI. DB: table. UI: widget + form. Accept: (1) post appears for all roles; (2) only admin/faculty post. Test: post as admin, view as student. Size M. Risk: low.
**S2-05 — Interview feedback.** Goal: structured recruiter feedback. Files: new migration (fields) + `InterviewModal.jsx` + display. DB: columns. UI: rating/notes form. Accept: (1) feedback saves per interview; (2) visible to recruiter/admin. Test: submit feedback, reload. Size M. Risk: low.
**S2-06 — Offer management.** Goal: close the loop to placement. Files: application status UI + offer fields. DB: migration (offer columns) or reuse SELECTED. UI: make-offer action + letter text. Accept: (1) offer recorded; (2) feeds S1-03 pipeline. Test: full select→offer→placement chain. Size M. Risk: low. Depends: S2-05 (soft), S1-03.
**S2-07 — Mentorship directory.** Goal: browsable mentors. Files: new migration + alumni-facing page. DB: table. UI: directory + search. Accept: (1) opt-in listing; (2) students browse. Test: opt in as alumni, view as student. Size M. Risk: low.
**S2-08 — Mentorship requests.** Goal: request/accept flow. Files: request button + status UI. DB: reuse S2-07 table (status column). UI: request + accept/decline. Accept: (1) request lifecycle works; (2) spam-report applies. Test: student→alumni request cycle. Size S. Risk: low. Depends: S2-07.
**S2-09 — Bulk import parse + preview.** Goal: safe CSV onboarding. Files: `AdminUsersPage.jsx` section + parser (no new dep — hand-rolled or existing). DB: none. UI: upload + preview table + error rows. Accept: (1) bad rows flagged, nothing saved; (2) 500-row file previews fast. Test: sample CSV with 3 bad rows. Size M. Risk: medium — never auto-send invites without confirm.
**S2-10 — Bulk import execute.** Goal: create users + invite emails. Files: same section + edge fn or Auth API. DB: none. UI: confirm + progress + report. Accept: (1) only previewed rows created; (2) invites sent. Test: 5-row import end-to-end. Size S. Risk: medium. Depends: S2-09.

### Sprint 3 — Medium polish and parity

**S3-01 — Company list page.** Goal: public `/companies`. Files: new page + route. DB: none. UI: searchable list. Accept: (1) only VERIFIED shown to students; (2) links to jobs. Test: verify→appears. Size S. Risk: low.
**S3-02 — Company detail page.** Goal: `/companies/:id` profile + open jobs. Files: new page. DB: none. UI: detail + jobs. Accept: (1) pending companies hidden; (2) mobile clean. Test: as student + logged out (if public). Size S. Risk: low. Depends: S3-01 (soft).
**S3-03 — CV builder.** Goal: generate CV from profile data. Files: new builder component + profile entry point. DB: none (saves into `cvs.content` jsonb). UI: template + preview. Accept: (1) prefills from profile; (2) saves as CV row. Test: build → appears in CV list. Size M. Risk: low.
**S3-04 — CV PDF export.** Goal: download built CV as PDF. Files: export button (lazy-load PDF lib). DB: none. UI: download. Accept: (1) readable one-page PDF; (2) bundle impact isolated via lazy import. Test: export + open. Size S. Risk: low. Depends: S3-03.
**S3-05 — Reports CSV export.** Goal: spreadsheet downloads. Files: `AdminReportsPage.jsx`. DB: none. UI: per-table CSV buttons. Accept: (1) correct headers/escaping; (2) respects current filters. Test: export 200-row table. Size S. Risk: none.
**S3-06 — Career talks list.** Goal: alumni-led talks reuse events. Files: events UI filter/section. DB: none (event_type or tag). UI: talks listing. Accept: (1) alumni can propose; (2) students see them. Test: propose → approve → listed. Size S. Risk: low.
**S3-07 — Skill endorsement.** Goal: faculty endorses student skills. Files: review page section + migration (endorsements). DB: table/columns. UI: endorse buttons + badges. Accept: (1) only faculty endorse; (2) badges show on profile. Test: endorse → student sees badge. Size S. Risk: low.
**S3-08 — Recruiter funnel analytics.** Goal: applied→hired conversion per job. Files: recruiter dashboard section. DB: none. UI: funnel counts. Accept: (1) numbers match applicant list; (2) per-job filter. Test: compare with ApplicantsPage. Size S. Risk: low.
**S3-09 — Photo upload.** Goal: use `profile_photo`. Files: `StudentProfilePage.jsx` + storage path. DB: none (bucket from S0-03). UI: upload + crop-free preview. Accept: (1) avatar shows photo; (2) RLS owner-only. Test: upload → reload → visible. Size S. Risk: low. Depends: S0-03.
**S3-10 — Certificates.** Goal: table + upload/verify UI. Files: new migration + profile section. DB: table. UI: add + faculty verify tick. Accept: (1) student CRUD own; (2) faculty can verify. Test: add → verify → badge. Size M. Risk: low. Depends: S0-03.

### Sprint 4 — Quality, performance, trust

**S4-01 — Route code splitting.** Goal: kill the 1.29 MB chunk. Files: `App.jsx` (`React.lazy` + Suspense) + `vite.config.js` `manualChunks`. DB: none. UI: route-level fallback spinner. Accept: (1) initial chunk < 400 KB; (2) no route regresses. Test: build + click every role's routes. Size S. Risk: low.
**S4-02 — Shared UI kit.** Goal: end copy-paste components. Files: new `components/ui/` kit; migrate one page first. DB: none. UI: identical. Accept: (1) one page fully migrated, pixel-same; (2) others follow later. Test: visual diff of migrated page. Size M. Risk: low.
**S4-03 — Unit tests.** Goal: guard utils/hooks. Files: `*.test.*` for format/labels/matching/completeness helpers. DB: none. UI: none. Accept: (1) `npm test` green in CI; (2) 70%-math cases covered. Test: run suite. Size M. Risk: none. Depends: S0-04.
**S4-04 — E2E smoke flows.** Goal: auth + apply flow always green. Files: e2e spec (1 file, 2 flows). DB: none (seed/demo accounts). UI: none. Accept: (1) register→complete→apply passes; (2) runs in CI nightly. Test: run locally. Size M. Risk: needs test users. Depends: S0-04.
**S4-05 — Audit-log coverage.** Goal: admin actions traceable. Files: logging helper + verify/publish/suspend call sites. DB: none (table exists). UI: none (viewer later). Accept: (1) each action writes actor/action/target; (2) no PII leaks. Test: verify company → row in audit_logs. Size M. Risk: low.
**S4-06 — FAQ/legal pages.** Goal: support + compliance. Files: static pages + routes + footer links. DB: none. UI: FAQ/help/terms/privacy. Accept: (1) reachable logged-out; (2) feedback form stores to table or email. Test: submit feedback. Size S. Risk: none.
**S4-07 — SEO polish.** Goal: discoverable landing. Files: `index.html` meta/OG + sitemap. DB: none. UI: none visible. Accept: (1) validator-clean tags; (2) sitemap served. Test: rich-preview check. Size S. Risk: none.
**S4-08 — Contrast/keyboard pass.** Goal: finish what audit couldn't verify visually. Files: CSS tweaks only. DB: none. UI: contrast fixes + focus rings. Accept: (1) axe-clean on 5 key pages; (2) 40px targets everywhere. Test: keyboard-only run-through. Size S. Risk: none.
**S4-09 — Dead code cleanup.** Goal: smaller, clearer tree. Files: DashboardPlaceholder, zustand dep, dead identifiers, console.log. DB: none. UI: identical. Accept: (1) lint clean; (2) build green. Test: full route click-through. Size S. Risk: none.

### Sprint 5 — Smart features (post-data-volume)

**S5-01 — Matching upgrade.** Goal: scored recommendations. Files: matching util + dashboard sections. DB: none. UI: match % + reasons. Accept: (1) deterministic scores; (2) explains top factors. Test: fixture student vs 3 jobs. Size M. Risk: low.
**S5-02 — Rule-based CV feedback.** Goal: instant CV tips (missing sections, length, skills coverage). Files: profile CV section. DB: none. UI: checklist suggestions. Accept: (1) tips change as CV improves; (2) no backend calls. Test: thin vs full CV. Size S. Risk: low.
**S5-03 — Skill-gap analyzer.** Goal: missing-skills per target role. Files: analyzer component. DB: none. UI: have vs need lists. Accept: (1) correct set-diff on skills; (2) links to jobs needing them. Test: two roles compared. Size S. Risk: low. Depends: S5-01 (soft).
**S5-04 — i18n infrastructure.** Goal: string extraction + toggle plumbing. Files: i18n setup + context. DB: none. UI: language toggle (EN default). Accept: (1) zero hardcoded regressions; (2) toggle persists. Test: switch twice, reload. Size M. Risk: medium — wide touch, keep to plumbing only.
**S5-05 — Bangla strings.** Goal: full bn translation. Files: locale file(s) only. DB: none. UI: complete bn render. Accept: (1) no missing-key fallbacks on 5 key pages; (2) reviewer sign-off. Test: click every route in bn. Size M. Risk: low. Depends: S5-04.

## PASS 4 — Working method and checkpoints (solo dev + coding agent)

Loop per task: (1) write/confirm the 1-page spec from PASS 3; (2) paste ONE agent prompt (see `docs/AGENT_PROMPTS.md`); (3) `npm run lint` + `npm run build`; (4) manual test on two accounts (e.g. student + recruiter); (5) migration? `supabase db push --dry-run` first, then push; (6) commit with the task ID in the message.
Start a new chat when: switching sprints/areas, context feels stale, or the same error repeats twice. Split big tasks before prompting (one feature, one–two files max). Avoid agent loops: small prompts, never "rewrite this whole file", stop after two failed builds for the same reason and report.
Testing checklist per role — student: register→complete profile→apply→withdraw→interview view; alumni: profile→post job→submit→refer; faculty: list→verify→recommend→event; recruiter: company→post→submit→shortlist→interview→select→offer; admin: approve users/jobs/companies→reports→campus.
Release checklist before demo day: Supabase backup/PITR confirmed; Vercel + Supabase env vars set; Resend domain verified + test email received; cron `job_run_details` green; RLS review (esp. new tables); demo accounts + seed data; one-page user guide; known-limitations list (from this plan).
Suggested timeline: Sprint 0 = week 1; Sprint 1 = week 2; Sprint 2 = weeks 3–4; Sprint 3 = week 5; Sprint 4 = week 6; Sprint 5 = later, after real usage data.
