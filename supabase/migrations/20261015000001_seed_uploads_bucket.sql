-- ============================================================
-- NITER Job Portal — Seed private `uploads` bucket (A-03)
--
-- Every storage policy (`20260831000003_storage_policies.sql` plus
-- recruiter/faculty/applicant read policies) and every client call
-- (`storage.from('uploads')` for CV upload, signed URLs, delete)
-- assumes a bucket named `uploads`, but no migration ever creates
-- the bucket row — so fresh deploys/clones break all uploads.
-- This inserts the private bucket only. Existing storage policies
-- are intentionally NOT duplicated here.
-- Idempotent: `on conflict do nothing`, safe to apply twice.
-- Apply with: supabase db push
-- ============================================================

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;
