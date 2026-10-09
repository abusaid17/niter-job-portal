-- ============================================================
-- NITER Job Portal — Owner-only DELETE for notifications
--
-- Committed policies on public.notifications cover SELECT
-- ("notifications: read own / admin") and UPDATE
-- ("notifications: mark read") only, so every DELETE is denied —
-- including a user deleting their own notification.
--
-- This adds the one missing least-privilege policy: a user can
-- DELETE only rows where user_id = auth.uid(). Students,
-- recruiters, admins, alumni and faculty can therefore delete
-- only their OWN notifications, enforced in the database —
-- never by frontend checks alone. Nothing else changes.
-- Apply with: supabase db push
-- ============================================================

-- Idempotent: safe to re-run no matter which earlier migrations applied.
drop policy if exists "notifications: delete own"
  on public.notifications;

create policy "notifications: delete own"
  on public.notifications for delete
  using (user_id = auth.uid());
