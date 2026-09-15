-- ============================================================
-- NITER Job Portal — Notification Triggers
-- Postgres triggers to create in-app notifications for key events
-- ============================================================

-- ---------- Helper: notify_user (already exists in 000012, but ensure it's available) ----------
-- Re-create idempotently
create or replace function public.notify_user(p_user_id uuid, p_title text, p_message text, p_type text default 'notification')
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, title, message, type)
  values (p_user_id, p_title, p_message, p_type);
end;
$$;

grant execute on function public.notify_user(uuid, text, text, text) to authenticated;
grant execute on function public.notify_user(uuid, text, text, text) to service_role;

-- ---------- 1. Application status change → notify student ----------
create or replace function public.notify_application_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_student_user_id uuid;
  v_job_title text;
  v_status_label text;
  v_old_status text;
  v_new_status text;
begin
  -- Cast to text for comparison
  v_old_status := OLD.status::text;
  v_new_status := NEW.status::text;
  
  -- Only notify on actual status change
  if v_old_status = v_new_status then
    return NEW;
  end if;

  -- Get the student's user_id
  select u.id into v_student_user_id
  from public.students s
  join public.users u on u.id = s.user_id
  where s.id = NEW.student_id;

  -- Get job title for context
  select title into v_job_title
  from public.jobs
  where id = NEW.job_id;

  -- Human-readable status
  v_status_label := case v_new_status
    when 'APPLIED' then 'Applied'
    when 'UNDER_REVIEW' then 'Under Review'
    when 'SHORTLISTED' then 'Shortlisted'
    when 'INTERVIEW_SCHEDULED' then 'Interview Scheduled'
    when 'SELECTED' then 'Selected'
    when 'REJECTED' then 'Rejected'
    when 'WITHDRAWN' then 'Withdrawn'
    when 'EXPIRED' then 'Expired'
    else v_new_status
  end;

  if v_student_user_id is not null and v_job_title is not null then
    perform public.notify_user(
      v_student_user_id,
      'Application Status Update: ' || v_job_title,
      format('Your application for "%s" is now: %s.', v_job_title, v_status_label),
      'application_status'
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_application_status_notification on public.applications;
create trigger trg_application_status_notification
  after update of status on public.applications
  for each row execute function public.notify_application_status_change();

-- ---------- 2. Interview scheduled → notify student ----------
create or replace function public.notify_interview_scheduled()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_student_user_id uuid;
  v_job_title text;
  v_interview_date date;
  v_start_time time;
  v_venue text;
  v_meeting_link text;
begin
  -- Only notify on new interview or status change to SCHEDULED
  if (OLD.status is not distinct from NEW.status and OLD.interview_date is not distinct from NEW.interview_date) then
    return NEW;
  end if;

  -- Only notify when status becomes SCHEDULED (not on COMPLETED/CANCELLED)
  if NEW.status <> 'SCHEDULED' then
    return NEW;
  end if;

  -- Get student's user_id via application
  select u.id into v_student_user_id
  from public.applications a
  join public.students s on s.id = a.student_id
  join public.users u on u.id = s.user_id
  where a.id = NEW.application_id;

  -- Get job title
  select j.title into v_job_title
  from public.applications a
  join public.jobs j on j.id = a.job_id
  where a.id = NEW.application_id;

  v_interview_date := NEW.interview_date;
  v_start_time := NEW.start_time;
  v_venue := NEW.venue;
  v_meeting_link := NEW.meeting_link;

  if v_student_user_id is not null and v_job_title is not null then
    perform public.notify_user(
      v_student_user_id,
      'Interview Scheduled: ' || v_job_title,
      format('You have an interview for "%s" on %s at %s%s%s.',
        v_job_title,
        to_char(v_interview_date, 'Mon DD, YYYY'),
        to_char(v_start_time, 'HH12:MI AM'),
        coalesce(' at ' || v_venue, ''),
        coalesce(' | Meeting: ' || v_meeting_link, '')
      ),
      'interview_scheduled'
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_interview_scheduled_notification on public.interviews;
create trigger trg_interview_scheduled_notification
  after insert or update on public.interviews
  for each row execute function public.notify_interview_scheduled();

-- ---------- 3. Job approved (status -> PUBLISHED) → notify poster (recruiter/alumni) ----------
create or replace function public.notify_job_approved()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_poster_user_id uuid;
  v_job_title text;
begin
  -- Only notify when status changes TO PUBLISHED
  if OLD.status is not distinct from NEW.status then
    return NEW;
  end if;
  if NEW.status <> 'PUBLISHED' then
    return NEW;
  end if;

  v_poster_user_id := NEW.posted_by;
  v_job_title := NEW.title;

  if v_poster_user_id is not null and v_job_title is not null then
    perform public.notify_user(
      v_poster_user_id,
      'Job Approved & Published: ' || v_job_title,
      format('Your job post "%s" has been approved and is now visible to students.', v_job_title),
      'job_approved'
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_job_approved_notification on public.jobs;
create trigger trg_job_approved_notification
  after update of status on public.jobs
  for each row execute function public.notify_job_approved();