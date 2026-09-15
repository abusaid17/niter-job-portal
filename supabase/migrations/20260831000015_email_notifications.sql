-- ============================================================
-- NITER Job Portal — Email Notification Triggers
-- Postgres triggers that call the send-email edge function via pg_net
-- ============================================================

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------- Helper: get edge function URL ----------
CREATE OR REPLACE FUNCTION public.get_edge_function_url()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('app.edge_function_url', TRUE),
    'https://<your-project-ref>.supabase.co/functions/v1/send-email'
  );
$$;

-- In production, set this via: ALTER DATABASE postgres SET app.edge_function_url = 'https://your-project.supabase.co/functions/v1/send-email';
-- And: ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';

-- ---------- Helper: call send-email edge function ----------
CREATE OR REPLACE FUNCTION public.call_send_email(
  p_type TEXT,
  p_to_email TEXT,
  p_detail TEXT DEFAULT '',
  p_link TEXT DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_payload JSONB;
  v_request_id BIGINT;
BEGIN
  -- Skip if no email provided
  IF p_to_email IS NULL OR p_to_email = '' THEN
    RETURN;
  END IF;

  v_url := public.get_edge_function_url();
  v_payload := jsonb_build_object(
    'type', p_type,
    'to', p_to_email,
    'data', jsonb_build_object(
      'detail', p_detail,
      'link', p_link
    )
  );

  -- Fire-and-forget HTTP POST (async via pg_net queue)
  -- net.http_post(url, body, params, headers, timeout_ms)
  v_request_id := net.http_post(
    url := v_url,
    body := v_payload,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', TRUE)
    ),
    timeout_milliseconds := 5000
  );

  -- Wake the worker to process the queue
  PERFORM net.wake();

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  INSERT INTO public.audit_logs (action, resource, resource_id, performed_by)
  VALUES ('email_send_failed', 'notifications', NULL, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.call_send_email(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.call_send_email(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 1. Application SUBMITTED → notify recruiter (INSERT on applications)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_application_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_recruiter_email TEXT;
  v_student_name TEXT;
  v_job_title TEXT;
  v_company_name TEXT;
BEGIN
  -- Get student name
  SELECT u.name INTO v_student_name
  FROM public.students s
  JOIN public.users u ON u.id = s.user_id
  WHERE s.id = NEW.student_id;

  -- Get job title and company
  SELECT j.title, c.name INTO v_job_title, v_company_name
  FROM public.jobs j
  LEFT JOIN public.companies c ON c.id = j.company_id
  WHERE j.id = NEW.job_id;

  -- Get recruiter email (from posted_by)
  SELECT u.email INTO v_recruiter_email
  FROM public.users u
  WHERE u.id = (SELECT posted_by FROM public.jobs WHERE id = NEW.job_id);

  -- If no posted_by, try to get from company's recruiter
  IF v_recruiter_email IS NULL THEN
    SELECT u.email INTO v_recruiter_email
    FROM public.users u
    JOIN public.recruiters r ON r.user_id = u.id
    WHERE r.company_id = (SELECT company_id FROM public.jobs WHERE id = NEW.job_id)
    LIMIT 1;
  END IF;

  IF v_recruiter_email IS NOT NULL AND v_job_title IS NOT NULL THEN
    PERFORM public.call_send_email(
      'application_submitted',
      v_recruiter_email,
      FORMAT('New application from %s for "%s" at %s.', v_student_name, v_job_title, COALESCE(v_company_name, 'your company')),
      ''
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_submitted_email ON public.applications;
CREATE TRIGGER trg_application_submitted_email
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_submitted();

-- ============================================================
-- 5. Referral CREATED → notify referred student
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_referral_created()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_student_user_id UUID;
  v_student_email TEXT;
  v_student_name TEXT;
  v_alumni_name TEXT;
  v_job_title TEXT;
  v_referral_message TEXT;
BEGIN
  -- Get student email, name, and user_id
  SELECT u.id, u.email, u.name INTO v_student_user_id, v_student_email, v_student_name
  FROM public.students s
  JOIN public.users u ON u.id = s.user_id
  WHERE s.id = NEW.student_id;

  -- Get alumni name
  SELECT u.name INTO v_alumni_name
  FROM public.users u
  WHERE u.id = NEW.alumni_id;

  -- Get job title
  SELECT j.title INTO v_job_title
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  v_referral_message := NEW.message;

  IF v_student_user_id IS NOT NULL AND v_job_title IS NOT NULL THEN
    -- In-app notification
    PERFORM public.notify_user(
      v_student_user_id,
      'Referral Received: ' || v_job_title,
      FORMAT('You have been referred for "%s" by %s.%s',
        v_job_title,
        v_alumni_name,
        CASE WHEN v_referral_message IS NOT NULL AND v_referral_message <> '' 
             THEN ' Message: ' || v_referral_message ELSE '' END
      ),
      'referral_received'
    );

    -- Email notification
    IF v_student_email IS NOT NULL THEN
      PERFORM public.call_send_email(
        'referral_received',
        v_student_email,
        FORMAT('You have been referred for "%s" by %s.%s',
          v_job_title,
          v_alumni_name,
          CASE WHEN v_referral_message IS NOT NULL AND v_referral_message <> '' 
               THEN ' Message: ' || v_referral_message ELSE '' END
        ),
        ''
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_created_email ON public.referrals;
CREATE TRIGGER trg_referral_created_email
  AFTER INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.notify_referral_created();

-- ============================================================
-- 6. Faculty Recommendation CREATED → notify student
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_recommendation_created()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_student_user_id UUID;
  v_student_email TEXT;
  v_student_name TEXT;
  v_faculty_name TEXT;
  v_job_title TEXT;
  v_recommendation_message TEXT;
BEGIN
  -- Get student email, name, and user_id
  SELECT u.id, u.email, u.name INTO v_student_user_id, v_student_email, v_student_name
  FROM public.students s
  JOIN public.users u ON u.id = s.user_id
  WHERE s.id = NEW.student_id;

  -- Get faculty name
  SELECT u.name INTO v_faculty_name
  FROM public.users u
  WHERE u.id = NEW.faculty_id;

  -- Get job title (if applicable)
  SELECT j.title INTO v_job_title
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  v_recommendation_message := NEW.message;

  IF v_student_user_id IS NOT NULL THEN
    -- In-app notification
    PERFORM public.notify_user(
      v_student_user_id,
      'Recommendation Received' || CASE WHEN v_job_title IS NOT NULL THEN ': ' || v_job_title ELSE '' END,
      FORMAT('You have received a recommendation from %s.%s%s',
        v_faculty_name,
        CASE WHEN v_job_title IS NOT NULL THEN ' for "' || v_job_title || '"' ELSE '' END,
        CASE WHEN v_recommendation_message IS NOT NULL AND v_recommendation_message <> '' 
             THEN ' Message: ' || v_recommendation_message ELSE '' END
      ),
      'recommendation_received'
    );

    -- Email notification
    IF v_student_email IS NOT NULL THEN
      PERFORM public.call_send_email(
        'recommendation_received',
        v_student_email,
        FORMAT('You have received a recommendation from %s.%s%s',
          v_faculty_name,
          CASE WHEN v_job_title IS NOT NULL THEN ' for "' || v_job_title || '"' ELSE '' END,
          CASE WHEN v_recommendation_message IS NOT NULL AND v_recommendation_message <> '' 
               THEN ' Message: ' || v_recommendation_message ELSE '' END
        ),
        ''
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recommendation_created_email ON public.recommendations;
CREATE TRIGGER trg_recommendation_created_email
  AFTER INSERT ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION public.notify_recommendation_created();

-- ============================================================
-- UPDATED: Application status change → add email to existing in-app notification
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_student_user_id UUID;
  v_student_email TEXT;
  v_job_title TEXT;
  v_status_label TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Cast to text for comparison
  v_old_status := OLD.status::TEXT;
  v_new_status := NEW.status::TEXT;
  
  -- Only notify on actual status change
  IF v_old_status = v_new_status THEN
    RETURN NEW;
  END IF;

  -- Get the student's user_id and email
  SELECT u.id, u.email INTO v_student_user_id, v_student_email
  FROM public.students s
  JOIN public.users u ON u.id = s.user_id
  WHERE s.id = NEW.student_id;

  -- Get job title for context
  SELECT title INTO v_job_title
  FROM public.jobs
  WHERE id = NEW.job_id;

  -- Human-readable status
  v_status_label := CASE v_new_status
    WHEN 'APPLIED' THEN 'Applied'
    WHEN 'UNDER_REVIEW' THEN 'Under Review'
    WHEN 'SHORTLISTED' THEN 'Shortlisted'
    WHEN 'INTERVIEW_SCHEDULED' THEN 'Interview Scheduled'
    WHEN 'SELECTED' THEN 'Selected'
    WHEN 'REJECTED' THEN 'Rejected'
    WHEN 'WITHDRAWN' THEN 'Withdrawn'
    WHEN 'EXPIRED' THEN 'Expired'
    ELSE v_new_status
  END;

  IF v_student_user_id IS NOT NULL AND v_job_title IS NOT NULL THEN
    -- In-app notification
    PERFORM public.notify_user(
      v_student_user_id,
      'Application Status Update: ' || v_job_title,
      FORMAT('Your application for "%s" is now: %s.', v_job_title, v_status_label),
      'application_status'
    );

    -- Email notification (for important status changes)
    IF v_new_status IN ('SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED') AND v_student_email IS NOT NULL THEN
      PERFORM public.call_send_email(
        'status_change',
        v_student_email,
        FORMAT('Your application for "%s" has been updated to: %s.', v_job_title, v_status_label),
        ''
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- UPDATED: Job approved → add email to existing in-app notification
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_job_approved()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_poster_user_id UUID;
  v_poster_email TEXT;
  v_job_title TEXT;
BEGIN
  -- Only notify when status changes TO PUBLISHED
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'PUBLISHED' THEN
    RETURN NEW;
  END IF;

  v_poster_user_id := NEW.posted_by;
  v_job_title := NEW.title;

  -- Get poster email
  SELECT email INTO v_poster_email
  FROM public.users
  WHERE id = v_poster_user_id;

  IF v_poster_user_id IS NOT NULL AND v_job_title IS NOT NULL THEN
    -- In-app notification
    PERFORM public.notify_user(
      v_poster_user_id,
      'Job Approved & Published: ' || v_job_title,
      FORMAT('Your job post "%s" has been approved and is now visible to students.', v_job_title),
      'job_approved'
    );

    -- Email notification
    IF v_poster_email IS NOT NULL THEN
      PERFORM public.call_send_email(
        'job_approval',
        v_poster_email,
        FORMAT('Your job post "%s" has been approved and is now visible to students.', v_job_title),
        ''
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- UPDATED: Interview scheduled → add email to existing in-app notification
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_interview_scheduled()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_student_user_id UUID;
  v_student_email TEXT;
  v_job_title TEXT;
  v_interview_date DATE;
  v_start_time TIME;
  v_venue TEXT;
  v_meeting_link TEXT;
BEGIN
  -- Only notify on new interview or status change to SCHEDULED
  IF (OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.interview_date IS NOT DISTINCT FROM NEW.interview_date) THEN
    RETURN NEW;
  END IF;

  -- Only notify when status becomes SCHEDULED (not on COMPLETED/CANCELLED)
  IF NEW.status <> 'SCHEDULED' THEN
    RETURN NEW;
  END IF;

  -- Get student's user_id and email via application
  SELECT u.id, u.email INTO v_student_user_id, v_student_email
  FROM public.applications a
  JOIN public.students s ON s.id = a.student_id
  JOIN public.users u ON u.id = s.user_id
  WHERE a.id = NEW.application_id;

  -- Get job title
  SELECT j.title INTO v_job_title
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  v_interview_date := NEW.interview_date;
  v_start_time := NEW.start_time;
  v_venue := NEW.venue;
  v_meeting_link := NEW.meeting_link;

  IF v_student_user_id IS NOT NULL AND v_job_title IS NOT NULL THEN
    -- In-app notification
    PERFORM public.notify_user(
      v_student_user_id,
      'Interview Scheduled: ' || v_job_title,
      FORMAT('You have an interview for "%s" on %s at %s%s%s.',
        v_job_title,
        TO_CHAR(v_interview_date, 'Mon DD, YYYY'),
        TO_CHAR(v_start_time, 'HH12:MI AM'),
        COALESCE(' at ' || v_venue, ''),
        COALESCE(' | Meeting: ' || v_meeting_link, '')
      ),
      'interview_scheduled'
    );

    -- Email notification
    IF v_student_email IS NOT NULL THEN
      PERFORM public.call_send_email(
        'interview_scheduled',
        v_student_email,
        FORMAT('You have an interview for "%s" on %s at %s%s%s.',
          v_job_title,
          TO_CHAR(v_interview_date, 'Mon DD, YYYY'),
          TO_CHAR(v_start_time, 'HH12:MI AM'),
          COALESCE(' at ' || v_venue, ''),
          COALESCE(' | Meeting: ' || v_meeting_link, '')
        ),
        ''
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;