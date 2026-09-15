-- ============================================================
-- NITER Job Portal — Alumni applications (Step 6)
-- Applications become candidate-safe: a row is either a student
-- application (student_id) or an alumni application
-- (applicant_user_id). Alumni job posters can review/update
-- applicants to their own posted jobs.
-- ============================================================

-- ---------- schema: allow alumni applicants ----------
alter table public.applications
  alter column student_id drop not null,
  add column applicant_user_id uuid references public.users (id) on delete cascade;

create index idx_applications_applicant_user on public.applications (applicant_user_id);

alter table public.applications
  add constraint uq_applications_alumni_job unique (job_id, applicant_user_id),
  add constraint chk_applications_one_candidate check (
    (student_id is null) <> (applicant_user_id is null)
  );

-- ---------- RLS: applications ----------
drop policy "applications: read owner / recruiter / admin" on public.applications;
create policy "applications: read owner / recruiter / admin"
  on public.applications for select
  using (
    student_id = public.my_student_id()
    or applicant_user_id = auth.uid()
    or job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    or job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    or public.get_user_role() = 'ADMIN'
  );

drop policy "applications: recruiter / student / admin update" on public.applications;
create policy "applications: recruiter / student / admin update"
  on public.applications for update
  using (
    student_id = public.my_student_id()
    or applicant_user_id = auth.uid()
    or job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    or job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    or public.get_user_role() = 'ADMIN'
  )
  with check (
    student_id = public.my_student_id()
    or applicant_user_id = auth.uid()
    or job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    or job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    or public.get_user_role() = 'ADMIN'
  );

drop policy "applications: student apply" on public.applications;
create policy "applications: allow authenticated apply"
  on public.applications for insert
  with check (
    (student_id = public.my_student_id() and applicant_user_id is null)
    or (student_id is null and applicant_user_id = auth.uid() and public.get_user_role() = 'ALUMNI')
  );

-- ---------- RLS: recruiters can read alumni applicants ----------
create policy "users: read alumni applicants for recruiter"
  on public.users for select
  using (
    id in (
      select a.applicant_user_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    )
  );

create policy "alumni: read applicants for recruiter"
  on public.alumni for select
  using (
    user_id in (
      select a.applicant_user_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    )
  );

-- ---------- RLS: alumni job posters can see applicant student profiles ----------
create policy "students: read applicants for job poster"
  on public.students for select
  using (
    id in (
      select a.student_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    )
  );

create policy "users: read applicants for job poster"
  on public.users for select
  using (
    id in (
      select s.user_id from public.students s
      join public.applications a on a.student_id = s.id
      where a.job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    )
  );

create policy "education: read applicants for job poster"
  on public.education for select
  using (
    student_id in (
      select a.student_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    )
  );

create policy "experience: read applicants for job poster"
  on public.experience for select
  using (
    student_id in (
      select a.student_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    )
  );

create policy "projects: read applicants for job poster"
  on public.projects for select
  using (
    student_id in (
      select a.student_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    )
  );

create policy "student_skills: read applicants for job poster"
  on public.student_skills for select
  using (
    student_id in (
      select a.student_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    )
  );

create policy "cvs: read applicants for job poster"
  on public.cvs for select
  using (
    id in (
      select a.cv_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    )
  );

create policy "users: read alumni applicants for job poster"
  on public.users for select
  using (
    id in (
      select a.applicant_user_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    )
  );

create policy "alumni: read applicants for job poster"
  on public.alumni for select
  using (
    user_id in (
      select a.applicant_user_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.posted_by = auth.uid())
    )
  );

-- ---------- storage: job posters can read applicant CVs ----------
create policy "uploads: read applicant cvs for job poster"
  on storage.objects for select
  using (
    bucket_id = 'uploads'
    and name like 'cvs/%'
    and owner in (
      select s.user_id
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.students s on s.id = a.student_id
      where j.posted_by = auth.uid()
    )
  );