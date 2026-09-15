-- ============================================================
-- NITER Job Portal — Row Level Security (RLS) policies
-- Authorization lives in the database (Plan: Section 27)
-- ============================================================

-- ---------- helpers (SECURITY DEFINER bypasses RLS) ----------
create or replace function public.get_user_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.my_student_id()
returns bigint
language sql stable security definer set search_path = public
as $$
  select id from public.students where user_id = auth.uid()
$$;

create or replace function public.my_company_id()
returns bigint
language sql stable security definer set search_path = public
as $$
  select company_id from public.recruiters where user_id = auth.uid()
$$;

-- ---------- create public.users row on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'STUDENT')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- users
-- ============================================================
alter table public.users enable row level security;

create policy "users: read own or admin"
  on public.users for select
  using (id = auth.uid() or public.get_user_role() = 'ADMIN');

create policy "users: update own or admin"
  on public.users for update
  using (id = auth.uid() or public.get_user_role() = 'ADMIN');

-- ============================================================
-- students
-- ============================================================
alter table public.students enable row level security;

create policy "students: read own / faculty / admin"
  on public.students for select
  using (
    user_id = auth.uid()
    or public.get_user_role() in ('FACULTY', 'ADMIN')
  );

create policy "students: manage own row"
  on public.students for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "students: admin manage"
  on public.students for all
  using (public.get_user_role() = 'ADMIN')
  with check (public.get_user_role() = 'ADMIN');

-- ============================================================
-- alumni
-- ============================================================
alter table public.alumni enable row level security;

create policy "alumni: read own or admin"
  on public.alumni for select
  using (user_id = auth.uid() or public.get_user_role() = 'ADMIN');

create policy "alumni: manage own row"
  on public.alumni for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "alumni: admin manage"
  on public.alumni for all
  using (public.get_user_role() = 'ADMIN')
  with check (public.get_user_role() = 'ADMIN');

-- ============================================================
-- recruiters
-- ============================================================
alter table public.recruiters enable row level security;

create policy "recruiters: read own or admin"
  on public.recruiters for select
  using (user_id = auth.uid() or public.get_user_role() = 'ADMIN');

create policy "recruiters: manage own row"
  on public.recruiters for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "recruiters: admin manage"
  on public.recruiters for all
  using (public.get_user_role() = 'ADMIN')
  with check (public.get_user_role() = 'ADMIN');

-- ============================================================
-- faculty
-- ============================================================
alter table public.faculty enable row level security;

create policy "faculty: read own or admin"
  on public.faculty for select
  using (user_id = auth.uid() or public.get_user_role() = 'ADMIN');

create policy "faculty: admin manage"
  on public.faculty for all
  using (public.get_user_role() = 'ADMIN')
  with check (public.get_user_role() = 'ADMIN');

-- ============================================================
-- companies
-- ============================================================
alter table public.companies enable row level security;

create policy "companies: read verified / owner / admin"
  on public.companies for select
  using (
    verification_status = 'VERIFIED'
    or created_by = auth.uid()
    or public.get_user_role() = 'ADMIN'
  );

create policy "companies: authenticated create"
  on public.companies for insert
  with check (auth.role() = 'authenticated');

create policy "companies: update owner or admin"
  on public.companies for update
  using (created_by = auth.uid() or public.get_user_role() = 'ADMIN');

create policy "companies: admin delete"
  on public.companies for delete
  using (public.get_user_role() = 'ADMIN');

-- ============================================================
-- jobs
-- ============================================================
alter table public.jobs enable row level security;

create policy "jobs: read published / owner / admin"
  on public.jobs for select
  using (
    status = 'PUBLISHED'
    or posted_by = auth.uid()
    or public.get_user_role() = 'ADMIN'
  );

create policy "jobs: create recruiter / alumni / admin"
  on public.jobs for insert
  with check (public.get_user_role() in ('RECRUITER', 'ALUMNI', 'ADMIN'));

create policy "jobs: update owner / admin"
  on public.jobs for update
  using (posted_by = auth.uid() or public.get_user_role() = 'ADMIN');

