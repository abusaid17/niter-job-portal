-- ============================================================
-- NITER Job Portal — pg_cron + pg_net Setup for Interview Reminders
-- Run this in Supabase Dashboard SQL Editor (requires superuser for pg_cron)
-- ============================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Grant usage to postgres role (supabase_admin)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA cron TO postgres;

-- 3. Schedule the interview-reminders edge function
-- Replace <YOUR_PROJECT_REF> and <YOUR_SERVICE_ROLE_KEY> with actual values
SELECT cron.schedule(
  'interview-reminders-hourly',
  '0 * * * *',  -- every hour at minute 0 (e.g., 1:00, 2:00, 3:00...)
  $$
  SELECT net.http_post(
    url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/interview-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- 4. Verify the job was created
SELECT jobid, schedule, command, nodename, nodeport, database, username, active
FROM cron.job
WHERE jobname = 'interview-reminders-hourly';

-- 5. View recent runs
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'interview-reminders-hourly')
ORDER BY start_time DESC
LIMIT 10;

-- ============================================================
-- LOCAL DEVELOPMENT SETUP (run in local Supabase CLI)
-- ============================================================
-- For local dev, the edge function runs at: http://localhost:54321/functions/v1/interview-reminders
-- The service role key is in .env or supabase/config.toml
--
-- Local schedule (run in local psql):
-- SELECT cron.schedule(
--   'interview-reminders-hourly-local',
--   '0 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'http://host.docker.internal:54321/functions/v1/interview-reminders',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjc5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 30000
--   );
--   $$
-- );

-- ============================================================
-- PRODUCTION DEPLOYMENT CHECKLIST
-- ============================================================
-- 1. In Supabase Dashboard → SQL Editor, run the CREATE EXTENSION statements
-- 2. Get your Project Ref from Dashboard → Settings → General
-- 3. Get Service Role Key from Dashboard → Settings → API
-- 4. Replace placeholders in the cron.schedule call above
-- 5. Run the cron.schedule statement
-- 6. Verify with SELECT * FROM cron.job;
-- 7. Test manually: SELECT cron.job_run('interview-reminders-hourly');
-- ============================================================