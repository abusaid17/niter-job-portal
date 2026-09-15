-- ============================================================
-- NITER Job Portal — Faculty module support (Step 7)
-- Faculty: review student profiles, verify student accounts,
-- write recommendations, manage career events, view reports.
-- ============================================================

-- ---------- users: faculty can read (profile review) ----------
create policy "users: read for faculty"
  on public.users for select
  using (public.get_user_role() = 'FACULTY');

-- ---------- users: faculty verify student accounts ----------
create policy "users: faculty verify students"
  on public.users for update
  using (public.get_user_role() = 'FACULTY' and role = 'STUDENT')
  with check (public.get_user_role() = 'FACULTY' and role = 'STUDENT');

create or replace function public.guard_users_faculty_verify()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.get_user_role() = 'FACULTY' and old.role = 'STUDENT' then
    if new.is_verified is distinct from old.is_verified and (
      new.name is distinct from old.name
      or new.email is distinct from old.email
      or new.role is distinct from old.role
      or new.user_status is distinct from old.user_status
    ) then
      raise exception 'Faculty may only update the verification status of student accounts';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_users_faculty_guard before update on public.users
  for each row execute function public.guard_users_faculty_verify();

-- ---------- faculty can read student profile building blocks ----------
create policy "education: read for faculty"
  on public.education for select
  using (public.get_user_role() = 'FACULTY');

create policy "experience: read for faculty"
  on public.experience for select
  using (public.get_user_role() = 'FACULTY');

create policy "projects: read for faculty"
  on public.projects for select
  using (public.get_user_role() = 'FACULTY');

create policy "student_skills: read for faculty"
  on public.student_skills for select
  using (public.get_user_role() = 'FACULTY');

create policy "cvs: read for faculty"
  on public.cvs for select
  using (public.get_user_role() = 'FACULTY');

-- ---------- storage: faculty can open student CV files ----------
create policy "uploads: read cvs for faculty"
  on storage.objects for select
  using (bucket_id = 'uploads' and name like 'cvs/%' and public.get_user_role() = 'FACULTY');

-- ---------- faculty can see event registrations (attendance) ----------
create policy "registrations: read faculty / admin"
  on public.event_registrations for select
  using (public.get_user_role() in ('FACULTY', 'ADMIN'));