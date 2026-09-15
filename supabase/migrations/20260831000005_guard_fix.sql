-- ============================================================
-- NITER Job Portal — guard fix
-- NULL auth.uid() made `role <> 'ADMIN'` evaluate to NULL and
-- bypass the guard. Use `is distinct from` so any non-ADMIN
-- (including an unauthenticated / NULL-uid context) is blocked.
-- ============================================================

create or replace function public.guard_job_status()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'PUBLISHED' and old.status is distinct from 'PUBLISHED' then
    if public.get_user_role() is distinct from 'ADMIN'::public.user_role then
      raise exception 'Only admins can publish jobs';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_company_verification()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status then
    if public.get_user_role() is distinct from 'ADMIN'::public.user_role then
      raise exception 'Only admins can change company verification status';
    end if;
  end if;
  return new;
end;
$$;