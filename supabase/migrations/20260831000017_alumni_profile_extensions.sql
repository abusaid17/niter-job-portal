-- ============================================================
-- NITER Job Portal — Alumni Profile Extensions
-- Education, experience, projects, skills, CVs for alumni
-- ============================================================

-- ---------- alumni_education ----------
create table public.alumni_education (
  id          bigint generated always as identity primary key,
  alumni_id   bigint not null references public.alumni (id) on delete cascade,
  degree      text,
  institution text,
  field       text,
  start_year  integer,
  end_year    integer,
  gpa         numeric(4, 2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_alumni_education_updated_at before update on public.alumni_education
  for each row execute function public.set_updated_at();

-- ---------- alumni_experience ----------
create table public.alumni_experience (
  id          bigint generated always as identity primary key,
  alumni_id   bigint not null references public.alumni (id) on delete cascade,
  role        text,
  company     text,
  location    text,
  start_date  date,
  end_date    date,
  is_current  boolean not null default false,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_alumni_experience_updated_at before update on public.alumni_experience
  for each row execute function public.set_updated_at();

-- ---------- alumni_projects ----------
create table public.alumni_projects (
  id          bigint generated always as identity primary key,
  alumni_id   bigint not null references public.alumni (id) on delete cascade,
  title       text not null,
  description text,
  link        text,
  start_year  integer,
  end_year    integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_alumni_projects_updated_at before update on public.alumni_projects
  for each row execute function public.set_updated_at();

-- ---------- alumni_skills (junction table) ----------
create table public.alumni_skills (
  id         bigint generated always as identity primary key,
  alumni_id  bigint not null references public.alumni (id) on delete cascade,
  skill_id   bigint not null references public.skills (id) on delete cascade,
  constraint uq_alumni_skill unique (alumni_id, skill_id)
);

-- ---------- alumni_cvs ----------
create table public.alumni_cvs (
  id          bigint generated always as identity primary key,
  alumni_id   bigint not null references public.alumni (id) on delete cascade,
  cv_type     cv_type not null default 'UPLOADED',
  title       text not null default 'My CV',
  file_path   text,
  content     jsonb,
  is_default  boolean not null default false,
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_alumni_cvs_updated_at before update on public.alumni_cvs
  for each row execute function public.set_updated_at();

-- ---------- RLS Policies ----------

-- alumni_education
alter table public.alumni_education enable row level security;
create policy "alumni_education: own or admin"
  on public.alumni_education for all
  using (alumni_id in (select id from public.alumni where user_id = auth.uid()) or public.get_user_role() = 'ADMIN')
  with check (alumni_id in (select id from public.alumni where user_id = auth.uid()) or public.get_user_role() = 'ADMIN');

-- alumni_experience
alter table public.alumni_experience enable row level security;
create policy "alumni_experience: own or admin"
  on public.alumni_experience for all
  using (alumni_id in (select id from public.alumni where user_id = auth.uid()) or public.get_user_role() = 'ADMIN')
  with check (alumni_id in (select id from public.alumni where user_id = auth.uid()) or public.get_user_role() = 'ADMIN');

-- alumni_projects
alter table public.alumni_projects enable row level security;
create policy "alumni_projects: own or admin"
  on public.alumni_projects for all
  using (alumni_id in (select id from public.alumni where user_id = auth.uid()) or public.get_user_role() = 'ADMIN')
  with check (alumni_id in (select id from public.alumni where user_id = auth.uid()) or public.get_user_role() = 'ADMIN');

-- alumni_skills
alter table public.alumni_skills enable row level security;
create policy "alumni_skills: own or admin"
  on public.alumni_skills for all
  using (alumni_id in (select id from public.alumni where user_id = auth.uid()) or public.get_user_role() = 'ADMIN')
  with check (alumni_id in (select id from public.alumni where user_id = auth.uid()) or public.get_user_role() = 'ADMIN');

-- alumni_cvs
alter table public.alumni_cvs enable row level security;
create policy "alumni_cvs: own or admin"
  on public.alumni_cvs for all
  using (alumni_id in (select id from public.alumni where user_id = auth.uid()) or public.get_user_role() = 'ADMIN')
  with check (alumni_id in (select id from public.alumni where user_id = auth.uid()) or public.get_user_role() = 'ADMIN');

-- ---------- Grants ----------
grant select on public.alumni_education to anon, authenticated;
grant all on public.alumni_education to authenticated;
grant select on public.alumni_experience to anon, authenticated;
grant all on public.alumni_experience to authenticated;
grant select on public.alumni_projects to anon, authenticated;
grant all on public.alumni_projects to authenticated;
grant select on public.alumni_skills to anon, authenticated;
grant all on public.alumni_skills to authenticated;
grant select on public.alumni_cvs to anon, authenticated;
grant all on public.alumni_cvs to authenticated;