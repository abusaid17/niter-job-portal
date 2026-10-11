-- ============================================================
-- NITER Job Portal — FK indexes for profile/applicant tables (A-02)
--
-- The initial schema indexed only jobs/applications/messages/
-- notifications. These tables are filtered/joined by FK on every
-- profile, applicant-list and dashboard query but had no indexes,
-- causing sequential scans (and stronger write locks on deletes).
-- Index-only change: no table, column, policy or function touched.
-- Idempotent: every statement uses IF NOT EXISTS, safe to apply twice.
-- Apply with: supabase db push
-- ============================================================

-- ---------- student profile tables ----------
create index if not exists idx_cvs_student
  on public.cvs (student_id);

create index if not exists idx_education_student
  on public.education (student_id);

create index if not exists idx_experience_student
  on public.experience (student_id);

create index if not exists idx_projects_student
  on public.projects (student_id);

create index if not exists idx_student_skills_student
  on public.student_skills (student_id);

create index if not exists idx_student_skills_skill
  on public.student_skills (skill_id);

-- ---------- applications pipeline ----------
create index if not exists idx_interviews_application
  on public.interviews (application_id);

create index if not exists idx_recommendations_student
  on public.recommendations (student_id);

create index if not exists idx_recommendations_faculty
  on public.recommendations (faculty_id);

create index if not exists idx_referrals_student
  on public.referrals (student_id);

create index if not exists idx_referrals_alumni
  on public.referrals (alumni_id);

-- ---------- events ----------
create index if not exists idx_event_registrations_event
  on public.event_registrations (event_id);

create index if not exists idx_event_registrations_student
  on public.event_registrations (student_id);

-- ---------- alumni profile tables ----------
create index if not exists idx_alumni_education_alumni
  on public.alumni_education (alumni_id);

create index if not exists idx_alumni_experience_alumni
  on public.alumni_experience (alumni_id);

create index if not exists idx_alumni_projects_alumni
  on public.alumni_projects (alumni_id);

create index if not exists idx_alumni_skills_alumni
  on public.alumni_skills (alumni_id);

create index if not exists idx_alumni_skills_skill
  on public.alumni_skills (skill_id);

create index if not exists idx_alumni_cvs_alumni
  on public.alumni_cvs (alumni_id);
