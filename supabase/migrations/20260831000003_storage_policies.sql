-- ============================================================
-- NITER Job Portal — Storage bucket policies (uploads/)
-- Private bucket: users manage files they own; sharing via signed URLs
-- ============================================================

create policy "uploads: read own objects"
  on storage.objects for select
  using (bucket_id = 'uploads' and owner = auth.uid());

create policy "uploads: upload own objects"
  on storage.objects for insert
  with check (bucket_id = 'uploads' and owner = auth.uid());

create policy "uploads: update own objects"
  on storage.objects for update
  using (bucket_id = 'uploads' and owner = auth.uid());

create policy "uploads: delete own objects"
  on storage.objects for delete
  using (bucket_id = 'uploads' and owner = auth.uid());