-- ============================================================
-- NITER Job Portal — Admin Messaging & Message Notifications
-- Allow admin to message any user; add notification trigger for new messages
-- ============================================================

-- ---------- 1. Notification trigger for new messages ----------
-- When a message is inserted, notify the other participant(s) in the conversation
create or replace function public.notify_new_message()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_recipient_user_id uuid;
  v_sender_name text;
  v_conversation_id bigint := NEW.conversation_id;
begin
  -- Get sender name
  select name into v_sender_name
  from public.users
  where id = NEW.sender_id;

  -- Notify all other participants in the conversation
  for v_recipient_user_id in
    select user_id
    from public.conversation_members
    where conversation_id = v_conversation_id
      and user_id <> NEW.sender_id
  loop
    perform public.notify_user(
      v_recipient_user_id,
      'New message from ' || v_sender_name,
      LEFT(NEW.body, 100) || case when length(NEW.body) > 100 then '...' else '' end,
      'message'
    );
  end loop;

  return NEW;
end;
$$;

grant execute on function public.notify_new_message() to authenticated;
grant execute on function public.notify_new_message() to service_role;

drop trigger if exists trg_new_message_notification on public.messages;
create trigger trg_new_message_notification
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- ---------- 2. Fix mark_conversation_read to return rows affected ----------
-- This allows the client to confirm the update succeeded (RLS can fail silently)
create or replace function public.mark_conversation_read(p_conversation_id bigint)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id
    and user_id = auth.uid();
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

grant execute on function public.mark_conversation_read(bigint) to authenticated;

-- ---------- 3. Admin-specific conversation start (optional, for clarity) ----------
-- The existing start_conversation already works for all authenticated users.
-- This is a convenience wrapper that makes admin intent explicit and could
-- be extended with admin-only logic in the future (e.g., audit logging).
create or replace function public.admin_start_conversation(p_other_user uuid)
returns bigint
language plpgsql security definer set search_path = public
as $$
begin
  -- Reuse the existing logic; admin can message anyone
  return public.start_conversation(p_other_user);
end;
$$;

grant execute on function public.admin_start_conversation(uuid) to authenticated;

-- Note: RLS already allows admin to read all conversations and messages.
-- The existing start_conversation function (SECURITY DEFINER) bypasses RLS
-- for inserting conversation_members, so admin can start conversations with anyone.
-- Recipients can reply because they are added as conversation members and
-- the messages insert policy allows participants to send.