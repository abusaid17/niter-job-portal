# Rate Limiting Baseline (S0-10)

No code changes were needed: every submit path already disables its button
while a request is in flight, and duplicates are blocked server-side
(unique constraints + RLS). What remains is dashboard configuration below.

## Button-disable audit (all guarded, verified Oct 2026)

- Auth: `RegisterPage.jsx:174` + `LoginPage.jsx:97` (`disabled={isSubmitting}`)
- Apply: `JobDetailsPage.jsx:335` (`disabled={isSubmitting ...}`) + unique
  constraints `uq_applications_student_job` / `uq_applications_alumni_job`
  make double-apply impossible even if clicked twice
- Job/company/profile forms: `JobFormPage:446`, `AlumniJobFormPage:283`,
  `CompanyProfilePage:751,759` (`disabled={saving}`)
- Profile sub-forms, CV upload/download, dialogs: `disabled={busy|uploading}`
  throughout `StudentProfilePage.jsx`; same pattern in alumni profile,
  referrals, applicants, interviews modals

## Supabase Auth rate limits (enable in Dashboard → Authentication → Rate Limits)

- `OTP / email sending`: 3–5 per hour per email (blocks signup/reset abuse)
- `Sign-in attempts`: keep defaults ON (blocks credential stuffing)
- `Token refresh / recovery`: keep defaults ON
- Confirm the project is not on "no limits" demo settings before demo day.

## Edge functions (optional hardening, not yet done)

- `send-email`: add a per-recipient daily cap (e.g. via `email_logs` count check)
  if digest/bulk mails are ever added; single transactional sends are
  user-triggered and low-risk today.
- `interview-reminders`: cron-gated (hourly) + `interview_reminders` dedupe
  table already prevents duplicate sends.

## Test

Rapid double-click apply/register buttons → single row (button disables +
unique constraint returns 23505 "already applied" on the second request).
