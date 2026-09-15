-- ============================================================
-- NITER Job Portal — Phase 2 feature support (Step: Phase 2 gaps)
-- Job reporting (admin resolve), campus recruitment approval,
-- and richer job search/filter fields.
-- ============================================================

-- ---------- job reports: allow admins to resolve reports ----------
create policy "reports: admin manage"
  on public.job_reports for update
  using (public.get_user_role() = 'ADMIN');

-- ensure only one open report per job per reporter
create unique index if not exists uq_job_report_open
  on public.job_reports (job_id, reporter_id)
  where status = 'OPEN';

-- ---------- campus recruitment: admin can resolve ----------
-- (existing "campus: admin update" policy covers status changes)

-- ---------- jobs: richer searchable/filterable fields ----------
alter table public.jobs
  add column if not exists department       text,
  add column if not exists experience_level text,
  add column if not exists skills           text[] not null default '{}',
  add column if not exists education        text,
  add column if not exists benefits         text;

create index if not exists idx_jobs_skills on public.jobs using gin (skills);
create index if not exists idx_jobs_department on public.jobs (department);
create index if not exists idx_jobs_experience on public.jobs (experience_level);
