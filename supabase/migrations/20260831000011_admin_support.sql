-- ============================================================
-- NITER Job Portal — Admin module support (Step 8)
-- Admin file access: read + delete all uploaded files.
-- ============================================================

-- ---------- storage: admin can read all uploaded files ----------
create policy "uploads: read all for admin"
  on storage.objects for select
  using (bucket_id = 'uploads' and public.get_user_role() = 'ADMIN');

-- ---------- storage: admin can delete inappropriate uploads ----------
create policy "uploads: delete all for admin"
  on storage.objects for delete
  using (bucket_id = 'uploads' and public.get_user_role() = 'ADMIN');