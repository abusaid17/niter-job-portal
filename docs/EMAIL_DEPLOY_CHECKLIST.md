# Email + Reminders Deploy Checklist

Client calls are well-formed (`client/src/utils/email.js` sends `{type, to, data}` matching `send-email`'s parser; only valid template types are used), so this is purely ops.

## Vercel (frontend) env vars

- `VITE_SUPABASE_URL` = `https://jbykthdducpsyirztatq.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = anon public key from Supabase Dashboard → Settings → API
- Redeploy after changing vars.

## Supabase edge-function secrets

```sh
supabase secrets set RESEND_API_KEY=re_xxx --project-ref jbykthdducpsyirztatq
supabase functions deploy send-email --project-ref jbykthdducpsyirztatq
supabase functions deploy interview-reminders --project-ref jbykthdducpsyirztatq
```

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-provided to functions; never commit the service_role key.

## Resend domain check (critical)

`send-email` currently sends `from: 'NITER Job Portal <onboarding@resend.dev>'`. Resend's test domain **only delivers to the account owner's own address** — every other recipient silently never receives mail. Before demo day: verify a real domain in Resend (DNS records), then change `from` to that domain and redeploy `send-email`.

## Cron (interview reminders, hourly)

1. In Dashboard → SQL Editor run `supabase/cron-setup-production.sql` (extensions section first).
2. In the `cron.schedule` call, paste the **service_role key at run time only** (project ref is already filled in).
3. Verify: `SELECT * FROM cron.job WHERE jobname = 'interview-reminders-hourly';`
4. Force a run: `SELECT cron.job_run('interview-reminders-hourly');`
5. Acceptance: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;` shows successful runs.

## Manual test (acceptance)

1. As a recruiter, schedule an interview for tomorrow for a student → student gets in-app notification + `interview_scheduled` email in inbox.
2. Force the cron run → student bell shows "Upcoming interview reminder" (re-run sends nothing: deduped via `interview_reminders`).
3. Alumni applicant path: reminders resolve `applicant_user_id`, not just student rows.
