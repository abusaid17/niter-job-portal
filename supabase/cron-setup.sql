-- ============================================================
-- NITER Job Portal — Interview Reminder Cron Job
-- Sets up pg_cron to invoke the interview-reminders edge function hourly
-- ============================================================

-- Enable pg_cron extension (requires superuser, run in Supabase dashboard SQL editor)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the interview-reminders edge function to run every hour
-- This uses pg_cron with http extension to call the edge function
SELECT cron.schedule(
  'interview-reminders-hourly',
  '0 * * * *',  -- every hour at minute 0
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

-- To remove the scheduled job:
-- SELECT cron.unschedule('interview-reminders-hourly');

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To view job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;