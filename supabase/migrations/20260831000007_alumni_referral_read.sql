-- ============================================================
-- NITER Job Portal — Alumni referral support (Step 6)
-- Alumni need to browse students and open job vacancies to make
-- referrals.
-- ============================================================

create policy "students: read for alumni referral"
  on public.students for select
  using (public.get_user_role() = 'ALUMNI');

create policy "users: read list of students"
  on public.users for select
  using (public.get_user_role() = 'ALUMNI' and role = 'STUDENT');