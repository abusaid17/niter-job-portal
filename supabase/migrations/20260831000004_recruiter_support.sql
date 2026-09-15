-- ============================================================
-- NITER Job Portal — Recruiter module support (Step 5)
-- Applicant visibility for recruiters, CV review, notifications,
-- and anti-self-publish / anti-self-verify guards.
-- ============================================================

-- ---------- read applicant profiles for recruiters ----------
create policy "students: read applicants for recruiter"
  on public.students for select
  using (
    id in (
      select a.student_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    )
  );

create policy "users: read applicants for recruiter"
  on public.users for select
  using (
    id in (
      select s.user_id from public.students s
      join public.applications a on a.student_id = s.id
      where a.job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    )
  );

-- ---------- read applicant profile building blocks ----------
create policy "education: read applicants for recruiter"
  on public.education for select
  using (
    student_id in (
      select a.student_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    )
  );

create policy "experience: read applicants for recruiter"
  on public.experience for select
  using (
    student_id in (
      select a.student_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    )
  );

create policy "projects: read applicants for recruiter"
  on public.projects for select
  using (
    student_id in (
      select a.student_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    )
  );

create policy "student_skills: read applicants for recruiter"
  on public.student_skills for select
  using (
    student_id in (
      select a.student_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    )
  );

-- ---------- CV review ----------
create policy "cvs: read via application for recruiter"
  on public.cvs for select
  using (
    id in (
      select a.cv_id from public.applications a
      where a.job_id in (select j.id from public.jobs j where j.company_id = public.my_company_id())
    )
  );

-- ---------- storage: read applicant CV files ----------
create policy "uploads: read applicant cvs for recruiter"
  on storage.objects for select
  using (
    bucket_id = 'uploads'
    and name like 'cvs/%'
    and owner in (
      select s.user_id
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.students s on s.id = a.student_id
      where j.company_id = public.my_company_id()
    )
  );

-- ---------- in-app notifications (server-side helper) ----------
create or replace function public.notify_user(p_user_id uuid, p_title text, p_message text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, type)
  values (p_user_id, p_title, p_message, 'notification');
end;
$$;

grant execute on function public.notify_user(uuid, text, text) to authenticated;

-- ---------- job workflow guard: only admins can publish ----------
create or replace function public.guard_job_status()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'PUBLISHED' and old.status is distinct from 'PUBLISHED' then
    if public.get_user_role() <> 'ADMIN' then
      raise exception 'Only admins can publish jobs';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_jobs_guard_status before update on public.jobs
  for each row execute function public.guard_job_status();

-- ---------- company guard: only admins can change verification ----------
create or replace function public.guard_company_verification()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status then
    if public.get_user_role() <> 'ADMIN' then
      raise exception 'Only admins can change company verification status';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_companies_guard_verification before update of verification_status on public.companies
  for each row execute function public.guard_company_verification();