-- ============================================================
-- NITER Job Portal — 70% profile completeness gate for applying
--
-- Enforces in the DATABASE what the UI only hints at, so the rule
-- cannot be bypassed from the browser (e.g. direct PostgREST calls).
--
-- Checklist mirrors the frontend exactly (equal weights, same items):
--   students (9 items, percent = done/9): student_id+department,
--     session, phone, bio-or-links, education, skills, experience,
--     projects, CV — see StudentDashboardPage completeness card.
--   alumni (8 items, percent = done/8): student_id, graduation_year,
--     department, current_company, current_position, industry,
--     linkedin_url, bio — see AlumniProfilePage completeness card.
-- Percent uses round() to match the frontend's Math.round exactly.
-- (Verified: truncation vs rounding never flips the >=70 outcome,
-- but round() keeps the numbers identical.)
--
-- BEFORE INSERT trigger on applications raises
-- 'Profile must be at least 70% complete to apply.' for applicants
-- below 70. Applicant identity comes from the NEW row itself:
-- student applications via student_id -> students -> users,
-- alumni applications via applicant_user_id -> users. Other roles
-- never insert applications (RLS "allow authenticated apply" only
-- permits own student/alumni rows), and existing rows / UPDATEs are
-- untouched — the trigger fires on INSERT only.
-- Apply with: supabase db push
-- ============================================================
-- ---------- completeness score (0-100) for a user ----------
create or replace function public.profile_completeness(p_user_id uuid) returns integer language sql stable security definer
set search_path = public as $$
select case
    when exists (
      select 1
      from public.students
      where user_id = p_user_id
    ) then (
      select round(
          (
            (
              case
                when coalesce(btrim(s.student_id), '') <> ''
                and coalesce(btrim(s.department), '') <> '' then 1
                else 0
              end
            ) + (
              case
                when coalesce(btrim(s.session), '') <> '' then 1
                else 0
              end
            ) + (
              case
                when coalesce(btrim(s.phone), '') <> '' then 1
                else 0
              end
            ) + (
              case
                when coalesce(btrim(s.bio), '') <> ''
                or coalesce(btrim(s.github_url), '') <> ''
                or coalesce(btrim(s.linkedin_url), '') <> '' then 1
                else 0
              end
            ) + (
              case
                when exists (
                  select 1
                  from public.education
                  where student_id = s.id
                ) then 1
                else 0
              end
            ) + (
              case
                when exists (
                  select 1
                  from public.student_skills
                  where student_id = s.id
                ) then 1
                else 0
              end
            ) + (
              case
                when exists (
                  select 1
                  from public.experience
                  where student_id = s.id
                ) then 1
                else 0
              end
            ) + (
              case
                when exists (
                  select 1
                  from public.projects
                  where student_id = s.id
                ) then 1
                else 0
              end
            ) + (
              case
                when exists (
                  select 1
                  from public.cvs
                  where student_id = s.id
                ) then 1
                else 0
              end
            )
          ) * 100.0 / 9
        )::integer
      from public.students s
      where s.user_id = p_user_id
      limit 1
    )
    when exists (
      select 1
      from public.alumni
      where user_id = p_user_id
    ) then (
      select round(
          (
            (
              case
                when coalesce(btrim(a.student_id), '') <> '' then 1
                else 0
              end
            ) + (
              case
                when a.graduation_year is not null then 1
                else 0
              end
            ) + (
              case
                when coalesce(btrim(a.department), '') <> '' then 1
                else 0
              end
            ) + (
              case
                when coalesce(btrim(a.current_company), '') <> '' then 1
                else 0
              end
            ) + (
              case
                when coalesce(btrim(a.current_position), '') <> '' then 1
                else 0
              end
            ) + (
              case
                when coalesce(btrim(a.industry), '') <> '' then 1
                else 0
              end
            ) + (
              case
                when coalesce(btrim(a.linkedin_url), '') <> '' then 1
                else 0
              end
            ) + (
              case
                when coalesce(btrim(a.bio), '') <> '' then 1
                else 0
              end
            )
          ) * 100.0 / 8
        )::integer
      from public.alumni a
      where a.user_id = p_user_id
      limit 1
    )
    else 0
  end $$;
grant execute on function public.profile_completeness(uuid) to authenticated;
-- ---------- block applications below 70% ----------
create or replace function public.guard_application_completeness() returns trigger language plpgsql security definer
set search_path = public as $$
declare v_user_id uuid;
v_score integer;
begin if TG_OP <> 'INSERT' then return NEW;
end if;
if NEW.student_id is not null then
select user_id into v_user_id
from public.students
where id = NEW.student_id;
elsif NEW.applicant_user_id is not null then v_user_id := NEW.applicant_user_id;
else -- Malformed row (no candidate): leave to the check constraint.
return NEW;
end if;
if v_user_id is null then return NEW;
end if;
v_score := public.profile_completeness(v_user_id);
if v_score < 70 then raise exception 'Profile must be at least 70%% complete to apply.';
end if;
return NEW;
end;
$$;
drop trigger if exists trg_applications_guard_completeness on public.applications;
create trigger trg_applications_guard_completeness before
insert on public.applications for each row execute function public.guard_application_completeness();