-- Fix A-01: signup must never accept ADMIN (or any unknown role) from client metadata.
-- ADMIN accounts can only be created manually via SQL by an existing admin.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer
set search_path to 'public' as $function$
declare v_role public.user_role;
begin v_role := case
    upper(coalesce(new.raw_user_meta_data->>'role', ''))
    when 'STUDENT' then 'STUDENT'::public.user_role
    when 'ALUMNI' then 'ALUMNI'::public.user_role
    when 'RECRUITER' then 'RECRUITER'::public.user_role
    when 'FACULTY' then 'FACULTY'::public.user_role
    else 'STUDENT'::public.user_role
end;
insert into public.users (id, email, name, role)
values (
        new.id,
        new.email,
        coalesce(
            new.raw_user_meta_data->>'name',
            new.raw_user_meta_data->>'full_name',
            ''
        ),
        v_role
    ) on conflict (id) do nothing;
return new;
end;
$function$;