create policy "jobs: admin delete"
  on public.jobs for delete
  using (public.get_user_role() = 'ADMIN');

-- ============================================================
-- cvs
-- ============================================================
alter table public.cvs enable row level security;

create policy "cvs: read owner or admin"
  on public.cvs for select
  using (student_id = public.my_student_id() or public.get_user_role() = 'ADMIN');

create policy "cvs: manage own"
  on public.cvs for all
  using (student_id = public.my_student_id())
  with check (student_id = public.my_student_id());

create policy "cvs: admin manage"
  on public.cvs for all
  using (public.get_user_role() = 'ADMIN')
  with check (public.get_user_role() = 'ADMIN');

-- ============================================================
-- applications
-- ============================================================
alter table public.applications enable row level security;

create policy "applications: read owner / recruiter / admin"
  on public.applications for select
  using (
    student_id = public.my_student_id()
    or job_id in (select id from public.jobs where company_id = public.my_company_id())
    or public.get_user_role() = 'ADMIN'
  );

create policy "applications: student apply"
  on public.applications for insert
  with check (student_id = public.my_student_id());

create policy "applications: recruiter / student / admin update"
  on public.applications for update
  using (
    student_id = public.my_student_id()
    or job_id in (select id from public.jobs where company_id = public.my_company_id())
    or public.get_user_role() = 'ADMIN'
  );

-- ============================================================
-- interviews
-- ============================================================
alter table public.interviews enable row level security;

create policy "interviews: read applicant / recruiter / admin"
  on public.interviews for select
  using (
    application_id in (select id from public.applications where student_id = public.my_student_id())
    or application_id in (select id from public.applications where job_id in (select id from public.jobs where company_id = public.my_company_id()))
    or public.get_user_role() = 'ADMIN'
  );

create policy "interviews: manage recruiter / admin"
  on public.interviews for all
  using (
    scheduled_by = auth.uid()
    or application_id in (select id from public.applications where job_id in (select id from public.jobs where company_id = public.my_company_id()))
    or public.get_user_role() in ('ADMIN', 'FACULTY')
  )
  with check (
    public.get_user_role() in ('ADMIN', 'RECRUITER', 'FACULTY')
  );

-- ============================================================
-- conversations / members / messages
-- ============================================================
alter table public.conversations enable row level security;

create policy "conversations: read member or admin"
  on public.conversations for select
  using (
    id in (select conversation_id from public.conversation_members where user_id = auth.uid())
    or public.get_user_role() = 'ADMIN'
  );

create policy "conversations: any authenticated can create"
  on public.conversations for insert
  with check (auth.role() = 'authenticated');

alter table public.conversation_members enable row level security;

create policy "members: read own / admin"
  on public.conversation_members for select
  using (user_id = auth.uid() or public.get_user_role() = 'ADMIN');

create policy "members: join conversation"
  on public.conversation_members for insert
  with check (auth.role() = 'authenticated');

alter table public.messages enable row level security;

create policy "messages: read participants / admin"
  on public.messages for select
  using (
    sender_id = auth.uid()
    or conversation_id in (select conversation_id from public.conversation_members where user_id = auth.uid())
    or public.get_user_role() = 'ADMIN'
  );

create policy "messages: send as participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and conversation_id in (select conversation_id from public.conversation_members where user_id = auth.uid())
  );

create policy "messages: mark read as participant"
  on public.messages for update
  using (
    conversation_id in (select conversation_id from public.conversation_members where user_id = auth.uid())
  );

-- ============================================================
-- notifications
-- ============================================================
alter table public.notifications enable row level security;

create policy "notifications: read own / admin"
  on public.notifications for select
  using (user_id = auth.uid() or public.get_user_role() = 'ADMIN');

create policy "notifications: mark read"
  on public.notifications for update
  using (user_id = auth.uid() or public.get_user_role() = 'ADMIN');

-- ============================================================
-- events
-- ============================================================
alter table public.events enable row level security;

create policy "events: public read"
  on public.events for select
  using (true);

create policy "events: manage admin / faculty"
  on public.events for all
  using (public.get_user_role() in ('ADMIN', 'FACULTY'))
  with check (public.get_user_role() in ('ADMIN', 'FACULTY'));

