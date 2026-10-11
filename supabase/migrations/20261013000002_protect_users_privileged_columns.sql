-- Fix: any logged-in user could UPDATE their own public.users row, including role,
-- status and is_verified (policy "users: update own or admin" has no column limits).
-- This trigger limits who may change those three columns. Nothing else changes.
create or replace function public.guard_users_privileged_columns() returns trigger language plpgsql security definer
set search_path to 'public' as $function$
declare v_role text;
begin -- Not an end-user request (SQL editor, migrations, service key, auth service): allow.
if auth.uid() is null then return new;
end if;
v_role := public.get_user_role()::text;
-- Admins may change anything.
if v_role = 'ADMIN' then return new;
end if;
-- Nobody else may change role or status (including their own).
if new.role is distinct
from old.role
    or new.status is distinct
from old.status then raise exception 'Only an admin can change role or status.';
end if;
-- is_verified: only faculty verifying a student account (admin handled above).
if new.is_verified is distinct
from old.is_verified then if not (
        v_role = 'FACULTY'
        and old.role = 'STUDENT'
    ) then raise exception 'Only an admin or faculty can change verification.';
end if;
end if;
return new;
end;
$function$;
drop trigger if exists trg_users_protect_privileged on public.users;
create trigger trg_users_protect_privileged before
update of role,
    status,
    is_verified on public.users for each row execute function public.guard_users_privileged_columns();