-- ============================================================
-- NITER Job Portal — Messaging & Notifications support (Step 9)
-- Conversation RPCs, read-tracking, reminder helper.
-- ============================================================

-- ---------- user_id_or_null helper (avoids raising for anon) ----
create or replace function public.user_id_or_null()
returns uuid
language sql stable security definer set search_path = public
as $$
  select auth.uid();
$$;

grant execute on function public.user_id_or_null() to authenticated;

-- ---------- start (or fetch) a 1:1 conversation between the
-- current user and another user --------------------------------
create or replace function public.start_conversation(p_other_user uuid)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := public.user_id_or_null();
  v_conversation_id bigint;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if p_other_user is null or p_other_user = v_me then
    raise exception 'Invalid conversation participant';
  end if;

  -- Reuse an existing 1:1 conversation containing exactly these two users.
  select c.id into v_conversation_id
  from public.conversations c
  where (select count(*) from public.conversation_members m
         where m.conversation_id = c.id) = 2
    and exists (select 1 from public.conversation_members m
                where m.conversation_id = c.id and m.user_id = v_me)
    and exists (select 1 from public.conversation_members m
                where m.conversation_id = c.id and m.user_id = p_other_user)
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations (created_by)
    values (v_me)
    returning id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id, last_read_at)
    values (v_conversation_id, v_me, now());

    insert into public.conversation_members (conversation_id, user_id, last_read_at)
    values (v_conversation_id, p_other_user, now());
  end if;

  return v_conversation_id;
end;
$$;

grant execute on function public.start_conversation(uuid) to authenticated;

-- ---------- mark a conversation read by the current user --------
create or replace function public.mark_conversation_read(p_conversation_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id
    and user_id = auth.uid();
end;
$$;

grant execute on function public.mark_conversation_read(bigint) to authenticated;

-- ---------- notification insert helper (Step 5 alias, kept here
-- for a single reliable definition) ----------------------------
create or replace function public.notify_user(p_user_id uuid, p_title text, p_message text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, type)
  values (p_user_id, p_title, p_message, 'notification');
end;
$$;

grant execute on function public.notify_user(uuid, text, text) to authenticated;

-- ---------- conversation list + unread stats for current user ---
create or replace function public.my_conversations()
returns table (
  conversation_id bigint,
  other_user_id   uuid,
  other_name      text,
  other_role      public.user_role,
  last_message    text,
  last_message_at timestamptz,
  unread_count    bigint
)
language sql stable security definer set search_path = public
as $$
  with mine as (
    select cm.conversation_id, cm.last_read_at
    from public.conversation_members cm
    where cm.user_id = auth.uid()
  ),
  others as (
    select m.conversation_id,
           m.user_id as other_user_id,
           u.name as other_name,
           u.role as other_role
    from mine
    join public.conversation_members m
      on m.conversation_id = mine.conversation_id
     and m.user_id <> auth.uid()
    join public.users u on u.id = m.user_id
  ),
  lastmsg as (
    select distinct on (conversation_id)
           conversation_id,
           body as last_message,
           created_at as last_message_at
    from public.messages
    order by conversation_id, created_at desc
  )
  select o.conversation_id,
         o.other_user_id,
         o.other_name,
         o.other_role,
         lm.last_message,
         lm.last_message_at,
         (select count(*)::bigint
          from public.messages me
          where me.conversation_id = o.conversation_id
            and me.sender_id <> auth.uid()
            and me.created_at > mine.last_read_at) as unread_count
  from others o
  left join lastmsg lm on lm.conversation_id = o.conversation_id
  left join mine on mine.conversation_id = o.conversation_id
  order by lm.last_message_at desc nulls last;
$$;

grant execute on function public.my_conversations() to authenticated;

-- ---------- tighten conversation member join -------------------
-- Members are only added through start_conversation (SECURITY DEFINER,
-- bypasses RLS). Remove the permissive insert policy so an authenticated
-- user cannot arbitrarily join (or read into) any conversation.
drop policy if exists "members: join conversation"
  on public.conversation_members;

-- ---------- interview reminders (dedupe) -----------------------
create table if not exists public.interview_reminders (
  id             bigint generated always as identity primary key,
  interview_id   bigint not null unique references public.interviews (id) on delete cascade,
  reminded_at    timestamptz not null default now()
);

alter table public.interview_reminders enable row level security;
-- only handled by the reminder edge function (service role); no client policies.
