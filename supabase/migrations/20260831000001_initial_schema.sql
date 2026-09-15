-- ============================================================
-- NITER Job Portal — Initial Schema (PostgreSQL / Supabase)
-- Tables, ENUM types, constraints, indexes
-- ============================================================

-- ---------- ENUM types ----------
create type user_role         as enum ('ADMIN', 'STUDENT', 'ALUMNI', 'RECRUITER', 'FACULTY');
create type user_status       as enum ('PENDING', 'ACTIVE', 'SUSPENDED');
create type company_verification as enum ('PENDING', 'VERIFIED', 'REJECTED');
create type job_source        as enum ('ADMIN', 'RECRUITER', 'ALUMNI');
create type job_status        as enum ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CLOSED', 'EXPIRED');
create type employment_type   as enum ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');
create type application_status as enum ('APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');
create type interview_status  as enum ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
create type cv_type           as enum ('UPLOADED', 'ONLINE');
create type message_status    as enum ('SENT', 'READ');
create type event_type        as enum ('JOB_FAIR', 'CAREER_FAIR', 'SEMINAR', 'WORKSHOP', 'INTERNSHIP_FAIR', 'RECRUITMENT');
create type registration_status as enum ('REGISTERED', 'CANCELLED', 'ATTENDED');
create type referral_status   as enum ('SENT', 'ACCEPTED', 'DECLINED');

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- users ----------
create table public.users (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null unique,
  name            text not null,
  role            user_role not null default 'STUDENT',
  status          user_status not null default 'PENDING',
  is_verified     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ---------- students ----------
create table public.students (
  id             bigint generated always as identity primary key,
  user_id        uuid not null unique references public.users (id) on delete cascade,
  student_id     text not null unique,
  department     text,
  program        text,
  batch          text,
  semester       text,
  cgpa           numeric(4, 2),
  phone          text,
  profile_photo  text,
  linkedin_url   text,
  github_url     text,
  portfolio_url  text,
  bio            text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

-- ---------- alumni ----------
create table public.alumni (
  id               bigint generated always as identity primary key,
  user_id          uuid not null unique references public.users (id) on delete cascade,
  student_id       text,
  graduation_year  integer,
  department       text,
  current_company  text,
  current_position text,
  industry         text,
  linkedin_url     text,
  bio              text,
  is_verified      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_alumni_updated_at before update on public.alumni
  for each row execute function public.set_updated_at();

-- ---------- companies ----------
create table public.companies (
  id                  bigint generated always as identity primary key,
  name                text not null,
  logo                text,
  industry            text,
  website             text,
  location            text,
  description         text,
  company_size        text,
  verification_status company_verification not null default 'PENDING',
  created_by          uuid references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

-- ---------- recruiters ----------
create table public.recruiters (
  id           bigint generated always as identity primary key,
  user_id      uuid not null unique references public.users (id) on delete cascade,
  company_id   bigint references public.companies (id) on delete set null,
  designation  text,
  is_verified  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_recruiters_updated_at before update on public.recruiters
  for each row execute function public.set_updated_at();

-- ---------- faculty ----------
create table public.faculty (
  id           bigint generated always as identity primary key,
  user_id      uuid not null unique references public.users (id) on delete cascade,
  department   text,
  designation  text,
  employee_id  text unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_faculty_updated_at before update on public.faculty
  for each row execute function public.set_updated_at();

-- ---------- jobs ----------
create table public.jobs (
  id                 bigint generated always as identity primary key,
  company_id         bigint references public.companies (id) on delete set null,
  posted_by          uuid references public.users (id) on delete restrict,
  source_type        job_source not null default 'RECRUITER',
  title              text not null,
  description        text,
  responsibilities   text,
  requirements       text,
  employment_type    employment_type not null default 'FULL_TIME',
  location           text,
  salary_min         numeric(12, 2),
  salary_max         numeric(12, 2),
  vacancy_count      integer not null default 1,
  deadline           timestamptz,
  status             job_status not null default 'DRAFT',
  verification_status company_verification not null default 'PENDING',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_jobs_status_deadline on public.jobs (status, deadline);
create index idx_jobs_company on public.jobs (company_id);
create trigger trg_jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- ---------- cvs ----------
create table public.cvs (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students (id) on delete cascade,
  cv_type     cv_type not null default 'UPLOADED',
  title       text not null default 'My CV',
  file_path   text,
  content     jsonb,
  is_default  boolean not null default false,
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_cvs_updated_at before update on public.cvs
  for each row execute function public.set_updated_at();

-- ---------- applications ----------
create table public.applications (
  id           bigint generated always as identity primary key,
  job_id       bigint not null references public.jobs (id) on delete cascade,
  student_id   bigint not null references public.students (id) on delete cascade,
  cv_id        bigint references public.cvs (id) on delete set null,
  cover_letter text,
  status       application_status not null default 'APPLIED',
  applied_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint uq_applications_student_job unique (job_id, student_id)
);
create index idx_applications_job on public.applications (job_id);
create index idx_applications_student on public.applications (student_id);
create trigger trg_applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- ---------- interviews ----------
create table public.interviews (
  id               bigint generated always as identity primary key,
  application_id   bigint not null references public.applications (id) on delete cascade,
  scheduled_by     uuid references public.users (id) on delete set null,
  interview_date   date not null,
  start_time       time not null,
  end_time         time,
  venue            text,
  meeting_link     text,
  notes            text,
  status           interview_status not null default 'SCHEDULED',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_interviews_updated_at before update on public.interviews
  for each row execute function public.set_updated_at();

-- ---------- skills ----------
create table public.skills (
  id   bigint generated always as identity primary key,
  name text not null unique
);

create table public.student_skills (
  id         bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  skill_id   bigint not null references public.skills (id) on delete cascade,
  constraint uq_student_skill unique (student_id, skill_id)
);

-- ---------- education / projects / experience ----------
create table public.education (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students (id) on delete cascade,
  degree      text,
  institution text,
  field       text,
  start_year  integer,
  end_year    integer,
  gpa         numeric(4, 2)
);

create table public.projects (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students (id) on delete cascade,
  title       text not null,
  description text,
  link        text,
  start_year  integer,
  end_year    integer
);

create table public.experience (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students (id) on delete cascade,
  role        text,
  company     text,
  location    text,
  start_date  date,
  end_date    date,
  is_current  boolean not null default false,
  description text
);

-- ---------- conversations / messages (real-time chat) ----------
create table public.conversations (
  id         bigint generated always as identity primary key,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  last_read_at    timestamptz,
  joined_at       timestamptz not null default now(),
  constraint uq_conversation_member unique (conversation_id, user_id)
);
create index idx_conversation_members_user on public.conversation_members (user_id);

create table public.messages (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.users (id) on delete cascade,
  body            text not null,
  status          message_status not null default 'SENT',
  job_id          bigint references public.jobs (id) on delete set null,
  application_id  bigint references public.applications (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index idx_messages_conversation on public.messages (conversation_id, created_at);

-- ---------- notifications ----------
create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.users (id) on delete cascade,
  title      text not null,
  message    text,
  type       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_read on public.notifications (user_id, is_read);

-- ---------- events ----------
create table public.events (
  id                    bigint generated always as identity primary key,
  title                 text not null,
  description           text,
  event_type            event_type not null default 'CAREER_FAIR',
  starts_at             timestamptz not null,
  ends_at               timestamptz,
  venue                 text,
  organizer             text,
  registration_deadline timestamptz,
  capacity              integer,
  created_by            uuid references public.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger trg_events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_registrations (
  id         bigint generated always as identity primary key,
  event_id   bigint not null references public.events (id) on delete cascade,
  student_id bigint references public.students (id) on delete cascade,
  status     registration_status not null default 'REGISTERED',
  created_at timestamptz not null default now(),
  constraint uq_event_student unique (event_id, student_id)
);

-- ---------- recommendations / referrals ----------
create table public.recommendations (
  id          bigint generated always as identity primary key,
  faculty_id  uuid not null references public.users (id) on delete cascade,
  student_id  bigint not null references public.students (id) on delete cascade,
  job_id      bigint references public.jobs (id) on delete cascade,
  message     text,
  created_at  timestamptz not null default now()
);

create table public.referrals (
  id          bigint generated always as identity primary key,
  alumni_id   uuid not null references public.users (id) on delete cascade,
  student_id  bigint not null references public.students (id) on delete cascade,
  job_id      bigint references public.jobs (id) on delete cascade,
  message     text,
  status      referral_status not null default 'SENT',
  created_at  timestamptz not null default now()
);

-- ---------- job reports ----------
create table public.job_reports (
  id          bigint generated always as identity primary key,
  job_id      bigint not null references public.jobs (id) on delete cascade,
  reporter_id uuid references public.users (id) on delete set null,
  reason      text not null,
  status      text not null default 'OPEN',
  created_at  timestamptz not null default now()
);

-- ---------- campus recruitment ----------
create table public.campus_recruitment (
  id          bigint generated always as identity primary key,
  company_id  bigint not null references public.companies (id) on delete cascade,
  requested_by uuid references public.users (id) on delete set null,
  status      text not null default 'PENDING',
  eligibility jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_campus_recruitment_updated_at before update on public.campus_recruitment
  for each row execute function public.set_updated_at();

-- ---------- placements ----------
create table public.placements (
  id             bigint generated always as identity primary key,
  application_id bigint references public.applications (id) on delete set null,
  student_id     bigint not null references public.students (id) on delete cascade,
  job_id         bigint references public.jobs (id) on delete set null,
  company_id     bigint references public.companies (id) on delete set null,
  offer_date     date default current_date,
  salary         numeric(12, 2),
  created_at     timestamptz not null default now()
);

-- ---------- audit / email logs (edge functions) ----------
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  action       text not null,
  resource     text not null,
  resource_id  text,
  performed_by uuid,
  created_at   timestamptz not null default now()
);

create table public.email_logs (
  id         bigint generated always as identity primary key,
  type       text not null,
  to_email   text not null,
  email_id   text,
  created_at timestamptz not null default now()
);