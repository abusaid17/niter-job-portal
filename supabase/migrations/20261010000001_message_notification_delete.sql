-- ============================================================
-- NITER Job Portal — Owner-only DELETE for messages & notifications
--
-- Background: RLS is enabled on public.messages and
-- public.notifications, but only SELECT / INSERT / UPDATE policies
-- existed, so every DELETE was denied (including deleting your own
-- row). The client therefore could not offer message/notification
-- deletion at all.
--
-- This migration adds the two missing least-privilege policies:
--   * messages:      only the sender (sender_id = auth.uid()) can
--                    delete a message. Deleting one message never
--                    touches the conversation or other members'
--                    messages (messages reference conversations
--                    ON DELETE CASCADE only in the other direction).
--   * notifications: only the owner (user_id = auth.uid()) can delete
--                    a notification. A student can never delete a
--                    recruiter's notification and vice versa — the
--                    check runs in the database, not just the UI.
--
-- No table/column changes. No conversation-level delete is added
-- on purpose: removing a whole conversation would silently erase
-- another user's history.
-- Apply with: supabase db push
-- ============================================================
-- Idempotent: safe to re-run if a previous push partially applied.
drop policy if exists "messages: delete own message" on public.messages;
drop policy if exists "notifications: delete own" on public.notifications;
create policy "messages: delete own message" on public.messages for delete using (sender_id = auth.uid());
create policy "notifications: delete own" on public.notifications for delete using (user_id = auth.uid());