-- Strengthen faculty verification guard: block any change to a STUDENT row's
-- profile fields (name/email/role/status). Only is_verified may change.
-- (updated_at is auto-bumped by trg_users_updated_at and allowed.)
create or replace function public.guard_users_faculty_verify()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.get_user_role() = 'FACULTY' and old.role = 'STUDENT' then
    if new.name is distinct from old.name
       or new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.status is distinct from old.status
    then
      raise exception 'Faculty may only update the verification status of student accounts';
    end if;
  end if;
  return new;
end;
$$;