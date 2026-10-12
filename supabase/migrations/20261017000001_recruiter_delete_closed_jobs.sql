-- ============================================================
-- NITER Job Portal — Recruiters can delete their OWN closed jobs
--
-- Previously only admins could delete jobs ("jobs: admin delete").
-- This adds one narrow policy: the creating recruiter
-- (posted_by = auth.uid()) may delete a job only while its status
-- is CLOSED. Draft / pending / published jobs are unaffected, and
-- nobody can delete another recruiter's posts (checked in the DB,
-- not just the UI).
-- Note: applications, interviews, recommendations and referrals
-- reference jobs ON DELETE CASCADE, so they go away with the job;
-- reports/messages reference it ON DELETE SET NULL and are kept.
-- Idempotent: DROP IF EXISTS before CREATE, safe to apply twice.
-- Apply with: supabase db push
-- ============================================================

drop policy if exists "jobs: delete own closed"
  on public.jobs;

create policy "jobs: delete own closed"
  on public.jobs for delete
  using (posted_by = auth.uid() and status = 'CLOSED');