alter table public.event_registrations enable row level security;

create policy "registrations: read owner / admin"
  on public.event_registrations for select
  using (student_id = public.my_student_id() or public.get_user_role() = 'ADMIN');

create policy "registrations: student register"
  on public.event_registrations for all
  using (student_id = public.my_student_id())
  with check (student_id = public.my_student_id());

-- ============================================================
-- recommendations / referrals
-- ============================================================
alter table public.recommendations enable row level security;

create policy "recommendations: read student / faculty / admin"
  on public.recommendations for select
  using (
    student_id = public.my_student_id()
    or faculty_id = auth.uid()
    or public.get_user_role() = 'ADMIN'
  );

create policy "recommendations: faculty create"
  on public.recommendations for insert
  with check (public.get_user_role() in ('FACULTY', 'ADMIN'));

alter table public.referrals enable row level security;

create policy "referrals: read alumni / student / admin"
  on public.referrals for select
  using (
    alumni_id = auth.uid()
    or student_id = public.my_student_id()
    or public.get_user_role() = 'ADMIN'
  );

create policy "referrals: alumni create"
  on public.referrals for insert
  with check (public.get_user_role() in ('ALUMNI', 'ADMIN'));

-- ============================================================
-- job reports
-- ============================================================
alter table public.job_reports enable row level security;

create policy "reports: read reporter / admin"
  on public.job_reports for select
  using (reporter_id = auth.uid() or public.get_user_role() = 'ADMIN');

create policy "reports: any authenticated user"
  on public.job_reports for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- campus recruitment
-- ============================================================
alter table public.campus_recruitment enable row level security;

create policy "campus: read owner company / admin"
  on public.campus_recruitment for select
  using (
    company_id = public.my_company_id()
    or public.get_user_role() = 'ADMIN'
  );

create policy "campus: recruiter request"
  on public.campus_recruitment for insert
  with check (public.get_user_role() in ('RECRUITER', 'ADMIN'));

create policy "campus: admin update"
  on public.campus_recruitment for update
  using (public.get_user_role() = 'ADMIN');

-- ============================================================
-- placements
-- ============================================================
alter table public.placements enable row level security;

create policy "placements: read admin / faculty"
  on public.placements for select
  using (public.get_user_role() in ('ADMIN', 'FACULTY', 'RECRUITER'));

create policy "placements: admin only"
  on public.placements for all
  using (public.get_user_role() = 'ADMIN')
  with check (public.get_user_role() = 'ADMIN');

-- ============================================================
-- profile building blocks
-- ============================================================
alter table public.education enable row level security;
create policy "education: own profile"
  on public.education for all
  using (student_id = public.my_student_id() or public.get_user_role() = 'ADMIN')
  with check (student_id = public.my_student_id() or public.get_user_role() = 'ADMIN');

alter table public.projects enable row level security;
create policy "projects: own profile"
  on public.projects for all
  using (student_id = public.my_student_id() or public.get_user_role() = 'ADMIN')
  with check (student_id = public.my_student_id() or public.get_user_role() = 'ADMIN');

alter table public.experience enable row level security;
create policy "experience: own profile"
  on public.experience for all
  using (student_id = public.my_student_id() or public.get_user_role() = 'ADMIN')
  with check (student_id = public.my_student_id() or public.get_user_role() = 'ADMIN');

alter table public.skills enable row level security;
create policy "skills: public read"
  on public.skills for select using (true);
create policy "skills: authenticated create"
  on public.skills for insert with check (auth.role() = 'authenticated');

alter table public.student_skills enable row level security;
create policy "student_skills: own profile"
  on public.student_skills for all
  using (student_id = public.my_student_id() or public.get_user_role() = 'ADMIN')
  with check (student_id = public.my_student_id() or public.get_user_role() = 'ADMIN');

-- ============================================================
-- audit / email logs: service_role only (no policies → no anon/authenticated access)
-- ============================================================
alter table public.audit_logs enable row level security;
alter table public.email_logs enable row level security;

-- ============================================================
-- grants
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon;
grant all on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant all on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;