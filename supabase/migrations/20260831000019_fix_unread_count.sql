-- ============================================================
-- NITER Job Portal — Fix unread message count calculation
-- Handle NULL last_read_at and ensure accurate unread counts
-- ============================================================

-- Fix my_conversations() to handle NULL last_read_at correctly
-- When last_read_at is NULL, count all messages from other participants
-- (user has never marked the conversation as read)
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
            and (mine.last_read_at IS NULL OR me.created_at > mine.last_read_at)
         ) as unread_count
  from others o
  left join lastmsg lm on lm.conversation_id = o.conversation_id
  left join mine on mine.conversation_id = o.conversation_id
  order by lm.last_message_at desc nulls last;
$$;

grant execute on function public.my_conversations() to authenticated;

-- Ensure conversation_members.last_read_at defaults to conversation creation time
-- for any future direct inserts (belt-and-suspenders)
alter table public.conversation_members
  alter column last_read_at set default now();

-- Backfill NULL last_read_at for existing conversation members
-- (treat as if they read at conversation creation time)
update public.conversation_members cm
set last_read_at = c.created_at
from public.conversations c
where cm.conversation_id = c.id
  and cm.last_read_at IS NULL;