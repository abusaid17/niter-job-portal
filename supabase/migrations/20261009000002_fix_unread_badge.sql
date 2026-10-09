-- ============================================================
-- NITER Job Portal — Fix unread message badge
-- Add UPDATE policy on conversation_members so users can mark conversations as read
-- ============================================================

-- Allow users to update their own last_read_at (mark conversation as read)
create policy "members: update own last_read_at"
  on public.conversation_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());