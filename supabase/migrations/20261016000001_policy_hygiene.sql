-- ============================================================
-- NITER Job Portal — Policy hygiene (S0-08)
--
-- Two small, safe policy fixes, nothing else:
--   1. Rename the misleading "placements: read admin / faculty"
--      policy to match its real intent (ADMIN/FACULTY/RECRUITER).
--      The USING clause is byte-identical: zero behavior change,
--      recruiter reads keep passing exactly as before.
--   2. Harden "skills: authenticated create" so junk rows can no
--      longer be inserted: names must be non-blank after trimming
--      and at most 60 chars. Done in the policy WITH CHECK (not a
--      table CHECK constraint) so pre-existing rows can never make
--      this migration fail. Legit inserts (e.g. 'React') are
--      unaffected — clients already trim before inserting.
-- Idempotent: DROP IF EXISTS before each CREATE, safe to apply twice.
-- Apply with: supabase db push
-- ============================================================

-- ---------- 1. placements: rename, same behavior ----------
drop policy if exists "placements: read admin / faculty"
  on public.placements;

create policy "placements: read admin / faculty / recruiter"
  on public.placements for select
  using (public.get_user_role() in ('ADMIN', 'FACULTY', 'RECRUITER'));

-- ---------- 2. skills: reject blank / overlong names ----------
drop policy if exists "skills: authenticated create"
  on public.skills;

create policy "skills: authenticated create"
  on public.skills for insert
  with check (
    auth.role() = 'authenticated'
    and coalesce(btrim(name), '') <> ''
    and char_length(btrim(name)) <= 60
  );
